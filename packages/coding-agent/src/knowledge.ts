export const knowledgeArtifactKinds = [
  "architecture",
  "decision",
  "coding-rule",
  "investigation",
  "project-note",
] as const;

export type KnowledgeArtifactKind = (typeof knowledgeArtifactKinds)[number];
export type KnowledgeArtifactStatus =
  | "inbox"
  | "draft"
  | "canonical"
  | "rejected";

export type KnowledgeArtifact = {
  content: string;
  createdAt: string;
  id: string;
  kind: KnowledgeArtifactKind;
  sourceConversationId?: string;
  status: KnowledgeArtifactStatus;
  title: string;
  updatedAt: string;
  version: number;
  workspaceId: string;
};

export type TrainingExample = {
  answer: string;
  citations: string[];
  feedbackKind?: "helpful" | "incorrect" | "missing" | "needs-investigation";
  question: string;
  sourceMessageId?: string;
};

export function normalizeKnowledgeTitle(value: string): string {
  const title = value.trim().replace(/\s+/g, " ");
  if (!title) throw new Error("Knowledge title is required");
  return title.slice(0, 256);
}

export function buildKnowledgeDraft(input: {
  content: string;
  createdAt: string;
  id: string;
  kind: KnowledgeArtifactKind;
  sourceConversationId?: string;
  title: string;
  workspaceId: string;
}): KnowledgeArtifact {
  const content = input.content.trim();
  if (!content) throw new Error("Knowledge content is required");
  return {
    content,
    createdAt: input.createdAt,
    id: input.id,
    kind: input.kind,
    ...(input.sourceConversationId
      ? { sourceConversationId: input.sourceConversationId }
      : {}),
    status: "draft",
    title: normalizeKnowledgeTitle(input.title),
    updatedAt: input.createdAt,
    version: 1,
    workspaceId: input.workspaceId,
  };
}

export function buildTrainingExample(input: {
  answer: string;
  citations?: string[];
  feedbackKind?: TrainingExample["feedbackKind"];
  question: string;
  sourceMessageId?: string;
}): TrainingExample {
  const question = input.question.trim();
  const answer = input.answer.trim();
  if (!question || !answer)
    throw new Error("Training examples require question and answer");
  return {
    answer,
    citations: [...new Set(input.citations ?? [])],
    ...(input.feedbackKind ? { feedbackKind: input.feedbackKind } : {}),
    question,
    ...(input.sourceMessageId
      ? { sourceMessageId: input.sourceMessageId }
      : {}),
  };
}
