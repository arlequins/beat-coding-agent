import { describe, expect, it } from "vitest";
import { makeDatasetVersion, shouldPromoteModel } from "./fine-tuning";

describe("fine-tuning promotion policy", () => {
  it("requires a meaningful improvement", () => {
    expect(shouldPromoteModel({ baseline: 0.8, candidate: 0.81 })).toBe(false);
    expect(shouldPromoteModel({ baseline: 0.8, candidate: 0.83 })).toBe(true);
  });

  it("creates a deterministic version prefix", () => {
    expect(makeDatasetVersion(new Date("2026-08-14T01:02:03.000Z"))).toBe(
      "dataset-20260814010203",
    );
  });
});
