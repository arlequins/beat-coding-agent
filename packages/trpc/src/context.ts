import type {
  DocumentExtractionPort,
  EmbeddingProviderPort,
  KnowledgeSearchPort,
  MemorySearchPort,
  ModelProviderPort,
} from "@arlequins/agent-core";
import type { AuthSession, TRPCAuth } from "@arlequins/auth";
import type { GitHubReadOnlyPort } from "@arlequins/coding-agent";
import type { Logger, Telemetry } from "@arlequins/logger";
import type { S3AgentPlatformRepository } from "./adaptors/agent-platform-s3";

export type TRPCServices = {
  agent: S3AgentPlatformRepository;
  model?: ModelProviderPort;
  modelId?: string;
  embedding?: EmbeddingProviderPort;
  documentExtraction: DocumentExtractionPort;
  knowledgeSearch: KnowledgeSearchPort;
  memorySearch: MemorySearchPort;
  github?: GitHubReadOnlyPort;
};

export type TRPCContext = {
  authApi: TRPCAuth;
  logger: Logger;
  telemetry: Telemetry;
  session: AuthSession | null;
  codingAgentOwner: boolean;
  services: TRPCServices;
};

export type CreateTRPCContextOptions = {
  headers: Headers;
  logger: Logger;
  telemetry: Telemetry;
};
