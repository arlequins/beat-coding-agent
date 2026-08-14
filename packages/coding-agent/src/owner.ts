import type { AuthSession } from "@arlequins/auth";

export type CodingOwnerConfig = {
  emails?: ReadonlySet<string>;
  identities?: ReadonlySet<string>;
};

function normalizedEmail(value: string | null | undefined): string | undefined {
  const email = value?.trim().toLocaleLowerCase();
  return email || undefined;
}

export function sessionIdentity(session: Pick<AuthSession, "user">): string {
  return `${session.user.issuer}|${session.user.subject}`;
}

/** Prefer the stable OIDC identity; email is a bootstrap fallback only. */
export function isCodingAgentOwner(
  session: Pick<AuthSession, "user">,
  config: CodingOwnerConfig,
): boolean {
  const identity = sessionIdentity(session);
  if (config.identities?.has(identity)) return true;
  const email = normalizedEmail(session.user.email);
  return Boolean(email && config.emails?.has(email));
}

export function parseOwnerConfig(input: {
  emails?: string;
  identities?: string;
}): CodingOwnerConfig {
  const split = (value?: string) =>
    new Set(
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  return {
    emails: new Set(
      [...split(input.emails)].map((email) => email.toLocaleLowerCase()),
    ),
    identities: split(input.identities),
  };
}
