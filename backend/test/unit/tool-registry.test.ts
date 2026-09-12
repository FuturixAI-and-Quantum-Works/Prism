import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createToolRegistry,
  defineTool,
  getAiToolSchemas,
  getToolDefinitions,
  toolRegistry,
  toolDefinitions,
} from "../../src/modules/ai/tools/registry.js";
import {
  createToolExecutionEvents,
  type ToolExecutionContext,
  type ToolScope,
} from "../../src/modules/ai/tools/types.js";

const baseNames = [
  "read_document",
  "search_sources",
  "search_templates",
  "fill_and_create",
  "start_document_wizard",
  "create_project",
  "create_workspace",
  "find_in_document",
  "generate_docx",
  "edit_document",
  "extract_placeholders",
  "get_placeholder_values",
  "set_placeholder_value",
  "fill_placeholders",
  "compare_documents",
  "extract_clauses",
  "suggest_edit",
  "list_workflows",
  "read_workflow",
] as const;

function context(scope: ToolScope = { kind: "personal" }): ToolExecutionContext {
  return {
    callId: "call-1",
    user: { id: "user-1", email: "user@example.com" },
    scope,
    chatId: null,
    write: vi.fn(),
    signal: new AbortController().signal,
    documents: { store: new Map(), index: {}, turnEdits: new Map() },
    workflows: new Map([["workflow-1", { title: "Review", prompt_md: "Review carefully." }]]),
    tabular: {
      columns: [{ index: 0, name: "Term" }],
      documents: [{ id: "document-1", filename: "agreement.docx" }],
      cells: new Map([["0:document-1", { summary: "12 months" }]]),
    },
    events: createToolExecutionEvents(),
  };
}

describe("tool registry", () => {
  it("owns every canonical name exactly once with one executor", () => {
    const names = toolDefinitions.map(({ name }) => name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(23);
    expect(toolDefinitions.every(({ run }) => typeof run === "function")).toBe(true);
    expect(new Set(toolDefinitions.map(({ run }) => run)).size).toBe(toolDefinitions.length);
  });

  it("declares the authorization policy for every canonical tool", () => {
    expect(
      Object.fromEntries(
        toolDefinitions.map(({ name, authorization }) => [name, authorization.kind]),
      ),
    ).toEqual({
      read_document: "checked",
      search_sources: "unrestricted",
      search_templates: "unrestricted",
      fill_and_create: "unrestricted",
      start_document_wizard: "unrestricted",
      create_project: "unrestricted",
      create_workspace: "unrestricted",
      find_in_document: "checked",
      generate_docx: "unrestricted",
      edit_document: "checked",
      extract_placeholders: "checked",
      get_placeholder_values: "checked",
      set_placeholder_value: "checked",
      fill_placeholders: "checked",
      compare_documents: "checked",
      extract_clauses: "checked",
      suggest_edit: "checked",
      list_workflows: "unrestricted",
      read_workflow: "unrestricted",
      list_documents: "unrestricted",
      fetch_documents: "checked",
      replicate_document: "checked",
      read_table_cells: "unrestricted",
    });
  });

  it("keeps every existing tool available in its valid scope", () => {
    expect(getToolDefinitions("personal").map(({ name }) => name)).toEqual(baseNames);
    expect(getToolDefinitions("project").map(({ name }) => name)).toEqual([
      ...baseNames,
      "list_documents",
      "fetch_documents",
      "replicate_document",
    ]);
    expect(getToolDefinitions("workspace").map(({ name }) => name)).toEqual([
      ...baseNames,
      "list_documents",
      "fetch_documents",
    ]);
    expect(getToolDefinitions("tabular").map(({ name }) => name)).toEqual([
      ...baseNames,
      "read_table_cells",
    ]);
  });

  it("derives AI schemas from the registry", () => {
    expect(getAiToolSchemas("project").map(({ function: schema }) => schema.name)).toEqual(
      getToolDefinitions("project").map(({ name }) => name),
    );
  });

  it("rejects invalid placeholder keys at the tool boundary", () => {
    const definition = toolDefinitions.find(({ name }) => name === "fill_placeholders");
    expect(() =>
      definition?.inputSchema.parse({
        doc_id: "doc-1",
        values: { "invalid key": "value" },
      }),
    ).toThrow();
  });

  it.each([
    {
      name: "success",
      input: { value: "accepted" },
      authorize: vi.fn(),
      execute: vi.fn(async () => ({ output: { ok: true } })),
      expectedStatus: "complete",
    },
    {
      name: "validation denial",
      input: { value: "" },
      authorize: vi.fn(),
      execute: vi.fn(async () => ({ output: { ok: true } })),
      expectedStatus: "error",
    },
    {
      name: "authorization denial",
      input: { value: "accepted" },
      authorize: vi.fn(() => {
        throw new Error("denied");
      }),
      execute: vi.fn(async () => ({ output: { ok: true } })),
      expectedStatus: "error",
    },
    {
      name: "executor error",
      input: { value: "accepted" },
      authorize: vi.fn(),
      execute: vi.fn(async () => {
        throw new Error("failed");
      }),
      expectedStatus: "error",
    },
  ])(
    "emits one start and one terminal event for $name",
    async ({ input, authorize, execute, expectedStatus }) => {
      const registry = createToolRegistry([
        defineTool({
          name: "test",
          description: "Lifecycle test tool",
          inputSchema: z.object({ value: z.string().min(1) }),
          scopes: ["personal"],
          authorization: { kind: "checked", authorize },
          execute,
        }),
      ]);
      const toolContext = context();

      await registry.execute(toolContext, { id: "call-1", name: "test", input });

      expect(toolContext.write).toHaveBeenCalledTimes(2);
      expect(toolContext.write).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: "tool_call_start",
          tool_call_id: "call-1",
          tool: "test",
        }),
      );
      expect(toolContext.write).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: "tool_result",
          tool_call_id: "call-1",
          tool: "test",
          status: expectedStatus,
        }),
      );
    },
  );

  it("emits one start and one terminal event when aborted", async () => {
    const registry = createToolRegistry([
      defineTool({
        name: "test",
        description: "Abort lifecycle test tool",
        inputSchema: z.object({}),
        scopes: ["personal"],
        authorization: { kind: "unrestricted" },
        execute: vi.fn(async () => ({ output: { ok: true } })),
      }),
    ]);
    const controller = new AbortController();
    controller.abort();
    const toolContext = { ...context(), signal: controller.signal };

    await expect(
      registry.execute(toolContext, { id: "call-1", name: "test", input: {} }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(toolContext.write).toHaveBeenCalledTimes(2);
    expect(toolContext.write).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "tool_call_start", tool_call_id: "call-1" }),
    );
    expect(toolContext.write).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "tool_result",
        tool_call_id: "call-1",
        status: "error",
      }),
    );
  });

  it("executes representative workflow and tabular tools", async () => {
    const workflowContext = context();
    await toolRegistry.execute(workflowContext, {
      id: "call-1",
      name: "read_workflow",
      input: { workflow_id: "workflow-1" },
    });
    expect(workflowContext.events.workflowsApplied).toEqual([
      { workflow_id: "workflow-1", title: "Review" },
    ]);
    expect(workflowContext.events.toolResults).toHaveLength(0);
    expect(workflowContext.write).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "tool_result", status: "complete" }),
    );

    const tabularContext = context({ kind: "tabular", projectId: null });
    await toolRegistry.execute(tabularContext, {
      id: "call-1",
      name: "read_table_cells",
      input: {},
    });
    expect(tabularContext.events.docsRead).toEqual([{ filename: "1 column × 1 row" }]);
    expect(tabularContext.events.toolResults).toHaveLength(0);
    expect(tabularContext.write).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "tool_result", status: "complete" }),
    );
  });
});
