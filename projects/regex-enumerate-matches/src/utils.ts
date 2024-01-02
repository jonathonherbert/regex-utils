export const getNResults = <T>(gen: Generator<T>, n = Infinity) => {
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

  repeat: function* (gen: Generator<string>, from: number, to = Infinity) {
    if (from === 0) {
      yield "";
    }

    const results = [];
    for (const x of gen) {
      yield x;
      results.push(x);
    }

    let i = 2;
    while (i <= to) {
      for (const x of results) {
        yield x.repeat(i);
      }
      i++;
    }
  },
};

export const getGroupId = (groupNumber: string) => `$__GROUP${groupNumber}__$`;
