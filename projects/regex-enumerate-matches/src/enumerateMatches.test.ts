import { expect, test, describe } from "bun:test";
import { combineOrderedSources, enumerateMatches, generateMatchesViz } from "./enumerateMatches.ts";
import { Generator, getNResults } from "./utils.ts";
import { parse } from "regexp-tree";

const assertRegexPossibilities = (
  regex: string,
  expected: string[],
  limit = Infinity
) => expect(enumerateMatches(regex, limit)).toEqual(expected);

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

  test("backreferences - single backreference", () => {
    assertRegexPossibilities("/(b)\\1/", ["bb"]);
  });

  test("backreferences - correctly adjust values on each iteration", () => {
    assertRegexPossibilities("/(a|b|c)\\1/", ["aa", "bb", "cc"]);
  });

  test("backreferences - single backreference without capturing group", () => {
    assertRegexPossibilities("/(\\1a(a))/", ["aa"]);
  });

  test("backreferences -  ", () => {
    assertRegexPossibilities("/((a|b)(c|d))\\1\\2\\3/", [
      "acacac",
      "bcbcbc",
      "adadbd",
      "bdbdbd",
    ]);
  });

  test("example 1", () => {
    assertRegexPossibilities("/Camilla Parker ?-?Bowles/", [
      "Camilla ParkerBowles",
      "Camilla Parker Bowles",
      "Camilla Parker-Bowles",
      "Camilla Parker -Bowles",
    ]);
  });
  test("example 2", () => {
    assertRegexPossibilities(
      "/Camilla,? (Parker ?-?Bowles|(the)? Queen Consort)/",
      [
        "Camilla ParkerBowles",
        "Camilla, ParkerBowles",
        "Camilla Parker Bowles",
        "Camilla, Parker Bowles",
        "Camilla Parker-Bowles",
        "Camilla, Parker-Bowles",
        "Camilla Parker -Bowles",
        "Camilla, Parker -Bowles",
        "Camilla  Queen Consort",
        "Camilla,  Queen Consort",
        "Camilla the Queen Consort",
        "Camilla, the Queen Consort",
      ]
    );
  });

  // test('example 3', () => {
  //   assertRegexPossibilities(
  //     "/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/",
  //     [

  //     ]
  //   );
  // })
});

describe("combineOrderedSources", () => {
  test("one list", () => {
    const source = combineOrderedSources([Generator.fromArray([1, 2, 3])]);
    const result = getNResults(source);
    expect(result).toEqual([[1], [2], [3]]);
  });

  test("two lists", () => {
    const source = combineOrderedSources([
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
    const source = combineOrderedSources([
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
    const source = combineOrderedSources([
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
    const source = combineOrderedSources([
      Generator.fromArray([1, 2]),
      combineOrderedSources([
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
    const source = combineOrderedSources([
      Generator.fromArray(["a"]),
      Generator.fromArray(["b"]),
    ]);
    const result = getNResults(source);
    expect(result).toEqual([["a", "b"]]);
  });
});

describe("generateMatchesViz", () => {
  test("disjunct groups containing disjunct", () => {
    const generator = generateMatchesViz(parse("/(a|b)|(c|d)/", { allowGroupNameDuplicates: false }));
    const { value: value1 } = generator.next();
    expect(value1).toMatchObject({
      value: "a",
      index: 0,
      children: [
        {
          value: "a",
          index: 0,
          children: [
            {
              value: "a",
              index: 0,
              children: [],
            },
          ],
        },
      ],
    });

    const { value: value2 } = generator.next();
    expect(value2).toMatchObject({
      value: "b",
      index: 1,
      children: [
        {
          value: "b",
          index: 1,
          children: [
            {
              value: "b",
              index: 0,
              children: [],
            },
          ],
        },
      ],
    });

    const { value: value3 } = generator.next();
    expect(value3).toMatchObject({
      value: "c",
      index: 2,
      children: [
        {
          value: "c",
          index: 0,
          children: [
            {
              value: "c",
              index: 0,
              children: [],
            },
          ],
        },
      ],
    });

    const { value: value4 } = generator.next();
    expect(value4).toMatchObject({
      value: "d",
      index: 3,
      children: [
        {
          value: "d",
          index: 1,
          children: [
            {
              value: "d",
              index: 0,
              children: [],
            },
          ],
        },
      ],
    });
  });
})
