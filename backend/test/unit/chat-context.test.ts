import { describe, expect, it } from "vitest";
import {
  applyDisplayedItem,
  composeChatContextPrompt,
} from "../../src/modules/ai/context/promptContext.js";

const baseContext = {
  attachedItems: [{ id: "document-1", filename: "agreement.docx" }],
  docIndex: {
    "doc-0": {
      document_id: "document-1",
      filename: "agreement.docx",
      storage_path: "/documents/agreement.docx",
      file_type: "docx",
      lifecycle_status: "DRAFT",
    },
  },
  folderPaths: new Map([["doc-0", "Contracts"]]),
  lastUser: { role: "user" as const, content: "Summarize this" },
  templates: [],
  workflowStore: new Map(),
  ragScope: { type: "project" as const, id: "project-1" },
  ragCollection: null,
  ragStatus: { indexedSourceCount: 0 },
  interviewState: null,
};

describe("chat context assembly", () => {
  it("keeps project scope, document labels, folders, and attachments in one prompt", () => {
    const prompt = composeChatContextPrompt({
      ...baseContext,
      scope: { type: "project", projectId: "project-1" },
    });

    expect(prompt).toContain("PROJECT CONTEXT:");
    expect(prompt).toContain("Scope: project - project project-1");
    expect(prompt).toContain("- doc-0: Contracts / agreement.docx [DRAFT]");
    expect(prompt).toContain("USER-ATTACHED DOCUMENTS FOR THIS TURN:");
    expect(prompt).toContain("- doc-0: agreement.docx");
  });

  it("uses workspace-specific displayed-file markers without mutating prior turns", () => {
    const messages = [
      { role: "user" as const, content: "Earlier" },
      { role: "assistant" as const, content: "Reply" },
      { role: "user" as const, content: "Current" },
    ];

    expect(
      applyDisplayedItem(
        { type: "workspace", workspaceId: "workspace-1" },
        { filename: "schedule.pdf", id: "file-1" },
        messages,
      ),
    ).toEqual([
      messages[0],
      messages[1],
      {
        role: "user",
        content: "Current\n\ndisplayed_file: schedule.pdf, displayed_file_id: file-1",
      },
    ]);
    expect(messages[2]?.content).toBe("Current");
  });
});
