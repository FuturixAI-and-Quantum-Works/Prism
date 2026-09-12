import { describe, expect, it } from "vitest";
import {
  getStreamTerminalKind,
  isChatStreamEvent,
  isComplianceRunEvent,
  isTabularChatEvent,
  isTabularGenerateEvent,
  parseStreamEvent,
  type StreamEvent,
} from "./index";

const events: StreamEvent[] = [
  { type: "chat_id", chatId: "chat-1" },
  { type: "chat_title", chatId: "chat-1", title: "Title" },
  { type: "text_delta", text: "a" },
  { type: "content_delta", text: "b" },
  { type: "reasoning_delta", text: "thinking" },
  { type: "reasoning_block_end" },
  { type: "tool_call", tool: "read_document" },
  { type: "tool_call_start", tool: "read_document" },
  { type: "tool_result", tool: "read_document", output: {} },
  {
    type: "source_results",
    results: [{ rank: 1, filename: "a.docx", page_number: 2, score: 0.9 }],
  },
  { type: "citations", citations: [] },
  { type: "workspace_created", workspace_id: "workspace-1", name: "Workspace" },
  { type: "project_created", project_id: "project-1", name: "Project" },
  {
    type: "template_wizard_start",
    template_id: null,
    template_name: "NDA",
    fields: [{ id: "name", label: "Name", required: true }],
  },
  { type: "doc_read_start", filename: "a.docx" },
  { type: "doc_read", filename: "a.docx" },
  {
    type: "doc_read_failed",
    doc_id: "doc-1",
    filename: "a.docx",
    reason: "download_failed",
    error: "Document could not be read.",
  },
  { type: "doc_find_start", filename: "a.docx" },
  { type: "doc_find", filename: "a.docx" },
  { type: "doc_created_start", filename: "a.docx" },
  { type: "doc_created", filename: "a.docx" },
  { type: "doc_edited_start", filename: "a.docx" },
  { type: "doc_edited", filename: "a.docx" },
  { type: "doc_replicate_start", filename: "a.docx" },
  { type: "doc_replicated", filename: "a.docx" },
  { type: "workflow_applied", workflow_id: "workflow-1", title: "Review" },
  {
    type: "cell_update",
    document_id: "document-1",
    column_index: 0,
    content: null,
    status: "generating",
  },
  { type: "cell_start", document_id: "document-1", column_index: 0 },
  { type: "cell_delta", document_id: "document-1", column_index: 0, text: "value" },
  { type: "status", status: "running" },
  { type: "rule_start", rule_id: "rule-1" },
  { type: "rule_delta", rule_id: "rule-1", text: "value" },
  { type: "rule_result", rule_id: "rule-1", result: {}, status: "compliant" },
  { type: "rule_error", rule_id: "rule-1", error: "failed" },
  { type: "question_start", question_id: "question-1" },
  { type: "question_delta", question_id: "question-1", text: "value" },
  { type: "question_result", question_id: "question-1", result: {} },
  { type: "question_error", question_id: "question-1", error: "failed" },
  { type: "insights_start" },
  { type: "insights_result", insights: [] },
  {
    type: "summary",
    compliance_score: 100,
    critical_issues: 0,
    pending_items: 0,
    resolved_issues: 1,
  },
  {
    type: "clause_validation",
    clause: "Termination",
    status: "valid",
    details: "Present",
  },
  {
    type: "recommendation",
    title: "Review",
    description: "Review the clause",
    priority: "medium",
  },
  { type: "activity", action: "Completed", timestamp: "2026-09-02T00:00:00Z", user: "System" },
  { type: "error", message: "failed" },
  { type: "done" },
];

describe("stream event protocol", () => {
  it("accepts every live event variant", () => {
    for (const event of events) {
      expect(parseStreamEvent(event)).toBe(event);
    }
  });

  it("rejects unknown events", () => {
    expect(() => parseStreamEvent({ type: "not_real" })).toThrow("Unknown stream event");
    expect(() => parseStreamEvent({ type: "error" })).toThrow("Unknown stream event");
    expect(() =>
      parseStreamEvent({
        type: "cell_update",
        document_id: "document-1",
        column_index: 0,
        content: { flag: "blue" },
        status: "done",
      }),
    ).toThrow("Unknown stream event");
    expect(() =>
      parseStreamEvent({
        type: "summary",
        compliance_score: 100,
        critical_issues: 0,
        pending_items: 0,
        resolved_issues: 1,
        ai_insights: [false],
      }),
    ).toThrow("Unknown stream event");
    expect(() =>
      parseStreamEvent({
        type: "source_results",
        results: [{ rank: "first" }],
      }),
    ).toThrow("Unknown stream event");
    expect(() =>
      parseStreamEvent({
        type: "doc_read_failed",
        reason: "download_failed",
        error: "Document could not be read.",
      }),
    ).toThrow("Unknown stream event");
    expect(() =>
      parseStreamEvent({
        type: "doc_read_failed",
        doc_id: "doc-1",
        reason: "unknown",
        error: "Document could not be read.",
      }),
    ).toThrow("Unknown stream event");
  });

  it("allows every chat tool event on tabular chat streams", () => {
    const toolEvents = events.filter(
      (event) =>
        event.type.startsWith("doc_") ||
        event.type === "template_wizard_start" ||
        event.type === "workflow_applied" ||
        event.type === "project_created" ||
        event.type === "workspace_created",
    );

    expect(toolEvents.every(isTabularChatEvent)).toBe(true);
  });

  it("derives family and terminal classification from the registry", () => {
    const done = parseStreamEvent({ type: "done" });
    const error = parseStreamEvent({ type: "error", message: "failed" });
    const cell = parseStreamEvent({
      type: "cell_start",
      document_id: "document-1",
      column_index: 0,
    });

    expect(isChatStreamEvent(done)).toBe(true);
    expect(isComplianceRunEvent(done)).toBe(true);
    expect(isTabularGenerateEvent(cell)).toBe(true);
    expect(getStreamTerminalKind(done)).toBe("success");
    expect(getStreamTerminalKind(error)).toBe("error");
    expect(getStreamTerminalKind(cell)).toBeUndefined();
  });
});
