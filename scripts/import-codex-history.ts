import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

import {
  type CodexConversation,
  parseCodexRollout,
} from "@arlequins/coding-agent";
import { createS3AgentPlatformRepository } from "../packages/trpc/src/adaptors/agent-platform-s3";
import { createS3JsonObjectStore } from "../packages/trpc/src/adaptors/s3-json-store";

type Arguments = {
  apply: boolean;
  archivedRoot: string;
  sessionsRoot: string;
  title?: string;
  userId: string;
  workspaceId?: string;
};

function valueAfter(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseArguments(): Arguments {
  const args = process.argv.slice(2);
  const issuer = process.env.OIDC_MOCK_ISSUER ?? "http://localhost:43102";
  const subject = "local-user";
  const defaultUserId = stableUuid(`${issuer}|${subject}`);
  return {
    apply: args.includes("--apply"),
    archivedRoot: resolve(
      valueAfter(args, "--archived-root") ??
        join(homedir(), ".codex/archived_sessions"),
    ),
    sessionsRoot: resolve(
      valueAfter(args, "--sessions-root") ?? join(homedir(), ".codex/sessions"),
    ),
    ...(valueAfter(args, "--title")
      ? { title: valueAfter(args, "--title") }
      : {}),
    userId: valueAfter(args, "--user-id") ?? defaultUserId,
    ...(valueAfter(args, "--workspace-id")
      ? { workspaceId: valueAfter(args, "--workspace-id") }
      : {}),
  };
}

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

async function rolloutFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await rolloutFiles(path)));
    else if (entry.name.endsWith(".jsonl")) files.push(path);
  }
  return files.sort();
}

async function readTitleIndex(): Promise<Map<string, string>> {
  const indexPath = join(homedir(), ".codex/session_index.jsonl");
  const content = await readFile(indexPath, "utf8").catch(() => "");
  const titles = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line) as { id?: unknown; thread_name?: unknown };
      if (typeof value.id === "string" && typeof value.thread_name === "string")
        titles.set(value.id, value.thread_name);
    } catch {
      // Ignore an incomplete index line while the desktop app is writing it.
    }
  }
  return titles;
}

async function parseHistory(input: Arguments): Promise<CodexConversation[]> {
  const files = [
    ...(await rolloutFiles(input.sessionsRoot)),
    ...(await rolloutFiles(input.archivedRoot)),
  ];
  const titles = await readTitleIndex();
  const byId = new Map<string, CodexConversation>();
  for (const file of files) {
    const conversation = parseCodexRollout(
      await readFile(file, "utf8"),
      file,
      undefined,
    );
    if (!conversation) continue;
    const titled = {
      ...conversation,
      title: titles.get(conversation.id) ?? conversation.title,
    };
    const current = byId.get(titled.id);
    if (!current || titled.turns.length > current.turns.length)
      byId.set(titled.id, titled);
  }
  return [...byId.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

function printSummary(conversations: CodexConversation[]) {
  const turns = conversations.reduce((sum, item) => sum + item.turns.length, 0);
  const userTurns = conversations.reduce(
    (sum, item) =>
      sum + item.turns.filter((turn) => turn.role === "user").length,
    0,
  );
  const assistantTurns = turns - userTurns;
  console.log(
    JSON.stringify(
      {
        conversations: conversations.length,
        turns,
        userTurns,
        assistantTurns,
        first: conversations[0]?.createdAt ?? null,
        last: conversations.at(-1)?.updatedAt ?? null,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const input = parseArguments();
  const conversations = await parseHistory(input);
  printSummary(conversations);
  if (!input.apply) {
    console.log(
      "Dry run only. Add --apply to import into the configured S3 workspace.",
    );
    return;
  }

  const required = ["S3_AGENT_BUCKET", "S3_AGENT_ENDPOINT"] as const;
  for (const key of required) {
    if (!process.env[key])
      throw new Error(`${key} is required when --apply is used`);
  }
  const repository = createS3AgentPlatformRepository(
    createS3JsonObjectStore({
      bucket: process.env.S3_AGENT_BUCKET,
      endpoint: process.env.S3_AGENT_ENDPOINT,
      forcePathStyle: process.env.S3_AGENT_FORCE_PATH_STYLE === "true",
      prefix: process.env.S3_AGENT_PREFIX ?? "offline",
    }),
  );
  const workspace = input.workspaceId
    ? { id: input.workspaceId }
    : ((await repository.listWorkspaces(input.userId))[0] ??
      (await repository.createWorkspace({
        name: input.title ?? "Codex 개인 코딩 지식",
        slug: "codex-personal-knowledge",
        userId: input.userId,
      })));
  const batchId = `codex-${new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14)}`;
  for (const [sequence, conversation] of conversations.entries()) {
    const result = await repository.importCodexConversation(
      { userId: input.userId, workspaceId: workspace.id },
      {
        batchId,
        conversation,
        sequence,
        total: conversations.length,
      },
    );
    console.log(
      `${sequence + 1}/${conversations.length} ${basename(conversation.sourceFile)} ${result.imported ? "imported" : "already-imported"}`,
    );
  }
  console.log(
    `Codex history import completed: workspace=${workspace.id}, batch=${batchId}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
