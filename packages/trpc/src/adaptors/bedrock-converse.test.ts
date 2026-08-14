import { ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { describe, expect, it, vi } from "vitest";
import { createAwsBedrockConversePort } from "./bedrock-converse";

describe("AWS Bedrock Converse adapter", () => {
  it("separates system instructions and yields only text deltas", async () => {
    const send = vi.fn(async (_command: unknown) => ({
      stream: (async function* () {
        yield { messageStart: { role: "assistant" } };
        yield { contentBlockDelta: { delta: { text: "안녕" } } };
      })(),
    }));
    const port = createAwsBedrockConversePort({ send } as never);
    const output: string[] = [];
    for await (const delta of port.stream({
      messages: [
        { content: "지침", role: "system" },
        { content: "질문", role: "user" },
      ],
      modelId: "model",
    }))
      output.push(delta);
    expect(output).toEqual(["안녕"]);
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(ConverseStreamCommand);
    expect((command as ConverseStreamCommand).input).toMatchObject({
      messages: [{ content: [{ text: "질문" }], role: "user" }],
      modelId: "model",
      system: [{ text: "지침" }],
    });
  });

  it("supports assistant-only requests without system instructions", async () => {
    const send = vi.fn(async (_command: unknown) => ({
      stream: (async function* () {
        yield { contentBlockDelta: { delta: { text: "다시 안녕" } } };
      })(),
    }));
    const port = createAwsBedrockConversePort({ send } as never);
    const output: string[] = [];

    for await (const delta of port.stream({
      messages: [{ content: "이어서 답해줘", role: "assistant" }],
      modelId: "model",
    }))
      output.push(delta);

    expect(output).toEqual(["다시 안녕"]);
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(ConverseStreamCommand);
    expect((command as ConverseStreamCommand).input).toMatchObject({
      messages: [{ content: [{ text: "이어서 답해줘" }], role: "assistant" }],
      modelId: "model",
    });
    expect((command as ConverseStreamCommand).input.system).toBe(undefined);
  });

  it("fails clearly when Bedrock does not return a stream", async () => {
    const send = vi.fn(async (_command: unknown) => ({}));
    const port = createAwsBedrockConversePort({ send } as never);

    await expect(
      (async () => {
        for await (const _delta of port.stream({
          messages: [{ content: "질문", role: "user" }],
          modelId: "model",
        })) {
          // The adapter should throw before yielding.
        }
      })(),
    ).rejects.toThrow("Bedrock returned no stream");
  });
});
