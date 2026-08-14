import { describe, expect, it } from "vitest";

import { AppRouter } from "./root";

type RuntimeRouter = {
  _def?: { record: Record<string, unknown> };
};

function procedureNames(router: unknown) {
  const runtimeRouter = router as RuntimeRouter;
  return Object.keys(
    runtimeRouter._def?.record ?? (router as Record<string, unknown>),
  ).sort();
}

describe("public tRPC contract", () => {
  it("keeps top-level domain routers stable", () => {
    const names = procedureNames(AppRouter);
    expect(names).toEqual(["agent", "auth"]);
    expect(procedureNames(AppRouter._def.record.auth)).toEqual(["me"]);
  });

  it("publishes workspace-scoped agent procedures", () => {
    expect(procedureNames(AppRouter._def.record.agent)).toEqual([
      "activeJob",
      "activeRelease",
      "addGitHubSource",
      "addMessage",
      "addWorkspaceMember",
      "archiveConversation",
      "auditLog",
      "complete",
      "conversations",
      "createConversation",
      "createDocument",
      "createEvaluationCase",
      "createKnowledgeDraft",
      "createMemory",
      "createTrainingDataset",
      "createWorkspace",
      "deleteDocument",
      "deleteMemory",
      "documents",
      "evaluationCases",
      "evaluationRuns",
      "githubFile",
      "githubRepository",
      "githubSources",
      "importCodexConversation",
      "indexRuns",
      "ingestTextDocument",
      "jobs",
      "knowledgeArtifacts",
      "knowledgeVersions",
      "memories",
      "messageCitations",
      "messages",
      "processConsolidation",
      "publishRelease",
      "purgeExpiredMemories",
      "queueConsolidation",
      "queueFineTune",
      "recordGitHubEvidence",
      "reviewKnowledgeArtifact",
      "reviewMemory",
      "runEvaluation",
      "startIndex",
      "submitFeedback",
      "trainingDatasets",
      "usage",
      "workspaces",
    ]);
  });
});
