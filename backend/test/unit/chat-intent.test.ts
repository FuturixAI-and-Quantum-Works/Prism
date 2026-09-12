import { describe, expect, it } from "vitest";
import { detectChatIntent as detectIntent } from "../../src/modules/chat/chat.intent.js";

describe("chat intent routing", () => {
  it.each([
    ["Party name: Acme Ltd", "fill_template_field"],
    ["Create a new matter for Acme", "project_workspace"],
    ["Revise the termination clause in this agreement", "document_edit"],
    ["Draft an NDA", "generate_document"],
    ["Search all documents for the governing law", "search_question"],
    ["Explain indemnities", "general_chat"],
  ])("routes %j to %s", (message, type) => {
    expect(detectIntent(message)).toEqual({ type });
  });

  it("keeps edit requests ahead of document generation", () => {
    expect(detectIntent("Create and revise this contract")).toEqual({
      type: "document_edit",
    });
  });
});
