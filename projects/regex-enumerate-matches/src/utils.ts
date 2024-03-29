import type { AstNode } from "regexp-tree/ast";
import type { NodeOutput } from "./enumerateMatches";

export const getNResults = <T>(gen: Generator<T>, n = Infinity): T[] => {
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

export const getRange = (min: number, max: number): number[] =>
  Array(max - min + 1)
    .fill(0)
    .map((_, i) => min + i);

export const getCharRange = (
  from: number,
  to: number,
  negative = false
): string[] => {
  if (negative) {
    return asciiRange
      .filter((codePoint) => codePoint < from || codePoint > to)
      .map((codePoint) => String.fromCodePoint(codePoint));
  }

  return getRange(from, to).map((codePoint) => String.fromCodePoint(codePoint));
};

const asciiRange = getRange(32, 126);

export const Generator = {
  map: <T, U>(f: (t: T) => U, g: Generator<T>) =>
    (function* () {
      for (const x of g) {
        yield f(x);
      }
    })(),

  forEach: <T>(f: (t: T) => void, g: Generator<T>) =>
    (function* () {
      for (const x of g) {
        f(x);
        yield x;
      }
    })(),

  pipe: <T>(fs: ((t: T) => T)[], g: Generator<T>) =>
    (function* () {
      const [f, ...rest] = fs;
      for (const x of g) {
        const seed = f(x);
        yield rest.reduce((acc, f) => f(acc), seed);
      }
    })(),

  flatten: <T extends Array<any>>(gen: Generator<T>) => {
    return Generator.map((arr) => arr.flat(), gen);
  },

  join: <T extends Array<any>>(gen: Generator<T>, separator = "") =>
    Generator.map((arr) => arr.join(separator), gen),

  log: <T extends Array<any>>(gen: Generator<T>) =>
    Generator.map((arr) => {
      console.log("log", arr);
      return arr;
    }, gen),

  concat: function* <T>(gens: Generator<T>[]) {
    for (const gen of gens) {
      for (const x of gen) {
        yield x;
      }
    }
  },

  fromArray: <T>(output: T[]): Generator<T> => {
    return (function* () {
      for (const element of output) {
        yield element;
      }
    })();
  },

  repeat: function* (
    gen: Generator<NodeOutput>,
    node: AstNode,
    from: number,
    to = Infinity
  ): Generator<NodeOutput> {
    if (from === 0) {
      yield { value: "", node, children: [] };
      from++;
    }

    let elements: NodeOutput[] | undefined = undefined;
    for (let curFrom = from; curFrom <= to; curFrom++) {
      const source: Generator<NodeOutput> = elements ? Generator.fromArray(elements) : gen;
      const combinationsGen = getCombinations(curFrom, source);

      while (true) {
        const { value, done } = combinationsGen.next();
        if (done) {
          elements = value;
          break;
        }
        yield {
          value: value.map((output) => output.value).join(""),
          node,
          // Children must be unique
          children: Array.from(new Set(value.flatMap((output) => output.children))),
        };
      }
    }
  },
};

/**
 * Find all combinations of a given length with elements from the given
 * generator.
 *
 * The final return gives the completed list of elements.
 */
export function* getCombinations<T>(
  length: number,
  elementsGen: Generator<T>
): Generator<T[], T[]> {
  const { value, done } = elementsGen.next();
  if (done) {
    return [];
  }
  const indexes = Array(length).fill(0);
  const elements: T[] = [value];

  while (true) {
    yield indexes.map((i) => elements[i]);

    const { value, done } = elementsGen.next();
    if (!done) {
      elements.push(value);
    }

    for (let i = length - 1; ; i--) {
      if (i < 0) {
        return elements;
      }
      indexes[i]++;
      if (indexes[i] === elements.length) {
        indexes[i] = 0;
      } else {
        break;
      }
    }
  }
}

export const getGroupId = (groupNumber: string) => `$__GROUP${groupNumber}__$`;

export const getGeneratorOutputFromBranchNode = (
  node: AstNode,
  source: Generator<NodeOutput>
): Generator<NodeOutput> =>
  Generator.map(
    (result) => ({
      value: result.value,
      node,
      children: [result],
    }),
    source
  );

export const getGeneratorOutputFromLeafNode = (
  node: AstNode,
  source: Generator<string>
): Generator<NodeOutput> =>
  Generator.map(
    (result) => ({
      value: result,
      node,
      children: [],
    }),
    source
  );
