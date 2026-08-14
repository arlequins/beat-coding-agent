# Security Policy

## Supported versions

The default branch is the only supported version until a release introduces a
published support policy.

## Reporting a vulnerability

Please do not disclose vulnerabilities, credentials, private conversation data,
or exploit details in a public issue. Use GitHub's private vulnerability
reporting for this repository:

<https://github.com/arlequins/beat-coding-agent/security/advisories/new>

Include the affected component, reproduction steps that do not contain secrets,
the potential impact, and a suggested mitigation when available. Remove any
credentials or personal data from the report before submitting it.

If private vulnerability reporting is unavailable, open a minimal public issue
requesting a private contact channel without including technical details.

## Personal data

This project can store private coding conversations and documents in an
authenticated, user-scoped S3 workspace. Never commit conversation exports,
local Codex session files, dotenv files with real values, or production data.
