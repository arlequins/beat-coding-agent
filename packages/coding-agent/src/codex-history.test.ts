import { describe, expect, it } from "vitest";
import { buildCodexTranscript, parseCodexRollout } from "./codex-history";

describe("Codex rollout history", () => {
  it("keeps user and assistant messages while excluding reasoning and system records", () => {
    const conversation = parseCodexRollout(
      [
        JSON.stringify({
          payload: { id: "session-1" },
          timestamp: "2026-08-14T00:00:00.000Z",
          type: "session_meta",
        }),
        JSON.stringify({
          payload: {
            content: [{ text: "질문입니다" }],
            id: "user-1",
            role: "user",
            type: "message",
          },
          timestamp: "2026-08-14T00:01:00.000Z",
          type: "response_item",
        }),
        JSON.stringify({
          payload: { role: "assistant", type: "reasoning" },
          timestamp: "2026-08-14T00:01:01.000Z",
          type: "response_item",
        }),
        JSON.stringify({
          payload: {
            content: { parts: ["답변입니다"] },
            id: "assistant-1",
            role: "assistant",
            type: "message",
          },
          timestamp: "2026-08-14T00:02:00.000Z",
          type: "response_item",
        }),
      ].join("\n"),
      "rollout.jsonl",
      "테스트 대화",
    );

    expect(conversation).toMatchObject({
      id: "session-1",
      title: "테스트 대화",
      turns: [
        { content: "질문입니다", id: "user-1", role: "user" },
        { content: "답변입니다", id: "assistant-1", role: "assistant" },
      ],
    });
    expect(buildCodexTranscript(conversation!)).toContain("### user");
    expect(buildCodexTranscript(conversation!)).not.toContain("reasoning");
  });

  it("deduplicates a repeated response item id and normalizes epoch timestamps", () => {
    const line = JSON.stringify({
      payload: {
        content: { text: "반복" },
        id: "same",
        role: "user",
        type: "message",
      },
      timestamp: 1_754_000_000,
      type: "response_item",
    });
    const conversation = parseCodexRollout(`${line}\n${line}`, "rollout.jsonl");
    expect(conversation?.turns).toHaveLength(1);
    expect(conversation?.turns[0]?.createdAt).toBe(
      new Date(1_754_000_000_000).toISOString(),
    );
  });
});
