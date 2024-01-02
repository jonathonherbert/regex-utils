import { parse } from "regexp-tree";
import type {
  AstRegExp,
  AstNode,
  Char,
  Disjunction,
  Alternative,
  Assertion,
  CharacterClass,
  ClassRange,
  Backreference,
  Group,
  Repetition,
  Quantifier,
} from "regexp-tree/ast";
import { Generator, getCharRange, getGroupId, getNResults } from "./utils";

export type MatchContext = {
  groups: Record<string, string>;
  backreferences: Record<string, string>;
};

/**
 * Return a generator that will yield all possible matches for the given regular
 * expressions.
 */
export const generateMatches = (expr: string): Generator<string> =>
  getGeneratorFromNode(parse(expr, { allowGroupNameDuplicates: false }));

/**
 * Enumerate all possible matches for the given regular expression.
 */
export const enumerateMatches = (expr: string, limit = Infinity): string[] =>
  getNResults(generateMatches(expr), limit);

const generators = {
  Char: (node: Char, context: MatchContext, negative = false) => {
    return Generator.fromArray(
      getCharRange(node.codePoint, node.codePoint, negative)
    );
  },
  Disjunction: (
    node: Disjunction,
    context: MatchContext
  ): Generator<string> => {
    const left = getGeneratorFromNode(node.left, context);
    const right = getGeneratorFromNode(node.right, context);

    return Generator.concat(
      [left, right].filter(Boolean) as Generator<string>[]
    );
  },
  RegExp: (node: AstRegExp, context: MatchContext) => {
    return Generator.pipe(
      [
        // We replace backreferences with values from their groups
        addBackreferencesFromGroups(context),
        // Any backreferences that don't have matching groups are stripped
        stripEmptyBackreferences(context),
      ],
      getGeneratorFromNode(node.body, context)
    );
  },
  Alternative: (node: Alternative, context: MatchContext) => {
    return Generator.join(
      combineOrderedSources(
        node.expressions.map((node) => getGeneratorFromNode(node, context))
      )
    );
  },
  Assertion: (node: Assertion, context: MatchContext) => noopIter(node),
  CharacterClass: (node: CharacterClass, context: MatchContext) => {
    return Generator.concat(
      node.expressions.map((expr) =>
        getGeneratorFromNode(expr, context, node.negative)
      )
    );
  },
  ClassRange: (node: ClassRange, context: MatchContext, negative = false) => {
    return Generator.fromArray(
      getCharRange(node.from.codePoint, node.to.codePoint, negative)
    );
  },
  Backreference: (node: Backreference, context: MatchContext) => {
    return Generator.forEach((result) => {
      // Only apply a backreference if a matching group already exists - see
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Backreference#description
      if (context.groups[node.number.toString()]) {
        context.backreferences[node.number.toString()] = result;
      }
    }, Generator.fromArray([getGroupId(node.number.toString())]));
  },
  Group: (node: Group, context: MatchContext) => {
    const generator = getGeneratorFromNode(node.expression, context);

    if (!node.capturing) {
      return generator;
    }

    return Generator.forEach((result) => {
      context.groups[node.number.toString()] = result;
    }, generator);
  },
  Repetition: (node: Repetition, context: MatchContext) => {
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
      from,
      to
    );
  },
  Quantifier: (node: Quantifier) => noopIter(node),
} as const;

const noopIter = (node: AstNode) => {
  console.log(`No generator for ${node.type}`);
  return Generator.fromArray([]);
};

function getGeneratorFromNode<T extends AstNode>(
  node: T | null,
  context: MatchContext = { groups: {}, backreferences: {} },
  negative = false
): Generator<string> {
  if (!node) {
    return Generator.fromArray([]);
  }

  switch (node.type) {
    case "RegExp":
      return generators.RegExp(node, context);
    case "Disjunction":
      return generators.Disjunction(node, context);
    case "Alternative":
      return generators.Alternative(node, context);
    case "Assertion":
      return generators.Assertion(node, context);
    case "Char":
      return generators.Char(node, context, negative);
    case "CharacterClass":
      return generators.CharacterClass(node, context);
    case "ClassRange":
      return generators.ClassRange(node, context, negative);
    case "Backreference":
      return generators.Backreference(node, context);
    case "Group":
      return generators.Group(node, context);
    case "Repetition":
      return generators.Repetition(node, context);
    case "Quantifier":
      return generators.Quantifier(node);
  }
}

/**
 * Yield all possible combinations of an ordered array of sources.
 *
 * For example, for two generators that will return (1, 2) and (3, 4), yields
 * [1, 3], [1, 4], [2, 3], [2, 4].
 */
export function* combineOrderedSources<T>(
  sources: Generator<T | T[]>[]
): Generator<T[]> {
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

export const addBackreferencesFromGroups = (context: MatchContext) => (result: string) =>
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
