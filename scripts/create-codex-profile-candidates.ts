import { createHash } from "node:crypto";

import { createS3AgentPlatformRepository } from "../packages/trpc/src/adaptors/agent-platform-s3";
import { createS3JsonObjectStore } from "../packages/trpc/src/adaptors/s3-json-store";

type Candidate = {
  content: string;
  importance: number;
  sourceTitle: string;
};

const candidates: Candidate[] = [
  {
    content: "사용자는 기본적으로 한국어로 답변받기를 원한다.",
    importance: 95,
    sourceTitle: "Build beat-agent vertical slice",
  },
  {
    content:
      "사용자는 코딩 에이전트를 개인 전용으로 운영하고, Beat 인증과 사용자별 workspace 경계를 유지하기를 원한다.",
    importance: 95,
    sourceTitle: "Design phased AI agent architecture",
  },
  {
    content:
      "사용자는 AWS를 free-tier-first와 비용 인식 방식으로 설계하고, 유료 상시 서비스를 기본값으로 선택하지 않기를 원한다.",
    importance: 90,
    sourceTitle: "Design phased AI agent architecture",
  },
  {
    content:
      "사용자는 S3를 불변·버전 관리 가능한 주 저장소로 활용하고, 동시성 문제를 append-only 자료와 주기적 갱신으로 해결하는 설계를 선호한다.",
    importance: 90,
    sourceTitle: "Build agent data workflows",
  },
  {
    content:
      "사용자는 로컬 Mac에서 먼저 Ollama와 MinIO 같은 저비용 구성을 사용하고, 필요할 때만 Bedrock 같은 클라우드 모델로 확장하기를 원한다.",
    importance: 85,
    sourceTitle: "Build beat-agent vertical slice",
  },
  {
    content:
      "사용자는 배포·릴리즈·클라우드 작업을 로컬에서 집행하지 않고 GitHub Actions와 OIDC를 통해 실행하기를 원한다.",
    importance: 95,
    sourceTitle: "Build beat-agent vertical slice",
  },
  {
    content:
      "사용자는 단위 테스트와 Playwright E2E를 함께 작성하고, 커버리지 목표를 75% 이상으로 유지하기를 원한다.",
    importance: 90,
    sourceTitle: "Build beat-agent vertical slice",
  },
  {
    content:
      "사용자는 중간 확인 질문을 반복하기보다 명확한 범위에서는 작업을 끝까지 진행하고, CI 실패와 검증 결과를 함께 보고받기를 원한다.",
    importance: 90,
    sourceTitle: "Build beat-agent vertical slice",
  },
  {
    content:
      "사용자는 TypeScript·pnpm·Turborepo 기반의 Clean Architecture와 저장소별 경계를 선호한다.",
    importance: 80,
    sourceTitle: "전반적인 리팩토링",
  },
  {
    content:
      "사용자는 코딩 에이전트를 모바일에서도 접근할 수 있도록 PWA 방향으로 발전시키기를 원한다.",
    importance: 75,
    sourceTitle: "Build beat-agent vertical slice",
  },
];

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

async function main() {
  const issuer = process.env.OIDC_MOCK_ISSUER ?? "http://localhost:43102";
  const userId = stableUuid(`${issuer}|local-user`);
  const repository = createS3AgentPlatformRepository(
    createS3JsonObjectStore({
      bucket: process.env.S3_AGENT_BUCKET ?? "",
      endpoint: process.env.S3_AGENT_ENDPOINT,
      forcePathStyle: process.env.S3_AGENT_FORCE_PATH_STYLE === "true",
      prefix: process.env.S3_AGENT_PREFIX ?? "offline",
    }),
  );
  const workspace = (await repository.listWorkspaces(userId))[0];
  if (!workspace) throw new Error("Codex import workspace was not found");
  const actor = { userId, workspaceId: workspace.id };
  const conversations = await repository.listConversations(actor);
  const memories = await repository.listMemories(actor);
  let created = 0;
  for (const candidate of candidates) {
    if (memories.some((memory) => memory.content === candidate.content))
      continue;
    const source = conversations.find(
      (conversation) => conversation.title === candidate.sourceTitle,
    );
    await repository.createMemory(actor, {
      content: candidate.content,
      importance: candidate.importance,
      ...(source ? { sourceConversationId: source.id } : {}),
    });
    created += 1;
  }
  console.log(
    JSON.stringify(
      {
        created,
        existing: memories.length,
        totalCandidates: candidates.length,
        workspaceId: workspace.id,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
