import { describe, expect, it } from "vitest";

import { createTextDocumentExtraction } from "./document-extraction";

describe("createTextDocumentExtraction", () => {
  it("removes active HTML content before indexing", async () => {
    const result = await createTextDocumentExtraction().extract({
      bytes: new TextEncoder().encode(
        "<h1>Hello</h1><script>secret()</script><p>world</p>",
      ),
      contentType: "text/html",
      filename: "notes.html",
    });
    expect(result.text).toBe("Hello world");
  });

  it("trims plain text and markdown documents", async () => {
    const extractor = createTextDocumentExtraction();

    await expect(
      extractor.extract({
        bytes: new TextEncoder().encode("  plain notes  "),
        contentType: "text/plain",
        filename: "notes.txt",
      }),
    ).resolves.toMatchObject({ text: "plain notes" });

    await expect(
      extractor.extract({
        bytes: new TextEncoder().encode("  # Markdown  "),
        contentType: "text/markdown",
        filename: "notes.md",
      }),
    ).resolves.toMatchObject({ text: "# Markdown" });
  });
});
