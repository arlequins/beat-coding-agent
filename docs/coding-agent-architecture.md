# Beat Coding Agent Architecture

Beat Coding Agent is a separate personal development assistant. Beat remains
the identity provider, while this application owns coding conversations,
repository evidence, feedback, and coding-workspace memory.

## Boundary with Beat Agent

Authentication is shared through Beat OIDC, but data and capabilities are not:

- use a dedicated OIDC client and exact callback allowlist for this application;
- identify the user by the verified `(issuer, sub)` pair, never by email alone;
- keep coding workspaces and S3 prefixes separate from counseling workspaces;
- import a personal preference only when the user explicitly shares it;
- never make counseling transcripts available to coding prompts by default.

Shared identity does not mean shared memory.

## First vertical slice

The first release intentionally supports only:

1. Beat OIDC sign-in with Authorization Code + PKCE;
2. a user-owned coding workspace and conversations;
3. Markdown/text code notes and documents stored in the S3-compatible store;
4. answers grounded in retrieved evidence with citations;
5. feedback and reviewed coding memories;
6. read-only coding capabilities: repository reading, test inspection, and
   change proposals.

The model must not claim that it edited files, ran commands, pushed commits, or
deployed a change unless a later, verified tool result proves it.

## Planned tool boundary

Future repository tools will use a least-privilege GitHub App installation and
an isolated runner. Read operations can be enabled independently. File writes,
commits, pull requests, command execution, and deployment each require a
separate capability and explicit user confirmation.

Long-lived GitHub, AWS, or repository secrets must never be placed in model
context. Cloud deployment remains a protected GitHub Actions/OIDC operation.

## Local start

Run MinIO, the development OIDC provider, the API, and the web app with the
commands in the root README. Ollama is the default local model; Bedrock is an
explicit, usage-priced production option.
