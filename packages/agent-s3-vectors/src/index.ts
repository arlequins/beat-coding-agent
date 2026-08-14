import type {
  IndexDocumentRequest,
  KnowledgeSearchPort,
  VectorIndexPort,
} from "@arlequins/agent-core";

/** SDK-free S3 Vectors boundary. The AWS host supplies the concrete client and index name. */
export type S3VectorsClientPort = {
  delete(input: { indexName: string; keys: string[] }): Promise<void>;
  upsert(input: {
    indexName: string;
    records: Array<{ key: string; text: string }>;
  }): Promise<void>;
};

export function createS3VectorsIndex(input: {
  client: S3VectorsClientPort;
  indexName: string;
}): VectorIndexPort {
  return {
    delete: ({ recordIds }) =>
      input.client.delete({ indexName: input.indexName, keys: recordIds }),
    async upsert(request: IndexDocumentRequest) {
      await input.client.upsert({
        indexName: input.indexName,
        records: request.chunks.map((chunk) => ({
          key: chunk.recordId,
          text: chunk.content,
        })),
      });
      return { recordIds: request.chunks.map((chunk) => chunk.recordId) };
    },
  };
}

export type S3VectorsQueryClientPort = {
  query(input: {
    indexName: string;
    queryVector: number[];
    topK: number;
  }): Promise<
    Array<{
      content: string;
      documentId: string;
      chunkId: string;
      label: string;
      locator?: string;
      score: number;
      workspaceId: string;
    }>
  >;
};

/** Converts a managed S3 Vectors query into the same citation-bearing RAG port used locally. */
export function createS3VectorsKnowledgeSearch(input: {
  client: S3VectorsQueryClientPort;
  embed: (query: string) => Promise<number[]>;
  indexName: string;
}): KnowledgeSearchPort {
  return {
    async search({ query, workspaceId }) {
      const matches = await input.client.query({
        indexName: input.indexName,
        queryVector: await input.embed(query),
        topK: 8,
      });
      return matches
        .filter((match) => match.workspaceId === workspaceId)
        .map((match) => ({
          citation: {
            chunkId: match.chunkId,
            documentId: match.documentId,
            label: match.label,
            ...(match.locator ? { locator: match.locator } : {}),
          },
          content: match.content,
          score: match.score,
        }));
    },
  };
}
