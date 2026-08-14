import { describe, expect, it } from "vitest";
import { isCodingAgentOwner, parseOwnerConfig, sessionIdentity } from "./owner";

const session = {
  user: {
    id: "owner-user",
    email: "OWNER@EXAMPLE.COM",
    issuer: "https://beat.example.com",
    name: "Owner",
    roles: ["member" as const],
    subject: "google-sub",
  },
  claims: { sub: "google-sub" },
};

describe("coding owner policy", () => {
  it("prefers the stable issuer and subject identity", () => {
    expect(sessionIdentity(session)).toBe(
      "https://beat.example.com|google-sub",
    );
    expect(
      isCodingAgentOwner(
        session,
        parseOwnerConfig({ identities: sessionIdentity(session) }),
      ),
    ).toBe(true);
  });

  it("supports normalized email only as a bootstrap fallback", () => {
    expect(
      isCodingAgentOwner(
        session,
        parseOwnerConfig({ emails: "owner@example.com" }),
      ),
    ).toBe(true);
    expect(
      isCodingAgentOwner(
        session,
        parseOwnerConfig({ emails: "other@example.com" }),
      ),
    ).toBe(false);
  });
});
