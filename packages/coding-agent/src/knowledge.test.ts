import { describe, expect, it } from "vitest";
import { buildKnowledgeDraft, buildTrainingExample } from "./knowledge";

describe("knowledge promotion helpers", () => {
  it("creates a reviewable draft", () => {
    expect(
      buildKnowledgeDraft({
        content: "Use immutable S3 events.",
        createdAt: "2026-08-14T00:00:00.000Z",
        id: "artifact-1",
        kind: "architecture",
        title: "Storage decision",
        workspaceId: "workspace-1",
      }),
    ).toMatchObject({ status: "draft", version: 1 });
  });

  it("deduplicates citations in a dataset example", () => {
    expect(
      buildTrainingExample({
        answer: "Use S3 versioning.",
        citations: ["chunk-1", "chunk-1"],
        question: "How should storage work?",
      }).citations,
    ).toEqual(["chunk-1"]);
  });
});
