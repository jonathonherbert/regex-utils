import { expect, test, describe } from "bun:test";
import { Generator, getNResults } from "./utils";

describe("Generator", () => {
  describe("repeat", () => {
    test("0-1", () => {
      const source = Generator.repeat(Generator.fromArray(["a"]), 0, 1);

      expect(getNResults(source)).toEqual(["", "a"]);
    });

    test("1-2", () => {
      const source = Generator.repeat(Generator.fromArray(["a"]), 1, 2);

      expect(getNResults(source)).toEqual(["a", "aa"]);
    });

    test("0-many", () => {
      const source = Generator.repeat(Generator.fromArray(["a"]), 0, 5);

      expect(getNResults(source)).toEqual([
        "",
        "a",
        "aa",
        "aaa",
        "aaaa",
        "aaaaa",
      ]);
    });

    test("1-many", () => {
      const source = Generator.repeat(Generator.fromArray(["a"]), 1, 5);

      expect(getNResults(source)).toEqual(["a", "aa", "aaa", "aaaa", "aaaaa"]);
    });
  });
});
