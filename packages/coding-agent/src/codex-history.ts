export const codexConversationRoles = ["user", "assistant"] as const;
export type CodexConversationRole = (typeof codexConversationRoles)[number];

export type CodexTurn = {
  content: string;
  createdAt: string;
  id: string;
  role: CodexConversationRole;
};

export type CodexConversation = {
  createdAt: string;
  id: string;
  sourceFile: string;
  title: string;
  turns: CodexTurn[];
  updatedAt: string;
};

type RawRecord = {
  payload?: Record<string, unknown>;
  timestamp?: string;
  type?: string;
};

type RawMessage = {
  content?: unknown;
  id?: unknown;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function textFromContent(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value))
    return value
      .map((item) => textFromContent(item))
      .filter(Boolean)
      .join("\n")
      .trim();
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["text", "input_text", "output_text", "value"]) {
    const text = stringValue(record[key]);
    if (text) return text.trim();
  }
  for (const key of ["parts", "content"]) {
    const text = textFromContent(record[key]);
    if (text) return text;
  }
  return "";
}

function normalizeRole(value: unknown): CodexConversationRole | undefined {
  if (value === "user" || value === "human") return "user";
  if (value === "assistant" || value === "bot") return "assistant";
  return undefined;
}

function normalizeTimestamp(value: unknown, fallback: string): string {
  if (typeof value === "number") {
    const milliseconds = value < 10_000_000_000 ? value * 1_000 : value;
    const date = new Date(milliseconds);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return fallback;
}

function titleFromFirstTurn(turn: CodexTurn | undefined): string {
  const value = turn?.content.replace(/\s+/g, " ").trim();
  if (!value) return "Codex conversation";
  return value.length > 96 ? `${value.slice(0, 93)}...` : value;
}

function sourceId(record: RawMessage, fallback: string): string {
  return stringValue(record.id) ?? fallback;
}

/**
 * Parse one Codex rollout JSONL file. Only user and assistant message records
 * are retained; system prompts, reasoning, tool calls, and encrypted payloads
 * are intentionally excluded from the personal knowledge import.
 */
export function parseCodexRollout(
  input: string,
  sourceFile: string,
  title?: string,
): CodexConversation | undefined {
  const lines = input.split(/\r?\n/);
  let sessionId = sourceFile;
  const turns: CodexTurn[] = [];
  const seen = new Set<string>();

  for (const [lineIndex, line] of lines.entries()) {
    if (!line.trim()) continue;
    let record: RawRecord;
    try {
      record = JSON.parse(line) as RawRecord;
    } catch {
      continue;
    }
    if (record.type === "session_meta") {
      const id = record.payload?.session_id ?? record.payload?.id;
      if (typeof id === "string" && id.trim()) sessionId = id;
      continue;
    }
    if (record.type !== "response_item") continue;
    const payload = record.payload;
    if (payload?.type !== "message") continue;
    const role = normalizeRole(payload.role);
    if (!role) continue;
    const message = payload as RawMessage;
    const content = textFromContent(message.content);
    if (!content) continue;
    const id = sourceId(message, `${sessionId}:${lineIndex}`);
    if (seen.has(id)) continue;
    seen.add(id);
    turns.push({
      content,
      createdAt: normalizeTimestamp(
        record.timestamp,
        new Date(0).toISOString(),
      ),
      id,
      role,
    });
  }

  if (!turns.length) return undefined;
  turns.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const createdAt = turns[0]?.createdAt ?? new Date(0).toISOString();
  const updatedAt = turns.at(-1)?.createdAt ?? createdAt;
  return {
    createdAt,
    id: sessionId,
    sourceFile,
    title: title?.trim() || titleFromFirstTurn(turns[0]),
    turns,
    updatedAt,
  };
}

export function parseCodexRollouts(
  inputs: Array<{ content: string; sourceFile: string; title?: string }>,
): CodexConversation[] {
  const conversations = inputs
    .map((input) =>
      parseCodexRollout(input.content, input.sourceFile, input.title),
    )
    .filter((conversation): conversation is CodexConversation =>
      Boolean(conversation),
    );
  return conversations.sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

export function buildCodexTranscript(conversation: CodexConversation): string {
  return conversation.turns
    .map((turn) => `### ${turn.role}\n${turn.content}`)
    .join("\n\n");
}
