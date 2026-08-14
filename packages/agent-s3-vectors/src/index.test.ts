import { describe, expect, it } from "vitest";

import { createS3VectorsIndex, createS3VectorsKnowledgeSearch } from "./index";

describe("createS3VectorsIndex", () => {
  it("uses injected operations and returns stable record ids", async () => {
    const records: Array<{ key: string; text: string }> = [];
    const index = createS3VectorsIndex({
      client: {
        delete: async () => undefined,
        upsert: async ({ records: received }) => {
          records.push(...received);
        },
      },
      indexName: "knowledge",
    });
    await expect(
      index.upsert({
        chunks: [{ content: "source", recordId: "chunk-1" }],
        workspaceId: "workspace-1",
      }),
    ).resolves.toEqual({ recordIds: ["chunk-1"] });
    expect(records).toEqual([{ key: "chunk-1", text: "source" }]);
  });
});

describe("createS3VectorsKnowledgeSearch", () => {
  it("filters results to the authorized workspace", async () => {
    const search = createS3VectorsKnowledgeSearch({
      client: {
        query: async () => [
          {
            chunkId: "chunk-1",
            content: "allowed",
            documentId: "doc-1",
            label: "notes.md",
            score: 0.9,
            workspaceId: "workspace-1",
          },
          {
            chunkId: "chunk-2",
            content: "other",
            documentId: "doc-2",
            label: "private.md",
            score: 1,
            workspaceId: "workspace-2",
          },
        ],
      },
      embed: async () => [1, 0],
      indexName: "knowledge",
    });
    await expect(
      search.search({ query: "question", workspaceId: "workspace-1" }),
    ).resolves.toHaveLength(1);
  });
});
