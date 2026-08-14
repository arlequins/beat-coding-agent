import { describe, expect, it } from "vitest";
import { parseRepositoryName } from "./github";

describe("GitHub read-only boundary", () => {
  it("parses a repository reference", () => {
    expect(parseRepositoryName("arlequins/beat")).toEqual({
      owner: "arlequins",
      repo: "beat",
    });
  });

  it("rejects ambiguous repository paths", () => {
    expect(() => parseRepositoryName("arlequins/beat/extra")).toThrow();
  });
});
