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

The personal operating model extends that slice without turning every chat
message into model training:

```text
immutable conversation event
        ↓
Inbox / draft knowledge artifact
        ↓ owner review
Canonical versioned knowledge snapshot
        ↓
retrieval index and evaluation cases
        ↓ periodic, opt-in training dataset
```

The raw event is never overwritten. Drafts and canonical documents are new
versions, and a pointer identifies the current version. This lets a later
answer cite the exact document version that was used and lets the owner roll
back a bad consolidation.

The owner allowlist is configured with `CODING_AGENT_OWNER_EMAILS` for the
first Google SSO login and then hardened with the verified Beat
`issuer|subject` in `CODING_AGENT_OWNER_IDENTITIES`. The email is not treated
as the permanent identity key.

The model must not claim that it edited files, ran commands, pushed commits, or
deployed a change unless a later, verified tool result proves it.

## Planned tool boundary

Future repository tools will use a least-privilege GitHub App installation and
an isolated runner. Read operations can be enabled independently. File writes,
commits, pull requests, command execution, and deployment each require a
separate capability and explicit user confirmation.

Long-lived GitHub, AWS, or repository secrets must never be placed in model
context. Cloud deployment remains a protected GitHub Actions/OIDC operation.

GitHub integration is a server-side, read-only GitHub App installation with
`contents:read`. The app can read repository metadata and file evidence and
stores the evidence under the coding workspace. It has no write, pull-request,
workflow, issue, or deployment capability. A future write capability must use a
different app installation and a separate user-confirmation flow.

## Mobile and background work

The web app is a PWA. The service worker caches only the application shell; it
does not cache conversation bodies or private documents. On iOS, adding the
site to the Home Screen provides a standalone mobile experience. Long-running
consolidation, dataset, investigation, and future tuning jobs expose an
estimated completion time and status. Local development starts processing a
queued consolidation immediately; AWS production should invoke the same
opaque job through SQS/Lambda or EventBridge Scheduler.

## Training policy

Helpful feedback and owner-approved corrections become JSONL dataset examples.
The dataset is versioned in S3 and is never automatically promoted to a model.
Fine-tuning is an approval-required job contract. A candidate model must beat
the baseline evaluation by a configured margin before its release pointer can
change. Bedrock customization and Provisioned Throughput remain explicit paid
opt-ins; on-demand inference plus retrieval is the default.

## Local start

Run MinIO, the development OIDC provider, the API, and the web app with the
commands in the root README. Ollama is the default local model; Bedrock is an
explicit, usage-priced production option.
