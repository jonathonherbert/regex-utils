import { either as E } from "fp-ts";
import { expect, test, describe } from "bun:test";
import { combineSources } from "./index.ts";
import { getPossibilities } from "./index.ts";
import { Generator, getNResults } from "./utils.ts";

const assertRegexPossibilities = (
  regex: string,
  expected: string[],
  limit = Infinity
) => expect(getPossibilities(regex, limit)).toEqual(expected);

describe("possibilities", () => {
  test("disjunct", () => {
    assertRegexPossibilities("/a|b|c/", ["a", "b", "c"]);
  });

  test("disjunct w/ limit", () => {
    assertRegexPossibilities("/a|b|c/", ["a", "b"], 2);
  });

  test("group", () => {
    assertRegexPossibilities("/(ab)(cd)/", ["abcd"]);
  });
  test("two groups with disjunct", () => {
    assertRegexPossibilities("/(ab)|(cd)/", ["ab", "cd"]);
  });

  test("group containing disjunct", () => {
    assertRegexPossibilities("/(a|b|c)/", ["a", "b", "c"]);
  });

  test("groups containing disjunct", () => {
    assertRegexPossibilities("/(a|b)(c|d)/", ["ac", "bc", "ad", "bd"]);
  });

  test("disjunct groups containing disjunct", () => {
    assertRegexPossibilities("/(a|b)|(c|d)/", ["a", "b", "c", "d"]);
  });

  test("quantifiers", () => {
    assertRegexPossibilities("/ab?c/", ["ac", "abc"]);
  });

  test("character class - single char", () => {
    assertRegexPossibilities("/[a]/", ["a"]);
  });

  test("character class - multiple chars", () => {
    assertRegexPossibilities("/[a-bA-B]/", ["a", "b", "A", "B"]);
  });

  test("character class - negatives", () => {
    assertRegexPossibilities("/[^!-z]/", [" ", "{", "|", "}", "~"]);
  });

  test("example 1", () => {
    assertRegexPossibilities("/Camilla Parker ?-?Bowles/", [
      "Camilla ParkerBowles",
      "Camilla Parker Bowles",
      "Camilla Parker-Bowles",
      "Camilla Parker -Bowles",
    ]);
  });
});

describe("combineSources", () => {
  test("one list", () => {
    const source = combineSources([Generator.fromArray([1, 2, 3])]);
    const result = getNResults(source);
    expect(result).toEqual([[1], [2], [3]]);
  });

  test("two lists", () => {
    const source = combineSources([
      Generator.fromArray([1, 2, 3]),
      Generator.fromArray([4, 5, 6]),
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

  test("generator behaviour", () => {
    const source = combineSources([
      Generator.fromArray([1, 2, 3]),
      Generator.fromArray([4, 5, 6]),
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
      Generator.fromArray([1, 2]),
      Generator.fromArray([3, 4]),
      Generator.fromArray([5, 6]),
      Generator.fromArray([7, 8]),
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
      Generator.fromArray([1, 2]),
      combineSources([
        Generator.fromArray([3, 4]),
        Generator.fromArray([5, 6]),
      ]),
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
    const source = combineSources([
      Generator.fromArray(["a"]),
      Generator.fromArray(["b"]),
    ]);
    const result = getNResults(source);
    expect(result).toEqual([["a", "b"]]);
  });
});
