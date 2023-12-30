import { either as E } from "fp-ts";
import { expect, test, describe } from "bun:test";
import { createSource, combineSources, getNResults } from "./";
import { getPossibilities } from "./index.ts";

const get = (E)

describe("possibilities", () => {

  test.only("disjunct", () => {
    const source = getPossibilities("/a|b|c/");
    expect(E.getOrElse(() => "")(source)).toEqual(["a", "b", "c"]);
  });

  test.only("disjunct w/ limit", () => {
    const source = getPossibilities("/a|b|c/", 2);
    expect(E.getOrElse(() => "")(source)).toEqual(["a", "b"]);
  });

  test("group", () => {
    const source = getPossibilities("/(ab)(cd)/");
    expect(E.getOrElse(() => "")(source)).toEqual(["abcd"]);
  });
  test("two groups with disjunct", () => {
    const source = getPossibilities("/(ab)|(cd)/");
    expect(E.getOrElse(() => "")(source)).toEqual([["ab", "cd"]]);
  });

  test("group containing disjunct", () => {
    const source = getPossibilities("/(a|b|c)/");
    expect(E.getOrElse(() => "")(source)).toEqual([["a", "b", "c"]]);
  });

  test.only("groups containing disjunct", () => {
    const source = getPossibilities("/(a|b)(c|d)/");
    expect(E.getOrElse(() => "")(source)).toEqual([["ac", "ad", "bc", "bd"]]);
  });
});

test("one list", () => {
  const source = combineSources([createSource([1, 2, 3])]);
  const result = getNResults(source);
  expect(result).toEqual([[1], [2], [3]]);
});

test("two lists", () => {
  const source = combineSources([
    createSource([1, 2, 3]),
    createSource([4, 5, 6]),
  ]);
  const result = getNResults(source);
  expect(result).toEqual([
    [1, 4],
    [2, 4],
    [3, 4],
    [1, 5],
    [2, 5],
    [3, 5],
    [1, 6],
    [2, 6],
    [3, 6],
  ]);
});

test("generator", () => {
  const source = combineSources([
    createSource([1, 2, 3]),
    createSource([4, 5, 6]),
  ]);
  const { value: value1 } = source.next();

  expect(value1).toEqual([1, 4]);
  const { value: value2 } = source.next();
  expect(value2).toEqual([2, 4]);
  const { value: value3 } = source.next();
  expect(value3).toEqual([3, 4]);
  const { value: value4 } = source.next();
  expect(value4).toEqual([1, 5]);
  const { value: value5 } = source.next();
  expect(value5).toEqual([2, 5]);
  const { value: value6 } = source.next();
  expect(value6).toEqual([3, 5]);
  const { value: value7 } = source.next();
  expect(value7).toEqual([1, 6]);
  const { value: value8 } = source.next();
  expect(value8).toEqual([2, 6]);
  const { value: value9 } = source.next();
  expect(value9).toEqual([3, 6]);
  const { done } = source.next();
  expect(done).toBe(true);
});

test("four lists", () => {
  const source = combineSources([
    createSource([1, 2]),
    createSource([3, 4]),
    createSource([5, 6]),
    createSource([7, 8]),
  ]);
  const result = getNResults(source);
  expect(result).toEqual([
    [1, 3, 5, 7],
    [2, 3, 5, 7],
    [1, 4, 5, 7],
    [2, 4, 5, 7],
    [1, 3, 6, 7],
    [2, 3, 6, 7],
    [1, 4, 6, 7],
    [2, 4, 6, 7],
    [1, 3, 5, 8],
    [2, 3, 5, 8],
    [1, 4, 5, 8],
    [2, 4, 5, 8],
    [1, 3, 6, 8],
    [2, 3, 6, 8],
    [1, 4, 6, 8],
    [2, 4, 6, 8],
  ]);
});

test("nested lists", () => {
  const source = combineSources([
    createSource([1, 2]),
    combineSources([createSource([3, 4]), createSource([5, 6])]),
  ]);
  const result = getNResults(source);
  expect(result).toEqual([
    [1, 3, 5],
    [2, 3, 5],
    [1, 4, 5],
    [2, 4, 5],
    [1, 3, 6],
    [2, 3, 6],
    [1, 4, 6],
    [2, 4, 6],
  ]);
});

test("single entities", () => {
  const source =
    combineSources([
      createSource(["a"]),
      createSource(["b"]),
    ])
  const result = getNResults(source);
  expect(result).toEqual([["a", "b"]]);
});