import { expect, test, describe } from "bun:test";
import {
  Generator,
  getCharRange,
  getGeneratorOutputFromLeafNode,
  getNResults,
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

      expect(getAllValues(source)).toEqual([
        "a",
        "aa",
        "aaa",
        "aaaa",
        "aaaaa",
      ]);
    });
  });
});
