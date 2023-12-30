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

export const Generator = {
  map: <T, U>(f: (t: T) => U, g: Generator<T>) =>
    function* () {
      for (const x of g) {
        yield f(x);
      }
    },

  flatten: <T extends Array<any>>(gen: Generator<T>) => {
    return Generator.map((arr) => arr.flat(), gen)();
  },

  join: <T extends Array<any>>(gen: Generator<T>, separator = "") =>
    Generator.map((arr) => arr.join(separator), gen)(),

  log: <T extends Array<any>>(gen: Generator<T>) =>
    Generator.map((arr) => {
      console.log("log", arr);
      return arr;
    }, gen)(),

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
