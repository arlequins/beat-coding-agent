import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

import {
  buildCodexProductionReview,
  renderCodexProductionReview,
} from "@arlequins/coding-agent";
import { createS3AgentPlatformRepository } from "../packages/trpc/src/adaptors/agent-platform-s3";
import { createS3JsonObjectStore } from "../packages/trpc/src/adaptors/s3-json-store";

function stableUuid(value: string) {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function valueAfter(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const issuer = process.env.OIDC_MOCK_ISSUER ?? "http://localhost:43102";
  const localUserId =
    valueAfter(args, "--local-user-id") ?? stableUuid(`${issuer}|local-user`);
  const productionUserId =
    valueAfter(args, "--production-user-id") ??
    process.env.PRODUCTION_AGENT_USER_ID;
  const workspaceId = valueAfter(args, "--workspace-id");
  const store = createS3JsonObjectStore({
    bucket: process.env.S3_AGENT_BUCKET ?? "",
    endpoint: process.env.S3_AGENT_ENDPOINT,
    forcePathStyle: process.env.S3_AGENT_FORCE_PATH_STYLE === "true",
    prefix: process.env.S3_AGENT_PREFIX ?? "offline",
  });
  const repository = createS3AgentPlatformRepository(store);
  const workspace = workspaceId
    ? (await repository.listWorkspaces(localUserId)).find(
        (item) => item.id === workspaceId,
      )
    : (await repository.listWorkspaces(localUserId))[0];
  if (!workspace)
    throw new Error("No workspace found. Import Codex history first.");

  const actor = { userId: localUserId, workspaceId: workspace.id };
  const conversations = await repository.listConversations(actor);
  const messages = (
    await Promise.all(
      conversations.map((conversation) =>
        repository.listMessages(actor, conversation.id),
      ),
    )
  ).flat();
  const documents = await repository.listDocuments(actor);
  const memories = await repository.listMemories(actor);
  const feedback = await repository.listFeedback(actor);
  const trainingDatasets = await repository.listTrainingDatasets(actor);
  const usage = await repository.workspaceUsage(actor);
  const review = buildCodexProductionReview({
    conversations: conversations.map((conversation) => ({
      createdAt: conversation.createdAt.toISOString(),
      id: conversation.id,
      messageCount: messages.filter(
        (message) => message.conversationId === conversation.id,
      ).length,
      ...(conversation.source?.provider
        ? { provider: conversation.source.provider }
        : {}),
      title: conversation.title,
      updatedAt: conversation.updatedAt.toISOString(),
    })),
    documents: documents.map((document) => ({
      filename: document.filename,
      sizeBytes: document.sizeBytes,
      status: document.status,
    })),
    feedbackKinds: feedback.map((item) => item.kind),
    generatedAt: new Date().toISOString(),
    identity: {
      localUserId,
      ...(productionUserId ? { productionUserId } : {}),
    },
    memories: memories.map((memory) => ({
      content: memory.content,
      importance: memory.importance,
      status: memory.status,
    })),
    messages: messages.map((message) => message.content),
    messageSources: messages.map((message) => ({
      content: message.content,
      conversationId: message.conversationId,
      conversationTitle:
        conversations.find((item) => item.id === message.conversationId)
          ?.title ?? "Unknown conversation",
      messageId: message.id,
    })),
    trainingDatasets: trainingDatasets.map((dataset) => ({
      exampleCount: dataset.exampleCount,
      sourceFeedbackCount: dataset.sourceFeedbackCount,
      version: dataset.version,
    })),
    usage,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    },
  });
  const format = valueAfter(args, "--format") ?? "markdown";
  const output =
    format === "json"
      ? `${JSON.stringify(review, null, 2)}\n`
      : renderCodexProductionReview(review);
  const outputPath = valueAfter(args, "--output");
  if (outputPath) await writeFile(outputPath, output, "utf8");
  else process.stdout.write(output);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
