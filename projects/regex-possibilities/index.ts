import regex from "regexp-tree";
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
import { either as E } from "fp-ts";

export const getPossibilities = (expr: string, limit = Infinity) => {
  const exprAst = E.tryCatch(
    () => regex.parse(expr as string),
    (err: unknown) =>
      err instanceof Error ? err : Error("unexpected error when parsing json")
  );

  return E.map(getMatchFromAst(limit))(exprAst);
};

const Generator = {
  map: <T, U>(f: (t: T) => U, g: Generator<T>) => function*() {
    for (const x of g) {
      yield f(x);
    }
  }
}

/**
 * Flatten the result of each generation
 */
const flattenGen = <T extends Array<any>>(gen: Generator<T>) => Generator.map(arr => console.log(arr) || arr.flat(), gen);

const concatGen = <T extends Array<any>>(gen: Generator<T>) => Generator.map(arr => arr.join(""), gen)();

const generators: Record<string, (n: AstNode) => Generator<string, void, unknown>> = {
  Char:
    (node: Char) => {
      return createSource([node.value]);
    },
  Disjunction: (node: Disjunction) => {
    const left = getGeneratorFromNode(node.left);
    const right = getGeneratorFromNode(node.right);

    return combineSources([left, right].filter(Boolean) as Generator<string>[]);
  },
  RegExp: (node: AstRegExp) => {
    return getGeneratorFromNode(node.body);
  },
  Alternative: (node: Alternative) => {
    return concatGen(combineSources(node.expressions.map(getGeneratorFromNode)));
  },
  Assertion: (node: Assertion) => noopIter(),
  CharacterClass: (node: CharacterClass) =>
    noopIter(),
  ClassRange: (node: ClassRange) => noopIter(),
  Backreference: (node: Backreference) =>
    noopIter(),
  Group: (node: Group) => {
    return getGeneratorFromNode(node.expression);
  },
  Repetition: (node: Repetition) => noopIter(),
  Quantifier: (node: Quantifier) => noopIter(),
} as const;

const noopIter = () => {
  console.log('noop')
};

const getMatchFromAst = (limit: number) => (ast: AstRegExp) => {
  console.log(ast);
  return getNResults(getGeneratorFromNode(ast), limit)
};

function getGeneratorFromNode<T extends AstNode>(
  node: T | null,
) {
  if (!node) {
    return createSource([]);
  }

  switch (node.type) {
    case "RegExp":
      return generators.RegExp(node);
    case "Disjunction":
      return generators.Disjunction(node);
    case "Alternative":
      return generators.Alternative(node);
    case "Assertion":
      return generators.Assertion(node);
    case "Char":
      return generators.Char(node);
    case "CharacterClass":
      return generators.CharacterClass(node);
    case "ClassRange":
      return generators.ClassRange(node);
    case "Backreference":
      return generators.Backreference(node);
    case "Group":
      return generators.Group(node);
    case "Repetition":
      return generators.Repetition(node);
    case "Quantifier":
      return generators.Quantifier(node);
  }
}


/**
 * @param {Array<string>} output
 */
export const createSource = (output: string[]) => {
  return (function* () {
    for (const element of output) {
      yield element;
    }
  })();
};

export function* combineSources(sources: Generator<string | string[]>[]): Generator<string[]> {
  let sourceIndex = 0;

  // Seed each source with at least one
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
      // Reset the current source, and move to the next source with an available element
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

export const getNResults = (gen: Generator<string[]>, n = Infinity) => {
  let i = 0;
  let hasWork = true;
  const results = [];
  while (i < n && hasWork) {
    const { value, done } = gen.next();
    if (!done) results.push(value);
    hasWork = !done;
    i++;
  }
  return results;
};
