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
import { Generator, getCharRange, getNResults } from "./utils";

export const getPossibilities = (expr: string, limit = Infinity): string[] => {
  const ast = regex.parse(expr);

  return getMatchFromAst(limit)(ast);
};

const generators = {
  Char: (node: Char) => {
    return Generator.fromArray([node.value]);
  },
  Disjunction: (node: Disjunction): Generator<string> => {
    const left = getGeneratorFromNode(node.left);
    const right = getGeneratorFromNode(node.right);

    return Generator.concat(
      [left, right].filter(Boolean) as Generator<string>[]
    );
  },
  RegExp: (node: AstRegExp) => {
    return getGeneratorFromNode(node.body);
  },
  Alternative: (node: Alternative) => {
    return Generator.join(
      combineSources(node.expressions.map(getGeneratorFromNode))
    );
  },
  Assertion: (node: Assertion) => noopIter(node),
  CharacterClass: (node: CharacterClass) => {
    return Generator.concat(node.expressions.map(getGeneratorFromNode));
  },
  ClassRange: (node: ClassRange) => {
    return Generator.fromArray(getCharRange(node.from.codePoint, node.to.codePoint));
  },
  Backreference: (node: Backreference) => noopIter(node),
  Group: (node: Group) => {
    return getGeneratorFromNode(node.expression);
  },
  Repetition: (node: Repetition) => {
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

    return Generator.repeat(getGeneratorFromNode(node.expression), from, to);
  },
  Quantifier: (node: Quantifier) => noopIter(node),
} as const;

const noopIter = (node: AstNode) => {
  console.log(`No generator for ${node.type}`)
  return Generator.fromArray([]);
};

const getMatchFromAst = (limit: number) => (ast: AstRegExp) => {
  return getNResults(getGeneratorFromNode(ast), limit);
};

function getGeneratorFromNode<T extends AstNode>(
  node: T | null
): Generator<string> {
  if (!node) {
    return Generator.fromArray([]);
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

export function* combineSources<T>(
  sources: Generator<T | T[]>[]
): Generator<T[]> {
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


