# Codex History Import

The coding agent can import local Codex rollout files into the authenticated
user's local S3 workspace. The importer deliberately keeps only `user` and
`assistant` message records. System instructions, model reasoning, encrypted
payloads, and tool output are excluded.

## Dry run

```bash
pnpm exec tsx scripts/import-codex-history.ts
```

The default source paths are `~/.codex/sessions` and
`~/.codex/archived_sessions`. Use `--sessions-root` and `--archived-root` to
override them.

## Local import

```bash
pnpm exec dotenv -e .env.localhost -- \
  pnpm exec tsx scripts/import-codex-history.ts --apply
```

Each Codex session is imported once using a deterministic source identifier.
The session is retained as conversation messages and as a text document for
retrieval. Re-running the command is safe and reports already-imported
sessions without duplicating them.

The local importer uses the development OIDC identity `local-user`. Production
imports must run after the Beat OIDC identity mapping is configured; do not
copy the local workspace into production without verifying the user identity.

## Profile candidates

```bash
pnpm exec dotenv -e .env.localhost -- \
  pnpm exec tsx scripts/create-codex-profile-candidates.ts
```

This creates reviewable memory candidates from explicit user preferences found
in the project history. Candidates are not used for retrieval until the owner
approves them in the application. Fine-tuning remains a later step and should
use approved, helpful examples rather than the raw transcript.

