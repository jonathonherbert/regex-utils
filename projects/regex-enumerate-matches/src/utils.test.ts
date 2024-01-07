import { expect, test, describe } from "bun:test";
import {
  Generator,
  getCharRange,
  getGeneratorOutputFromLeafNode,
  getNResults,
  getCombinations,
  getRange,
} from "./utils";
import { GeneratorOutput } from "./enumerateMatches";

describe("ranges", () => {
  test("char range", () => {
    expect(getCharRange(33, 33, false)).toEqual(["!"]);
  });
  test("negative char range", () => {
    expect(getCharRange(34, 126, true)).toEqual([" ", "!"]);
  });
});

describe("Generator", () => {
  describe("repeat", () => {
    const noopNode = {} as any;
    const generatesAs = () =>
      getGeneratorOutputFromLeafNode(noopNode, Generator.fromArray(["a"]));
    const getAllValues = (source: Generator<GeneratorOutput>) =>
      getNResults(source).map((r) => r.value);

    test("0-1", () => {
      const source = Generator.repeat(generatesAs(), noopNode, 0, 1);

      expect(getAllValues(source)).toEqual(["", "a"]);
    });

    test("1-2", () => {
      const source = Generator.repeat(generatesAs(), noopNode, 1, 2);

      expect(getAllValues(source)).toEqual(["a", "aa"]);
    });

    test("0-many", () => {
      const source = Generator.repeat(generatesAs(), noopNode, 0, 5);

      expect(getAllValues(source)).toEqual([
        "",
        "a",
        "aa",
        "aaa",
        "aaaa",
        "aaaaa",
      ]);
    });

    test("1-many", () => {
      const source = Generator.repeat(generatesAs(), noopNode, 1, 5);

      expect(getAllValues(source)).toEqual(["a", "aa", "aaa", "aaaa", "aaaaa"]);
    });

    test("combinatorials", () => {
      const generatesABC = getGeneratorOutputFromLeafNode(noopNode, Generator.fromArray(["a", "b", "c"]));
      const source = Generator.repeat(generatesABC, noopNode, 1, 2);
      expect(getAllValues(source)).toEqual(["a", "aa", "aaa", "aaaa", "aaaaa"]);
    })
  });
});

describe("getPermutations", () => {
  const assertCombinations = <T>(
    length: number,
    elements: T[],
    expected: T[][]
  ) => {
    const results = getNResults(getCombinations(length, Generator.fromArray(elements)));
    expect(results).toEqual(expected);
  };
  test("generate permutations 1", () => {
    assertCombinations(1, ["a"], [["a"]]);
  });
  test("generate permutations 2", () => {
    assertCombinations(
      2,
      ["a", "b"],
      [
        ["a", "a"],
        ["a", "b"],
        ["b", "a"],
        ["b", "b"],
      ]
    );
  });

  test("generate permutations 3", () => {
    assertCombinations(
      2,
      ["a", "b", "c"],
      [
        ["a", "a"],
        ["a", "b"],
        ["a", "c"],
        ["b", "a"],
        ["b", "b"],
        ["b", "c"],
        ["c", "a"],
        ["c", "b"],
        ["c", "c"],
      ]
    );
  });

  test("large arrays still yield single values at 0(n)", () => {
    const range = getRange(1, 100);
    const generator = getCombinations(100, Generator.fromArray(range));
    expect(generator.next().value).toEqual(Array(100).fill(1));
  });
});
