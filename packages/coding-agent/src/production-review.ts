export type ProductionReviewStatus = "blocked" | "ready" | "review";

export type ProductionReviewConversation = {
  createdAt: string;
  id: string;
  messageCount: number;
  provider?: string;
  title: string;
  updatedAt: string;
};

export type ProductionReviewDocument = {
  filename: string;
  sizeBytes: number;
  status: string;
};

export type ProductionReviewMemory = {
  content: string;
  importance: number;
  status: "approved" | "candidate" | "rejected";
};

export type ProductionReviewMessage = {
  content: string;
  conversationId: string;
  conversationTitle: string;
  messageId: string;
};

export type ProductionReviewInput = {
  conversations: ProductionReviewConversation[];
  documents: ProductionReviewDocument[];
  feedbackKinds: string[];
  generatedAt: string;
  identity: {
    localUserId: string;
    productionUserId?: string;
  };
  memories: ProductionReviewMemory[];
  messages: string[];
  messageSources?: ProductionReviewMessage[];
  trainingDatasets: Array<{
    exampleCount: number;
    sourceFeedbackCount: number;
    version: string;
  }>;
  usage: {
    documents: number;
    memories: number;
    messages: number;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
};

export type SensitiveFindingSummary = {
  byPattern: Record<string, number>;
  locations: Array<{
    byPattern: Record<string, number>;
    conversationId: string;
    conversationTitle: string;
    messageId: string;
  }>;
  total: number;
};

export type ProductionReviewCheck = {
  detail: string;
  id: string;
  nextAction: string;
  status: ProductionReviewStatus;
};

export type CodexProductionReview = {
  generatedAt: string;
  identity: ProductionReviewInput["identity"];
  inventory: {
    conversations: number;
    documents: number;
    feedbackKinds: Record<string, number>;
    importedConversations: number;
    memoryStatuses: Record<string, number>;
    messages: number;
    trainingDatasets: number;
  };
  readiness: {
    checks: ProductionReviewCheck[];
    status: ProductionReviewStatus;
  };
  sensitiveFindings: SensitiveFindingSummary;
  workspace: ProductionReviewInput["workspace"];
};

const sensitivePatterns: Array<[string, RegExp]> = [
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["github-token", /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}\b/g],
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  [
    "secret-assignment",
    /\b(?:API[_-]?KEY|PASSWORD|SECRET|TOKEN)\s*[:=]\s*[^\s,;]{8,}/gi,
  ],
];

export function scanSensitivePatterns(
  texts: Iterable<string>,
): SensitiveFindingSummary {
  const byPattern: Record<string, number> = {};
  for (const text of texts) {
    for (const [name, pattern] of sensitivePatterns) {
      const matches = text.match(pattern)?.length ?? 0;
      if (matches) byPattern[name] = (byPattern[name] ?? 0) + matches;
    }
  }
  return {
    byPattern,
    locations: [],
    total: Object.values(byPattern).reduce((sum, value) => sum + value, 0),
  };
}

function scanSensitiveMessageSources(
  messages: Iterable<ProductionReviewMessage>,
): SensitiveFindingSummary["locations"] {
  return [...messages].flatMap((message) => {
    const finding = scanSensitivePatterns([message.content]);
    if (!finding.total) return [];
    return [
      {
        byPattern: finding.byPattern,
        conversationId: message.conversationId,
        conversationTitle: message.conversationTitle,
        messageId: message.messageId,
      },
    ];
  });
}

function statusRank(status: ProductionReviewStatus) {
  return status === "blocked" ? 2 : status === "review" ? 1 : 0;
}

export function buildCodexProductionReview(
  input: ProductionReviewInput,
): CodexProductionReview {
  const memoryStatuses = input.memories.reduce<Record<string, number>>(
    (counts, memory) => {
      counts[memory.status] = (counts[memory.status] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const feedbackKinds = input.feedbackKinds.reduce<Record<string, number>>(
    (counts, kind) => {
      counts[kind] = (counts[kind] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const sensitiveFindings = scanSensitivePatterns(input.messages);
  sensitiveFindings.locations = input.messageSources
    ? scanSensitiveMessageSources(input.messageSources)
    : [];
  const checks: ProductionReviewCheck[] = [
    {
      detail: input.identity.productionUserId
        ? `운영 user id가 지정됨: ${input.identity.productionUserId}`
        : "운영 Beat OIDC 사용자 식별자가 아직 지정되지 않음",
      id: "production-identity",
      nextAction: input.identity.productionUserId
        ? "운영 계정으로 소유권 확인 후 import를 실행"
        : "Beat Google OIDC 로그인 후 발급된 앱 user id를 확인",
      status: input.identity.productionUserId ? "ready" : "blocked",
    },
    {
      detail: `${memoryStatuses.candidate ?? 0}개의 메모리 후보가 검토 대기 중`,
      id: "memory-review",
      nextAction: "운영 import 전에 후보를 승인 또는 거절",
      status: memoryStatuses.candidate ? "review" : "ready",
    },
    {
      detail:
        sensitiveFindings.total === 0
          ? "자동 탐지된 민감정보 패턴 없음"
          : `${sensitiveFindings.total}개의 민감정보 의심 패턴 탐지됨 (개인 workspace 모드에서는 원문 보존)`,
      id: "sensitive-review",
      nextAction:
        sensitiveFindings.total === 0
          ? "수동 검토 후 운영 import 진행"
          : "개인 workspace의 접근 정책·암호화·백업을 확인한 뒤 원문 포함 import 진행",
      status: "review",
    },
    {
      detail: input.trainingDatasets.length
        ? `${input.trainingDatasets.length}개의 학습 데이터셋이 존재함`
        : "아직 학습 데이터셋이 없음",
      id: "training-data",
      nextAction: "운영 대화에서 helpful 피드백을 쌓은 뒤 데이터셋 생성",
      status: input.trainingDatasets.length ? "ready" : "review",
    },
    {
      detail: `${input.documents.length}개의 문서가 현재 workspace에 있음`,
      id: "workspace-scope",
      nextAction: "운영 workspace가 개인 계정에 귀속되는지 확인",
      status: "review",
    },
  ];
  const status = checks.reduce<ProductionReviewStatus>(
    (current, check) =>
      statusRank(check.status) > statusRank(current) ? check.status : current,
    "ready",
  );
  return {
    generatedAt: input.generatedAt,
    identity: input.identity,
    inventory: {
      conversations: input.conversations.length,
      documents: input.documents.length,
      feedbackKinds,
      importedConversations: input.conversations.filter(
        (conversation) => conversation.provider === "codex",
      ).length,
      memoryStatuses,
      messages: input.usage.messages,
      trainingDatasets: input.trainingDatasets.length,
    },
    readiness: { checks, status },
    sensitiveFindings,
    workspace: input.workspace,
  };
}

export function renderCodexProductionReview(
  review: CodexProductionReview,
): string {
  const lines = [
    "# Codex 운영 반입 사전 검토",
    "",
    `- 생성 시각: ${review.generatedAt}`,
    `- workspace: ${review.workspace.name} (${review.workspace.id})`,
    `- local user id: ${review.identity.localUserId}`,
    `- production user id: ${review.identity.productionUserId ?? "미지정"}`,
    `- 전체 상태: **${review.readiness.status}**`,
    "",
    "## 데이터 인벤토리",
    "",
    `- Codex 대화: ${review.inventory.importedConversations}개 / 전체 ${review.inventory.conversations}개`,
    `- 메시지: ${review.inventory.messages}개`,
    `- 문서: ${review.inventory.documents}개`,
    `- 피드백: ${
      Object.entries(review.inventory.feedbackKinds)
        .map(([kind, count]) => `${kind} ${count}개`)
        .join(", ") || "없음"
    }`,
    `- 메모리 상태: ${
      Object.entries(review.inventory.memoryStatuses)
        .map(([status, count]) => `${status} ${count}개`)
        .join(", ") || "없음"
    }`,
    `- 학습 데이터셋: ${review.inventory.trainingDatasets}개`,
    "",
    "## 점검 항목",
    "",
    ...review.readiness.checks.flatMap((check) => [
      `- [${check.status}] ${check.id}: ${check.detail}`,
      `  - 다음 조치: ${check.nextAction}`,
    ]),
    "",
    "## 민감정보 자동 점검",
    "",
    `- 총 탐지 수: ${review.sensitiveFindings.total}`,
    `- 유형별: ${
      Object.entries(review.sensitiveFindings.byPattern)
        .map(([name, count]) => `${name} ${count}개`)
        .join(", ") || "없음"
    }`,
    ...(review.sensitiveFindings.locations.length
      ? [
          "- 검토 위치:",
          ...review.sensitiveFindings.locations.map(
            (location) =>
              `  - ${location.conversationTitle} / ${location.messageId} (${Object.entries(
                location.byPattern,
              )
                .map(([name, count]) => `${name} ${count}개`)
                .join(", ")})`,
          ),
        ]
      : []),
    "- 자동 점검은 보조 수단이므로 원문을 운영 반입 전에 수동 검토해야 합니다.",
    "",
  ];
  return lines.join("\n");
}
