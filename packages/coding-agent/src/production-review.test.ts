import { describe, expect, it } from "vitest";
import {
  buildCodexProductionReview,
  renderCodexProductionReview,
  scanSensitivePatterns,
} from "./production-review";

describe("Codex production review", () => {
  it("counts likely secrets without returning their values", () => {
    const result = scanSensitivePatterns([
      `AWS_ACCESS_KEY_ID=AKIA${"1234567890ABCDEF"}`,
      `-----BEGIN ${"RSA"} PRIVATE KEY-----`,
    ]);
    expect(result.total).toBe(2);
    expect(result.byPattern).toEqual({
      "aws-access-key": 1,
      "private-key": 1,
    });
  });

  it("blocks production review until identity and candidate memories are handled", () => {
    const result = buildCodexProductionReview({
      conversations: [
        {
          createdAt: "2026-08-14T00:00:00.000Z",
          id: "conversation-1",
          messageCount: 2,
          provider: "codex",
          title: "기록",
          updatedAt: "2026-08-14T00:01:00.000Z",
        },
      ],
      documents: [
        { filename: "codex/1.md", sizeBytes: 100, status: "completed" },
      ],
      feedbackKinds: [],
      generatedAt: "2026-08-14T00:02:00.000Z",
      identity: { localUserId: "local", productionUserId: undefined },
      memories: [{ content: "한국어", importance: 95, status: "candidate" }],
      messages: ["한국어로 답해줘"],
      messageSources: [
        {
          content: `TOKEN=${"secret-value"}`,
          conversationId: "conversation-1",
          conversationTitle: "기록",
          messageId: "message-1",
        },
      ],
      trainingDatasets: [],
      usage: { documents: 1, memories: 1, messages: 2 },
      workspace: { id: "workspace-1", name: "Codex", slug: "codex" },
    });

    expect(result.readiness.status).toBe("blocked");
    expect(result.inventory).toMatchObject({
      conversations: 1,
      feedbackKinds: {},
      importedConversations: 1,
      memoryStatuses: { candidate: 1 },
    });
    expect(result.sensitiveFindings.locations).toMatchObject([
      { conversationId: "conversation-1", messageId: "message-1" },
    ]);
    expect(renderCodexProductionReview(result)).toContain(
      "Codex 운영 반입 사전 검토",
    );
  });
});
