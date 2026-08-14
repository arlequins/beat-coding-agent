import { describe, expect, it } from "vitest";

import {
  CODING_ASSISTANT_INSTRUCTIONS,
  createCodingAssistantProfile,
  isReadOnlyCodingCapability,
} from "./index";

describe("coding assistant profile", () => {
  it("keeps the profile scoped to the coding workspace", () => {
    const profile = createCodingAssistantProfile("coding-workspace-1");

    expect(profile).toMatchObject({
      id: "coding-assistant",
      name: "Beat Coding Agent",
      workspaceId: "coding-workspace-1",
    });
    expect(profile.instructions).toBe(CODING_ASSISTANT_INSTRUCTIONS);
    expect(profile.instructions).toContain("read-only");
    expect(profile.instructions).toContain("counseling");
  });

  it("allows only non-mutating capabilities in the first slice", () => {
    expect(isReadOnlyCodingCapability("repository.read")).toBe(true);
    expect(isReadOnlyCodingCapability("changes.propose")).toBe(true);
    expect(isReadOnlyCodingCapability("tests.inspect")).toBe(true);
    expect(isReadOnlyCodingCapability("repository.write")).toBe(false);
  });
});
