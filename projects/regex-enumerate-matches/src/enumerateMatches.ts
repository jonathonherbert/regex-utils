import { parse } from "regexp-tree";
import type { AstNode, AstClass, AstClassMap, AstRegExp } from "regexp-tree/ast";
import { Generator, getCharRange, getGroupId, getNResults } from "./utils";

export type MatchContext = {
  groups: Record<string, string>;
  backreferences: Record<string, string>;
};

export type GeneratorOutput = {
  node: AstNode;
  value: string;
  index: number;
  children: GeneratorOutput[];
};

/**
 * Return a generator that will yield all possible matches for the given regular
 * expressions.
 */
export const generateMatches = (expr: string): Generator<string> =>
  Generator.map(
    (result) => result.value,
    getGeneratorFromNode(parse(expr, { allowGroupNameDuplicates: false }))
  );

/**
 * Return a generator that will yield all possible matches for the given regular
 * expressions. The output contains information about the nodes that yielded the
 * result.
 */
export const generateMatchesViz = (node: AstRegExp): Generator<GeneratorOutput> =>
  getGeneratorFromNode(node);

/**
 * Enumerate all possible matches for the given regular expression.
 */
export const enumerateMatches = (expr: string, limit = Infinity): string[] =>
  getNResults(generateMatches(expr), limit);

type Generators = {
  [C in AstClass]: (
    node: AstClassMap[C],
    m: MatchContext,
    negative?: boolean
  ) => Generator<GeneratorOutput>;
};

const generators: Generators = {
  Char: (node, _, negative = false): Generator<GeneratorOutput> => {
    return Generator.map(
      (value) => ({ value, index: 0, node, children: [] }),
      Generator.fromArray(
        getCharRange(node.codePoint, node.codePoint, negative)
      )
    );
  },
  Disjunction: (node, context): Generator<GeneratorOutput> => {
    const left = getGeneratorFromNode(node.left, context);
    const right = getGeneratorFromNode(node.right, context);
    let index = 0;

    return Generator.map((childResult) => {
      const result = {
        value: childResult.value,
        index,
        node,
        children: [childResult],
      };
      index++;
      return result;
    }, Generator.concat([left, right].filter(Boolean)));
  },
  RegExp: (node, context) => {
    return Generator.map(
      (r) => ({
        value: stripEmptyBackreferences(context)(
          addBackreferencesFromGroups(context)(r.value)
        ),
        index: 0,
        children: [r],
        node
      }),
      getGeneratorFromNode(node.body, context)
    );
  },
  Alternative: (node, context): Generator<GeneratorOutput> => {
    return Generator.map(
      (results) => ({
        value: results.map((_) => _.value).join(""),
        index: 0,
        children: results,
        node,
      }),
      combineOrderedSources(
        node.expressions.map((node) => getGeneratorFromNode(node, context))
      )
    );
  },
  Assertion: (node) => noopIter(node),
  CharacterClass: (node, context): Generator<GeneratorOutput> => {
    return Generator.concat(
      node.expressions.map((expr) =>
        getGeneratorFromNode(expr, context, node.negative)
      )
    );
  },
  ClassRange: (node, _, negative = false): Generator<GeneratorOutput> => {
    return Generator.map(
      (value) => ({ value, index: 0, node, children: [] }),
      Generator.fromArray(
        getCharRange(node.from.codePoint, node.to.codePoint, negative)
      )
    );
  },
  Backreference: (node, context): Generator<GeneratorOutput> => {
    return Generator.map(
      (value) => ({ value, index: 0, node, children: [] }),
      Generator.forEach((result) => {
        // Only apply a backreference if a matching group already exists - see
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Backreference#description
        if (context.groups[node.number.toString()]) {
          context.backreferences[node.number.toString()] = result;
        }
      }, Generator.fromArray([getGroupId(node.number.toString())]))
    );
  },
  Group: (node, context): Generator<GeneratorOutput> => {
    const generator = getGeneratorFromNode(node.expression, context);

    if (!node.capturing) {
      return generator;
    }

    return Generator.map(
      (output) => ({ value: output.value, index: 0, node, children: [output] }),
      Generator.forEach((result) => {
        context.groups[node.number.toString()] = result.value;
      }, generator)
    );
  },
  Repetition: (node, context): Generator<GeneratorOutput> => {
    const { from, to } = (() => {
      switch (node.quantifier.kind) {
        case "Range":
          return { from: node.quantifier.from, to: node.quantifier.to };
        case "+":
          return { from: 1, to: Infinity };
        case "*":
          return { from: 0, to: Infinity };
        case "?":
          return { from: 0, to: 1 };
      }
    })();

    return Generator.repeat(
      getGeneratorFromNode(node.expression, context),
      node,
      from,
      to
    );
  },
  Quantifier: (node, _) => noopIter(node),
} as const;

const noopIter = (node: AstNode) => {
  console.log(`No generator for ${node.type}`);
  return Generator.fromArray([]);
};

function getGeneratorFromNode<T extends AstNode>(
  node: T | null,
  // A new context is generated once per iteration, accruing group and
  // backreference data
  context: MatchContext = { groups: {}, backreferences: {} },
  negative = false
): Generator<GeneratorOutput> {
  if (!node) {
    return Generator.fromArray([]);
  }

  return generators[node.type](node as any, context, negative);
}

/**
 * Yield all possible combinations of an ordered array of sources.
 *
 * For example, for two generators that will return (1, 2) and (3, 4), yields
 * [1, 3], [1, 4], [2, 3], [2, 4].
 */
export function* combineOrderedSources<T>(
  sources: Generator<GeneratorOutput>[]
): Generator<GeneratorOutput[]> {
  let sourceIndex = 0;

  // Seed each source with at least one output
  const sourcesAndOutput = sources.map((source) => {
    const { value } = source.next();
    return { source, output: [value], index: 0 };
  });

  while (true) {
    const outputs = sourcesAndOutput.map((s) => s.output[s.index]);
    yield outputs.flat();

    let current = sourcesAndOutput[sourceIndex];

    const askForAnotherPermutation = sourcesAndOutput.every(
      (s) => s.index === s.output.length - 1
    );
    current.index++;

    // If we're at the leading edge, get a new permutation
    if (askForAnotherPermutation) {
      let { value, done } = current.source.next();

      if (done) {
        // Move to the next source, if possible
        while (true) {
          sourceIndex++;
          current = sourcesAndOutput[sourceIndex];
          if (!current) {
            // We've run out of sources – we're done.
            return;
          }
          const { value: nextValue, done: nextDone } = current.source.next();
          if (!nextDone) {
            value = nextValue;
            break;
          }
        }
      }

      // Set our source to point to this latest value
      current.output.push(value);
      current.index = current.output.length - 1;

      if (sourceIndex > 0) {
        // Reset sources left of current, and start again
        sourcesAndOutput.slice(0, sourceIndex).forEach((s) => (s.index = 0));
        sourceIndex = 0;
      }
    }

    const isBeyondLastIndex = current.index > current.output.length - 1;

    if (isBeyondLastIndex) {
      // Reset the current source, and move to the next source with an available
      // element
      current.index = 0;
      let nextIndex = sourceIndex + 1;
      while (true) {
        const maybeNextSource = sourcesAndOutput[nextIndex];
        if (maybeNextSource.index < maybeNextSource.output.length - 1) {
          maybeNextSource.index++;
          break;
        }
        maybeNextSource.index = 0;
        nextIndex++;
      }
    }
  }
}

export const addBackreferencesFromGroups =
  (context: MatchContext) => (result: string) =>
    Object.entries(context.groups).reduce(
      (acc, [groupNumber, groupValue]) =>
        context.backreferences[groupNumber]
          ? acc.replaceAll(getGroupId(groupNumber), groupValue)
          : acc,
      result
    );

export const stripEmptyBackreferences =
  (context: MatchContext) => (result: string) =>
    Object.entries(context.groups).reduce(
      (acc, [groupNumber]) => acc.replaceAll(getGroupId(groupNumber), ""),
      result
    );
