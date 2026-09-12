import { z } from "zod";
import {
  assertDocumentActionAllowed,
  type DocumentAction,
} from "../../documents/documents.permissions.service.js";
import { resolveDocLabel } from "./documentContent.js";
import type { OpenAIToolSchema } from "../../../lib/llm/index.js";
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutorResult,
  ToolMessage,
  ToolScope,
} from "./types.js";
import {
  executeEditDocument,
  executeExtractPlaceholders,
  executeFillPlaceholders,
  executeGetPlaceholderValues,
  executeSetPlaceholderValue,
  executeSuggestEdit,
} from "./documentEditExecutors.js";
import { executeGenerateDocx, executeReplicateDocument } from "./documentGenerationExecutors.js";
import {
  executeExtractClauses,
  executeFetchDocuments,
  executeFindInDocument,
  executeListDocuments,
  executeReadDocument,
} from "./documentReadExecutors.js";
import { executeCompareDocuments } from "./documentComparisonExecutors.js";
import {
  executeSearchTemplates,
  executeFillAndCreate,
  executeStartDocumentWizard,
} from "./templateExecutors.js";
import { executeSearchSources } from "./searchExecutors.js";
import { executeListWorkflows, executeReadWorkflow } from "./workflowExecutors.js";
import { executeCreateProject, executeCreateWorkspace } from "./projectWorkspaceExecutors.js";
import { executeReadTableCells } from "./tabularExecutors.js";

const allScopes: readonly ToolScope["kind"][] = ["personal", "project", "workspace", "tabular"];
const unrestricted = { kind: "unrestricted" } as const;

export function defineTool<Schema extends z.ZodType>(
  definition: Omit<ToolDefinition<z.output<Schema>, ToolExecutorResult | void>, "inputSchema"> & {
    inputSchema: Schema;
  },
) {
  return {
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    scopes: definition.scopes,
    authorization: definition.authorization,
    run: async (context: ToolExecutionContext, input: unknown) => {
      const parsed = definition.inputSchema.parse(input);
      switch (definition.authorization.kind) {
        case "unrestricted":
          break;
        case "checked":
          await definition.authorization.authorize(context, parsed);
          break;
        default: {
          const unsupported: never = definition.authorization;
          throw new Error(
            `Unsupported AI tool authorization policy: ${String(Reflect.get(unsupported, "kind"))}`,
          );
        }
      }
      context.signal.throwIfAborted();
      return definition.execute(context, parsed);
    },
  };
}

const tool = defineTool;

async function authorizeDocument(
  context: ToolExecutionContext,
  rawId: string,
  action: DocumentAction,
) {
  const label = resolveDocLabel(rawId, context.documents.store, context.documents.index) ?? rawId;
  const document = context.documents.index[label];
  if (!document) throw new Error(`Document '${rawId}' not found in this chat scope.`);
  await assertDocumentActionAllowed(
    document.document_id,
    context.user.id,
    context.user.email,
    action,
  );
}

export const toolDefinitions = [
  tool({
    name: "read_document",
    description: "Read the full text of a document in the current scope.",
    inputSchema: z.object({ doc_id: z.string().min(1) }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) =>
        authorizeDocument(context, input.doc_id, "read_document"),
    },
    execute: executeReadDocument,
  }),
  tool({
    name: "search_sources",
    description: "Search indexed sources in the current chat scope.",
    inputSchema: z.object({
      query: z.string().min(1),
      top_k: z.number().int().min(1).max(20).optional(),
    }),
    scopes: allScopes,
    authorization: unrestricted,
    execute: executeSearchSources,
  }),
  tool({
    name: "search_templates",
    description: "Search accessible legal document templates.",
    inputSchema: z.object({ query: z.string().min(1) }),
    scopes: allScopes,
    authorization: unrestricted,
    execute: executeSearchTemplates,
  }),
  tool({
    name: "fill_and_create",
    description: "Create a Word document from an accessible template.",
    inputSchema: z.object({
      template_id: z.string().min(1),
      values: z.record(z.string(), z.string()),
      filename: z.string().optional(),
    }),
    scopes: allScopes,
    authorization: unrestricted,
    execute: executeFillAndCreate,
  }),
  tool({
    name: "start_document_wizard",
    description: "Start an interactive document field wizard.",
    inputSchema: z.object({
      document_type: z.string().min(1),
      fields: z
        .array(
          z.object({
            id: z.string().min(1),
            label: z.string().min(1),
            type: z.enum(["text", "date", "number", "textarea"]).optional(),
            required: z.boolean(),
            options: z.array(z.string()).optional(),
            placeholder: z.string().optional(),
          }),
        )
        .min(1),
    }),
    scopes: allScopes,
    authorization: unrestricted,
    execute: executeStartDocumentWizard,
  }),
  tool({
    name: "create_project",
    description: "Create a new Prism project or matter.",
    inputSchema: z.object({ name: z.string().min(1), matter_type: z.string().optional() }),
    scopes: allScopes,
    authorization: unrestricted,
    execute: executeCreateProject,
  }),
  tool({
    name: "create_workspace",
    description: "Create a new Prism workspace.",
    inputSchema: z.object({ name: z.string().min(1), description: z.string().optional() }),
    scopes: allScopes,
    authorization: unrestricted,
    execute: executeCreateWorkspace,
  }),
  tool({
    name: "find_in_document",
    description: "Find text with surrounding context in a document.",
    inputSchema: z.object({
      doc_id: z.string().min(1),
      query: z.string().min(1),
      max_results: z.number().int().positive().optional(),
      context_chars: z.number().int().nonnegative().optional(),
    }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) =>
        authorizeDocument(context, input.doc_id, "find_in_document"),
    },
    execute: executeFindInDocument,
  }),
  tool({
    name: "generate_docx",
    description: "Generate a Word document from structured sections.",
    inputSchema: z.object({
      title: z.string().min(1),
      landscape: z.boolean().optional(),
      sections: z.array(
        z.object({
          heading: z.string().optional(),
          level: z.number().int().min(1).max(3).optional(),
          content: z.string().optional(),
          pageBreak: z.boolean().optional(),
          table: z
            .object({ headers: z.array(z.string()), rows: z.array(z.array(z.string())) })
            .optional(),
        }),
      ),
    }),
    scopes: allScopes,
    authorization: unrestricted,
    execute: executeGenerateDocx,
  }),
  tool({
    name: "edit_document",
    description: "Apply precise tracked edits to a DOCX document.",
    inputSchema: z.object({
      doc_id: z.string().min(1),
      edits: z
        .array(
          z.object({
            find: z.string(),
            replace: z.string(),
            context_before: z.string(),
            context_after: z.string(),
            reason: z.string().optional(),
          }),
        )
        .min(1),
    }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) =>
        authorizeDocument(context, input.doc_id, "edit_document"),
    },
    execute: executeEditDocument,
  }),
  tool({
    name: "extract_placeholders",
    description: "extract placeholders",
    inputSchema: z.object({ doc_id: z.string().min(1) }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) =>
        authorizeDocument(context, input.doc_id, "extract_placeholders"),
    },
    execute: executeExtractPlaceholders,
  }),
  tool({
    name: "get_placeholder_values",
    description: "get placeholder values",
    inputSchema: z.object({ doc_id: z.string().min(1), keys: z.array(z.string()).optional() }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) =>
        authorizeDocument(context, input.doc_id, "read_document"),
    },
    execute: executeGetPlaceholderValues,
  }),
  tool({
    name: "set_placeholder_value",
    description: "set placeholder value",
    inputSchema: z.object({
      doc_id: z.string().min(1),
      key: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,119}$/),
      value: z.string(),
    }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) =>
        authorizeDocument(context, input.doc_id, "set_placeholder_value"),
    },
    execute: executeSetPlaceholderValue,
  }),
  tool({
    name: "fill_placeholders",
    description: "fill placeholders",
    inputSchema: z.object({
      doc_id: z.string().min(1),
      values: z
        .record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,119}$/), z.string())
        .refine((values) => Object.keys(values).length > 0),
    }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) =>
        authorizeDocument(context, input.doc_id, "fill_placeholders"),
    },
    execute: executeFillPlaceholders,
  }),
  tool({
    name: "compare_documents",
    description: "compare documents",
    inputSchema: z.object({
      doc_id_a: z.string().min(1),
      doc_id_b: z.string().min(1),
      comparison_type: z.enum(["full", "structural", "semantic"]).optional(),
    }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) => {
        await authorizeDocument(context, input.doc_id_a, "compare_documents");
        await authorizeDocument(context, input.doc_id_b, "compare_documents");
      },
    },
    execute: executeCompareDocuments,
  }),
  tool({
    name: "extract_clauses",
    description: "extract clauses",
    inputSchema: z.object({
      doc_id: z.string().min(1),
      clause_types: z.array(z.string()).optional(),
    }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) =>
        authorizeDocument(context, input.doc_id, "extract_clauses"),
    },
    execute: executeExtractClauses,
  }),
  tool({
    name: "suggest_edit",
    description: "suggest edit",
    inputSchema: z.object({
      doc_id: z.string().min(1),
      suggestions: z
        .array(
          z.object({
            find: z.string(),
            replace: z.string(),
            context_before: z.string().optional(),
            context_after: z.string().optional(),
            reason: z.string(),
            category: z.enum(["clarity", "legal_risk", "compliance", "style", "error"]).optional(),
            priority: z.enum(["high", "medium", "low"]).optional(),
          }),
        )
        .min(1),
    }),
    scopes: allScopes,
    authorization: {
      kind: "checked",
      authorize: async (context, input) => authorizeDocument(context, input.doc_id, "suggest_edit"),
    },
    execute: executeSuggestEdit,
  }),
  tool({
    name: "list_workflows",
    description: "list workflows",
    inputSchema: z.object({}),
    scopes: allScopes,
    authorization: unrestricted,
    execute: executeListWorkflows,
  }),
  tool({
    name: "read_workflow",
    description: "read workflow",
    inputSchema: z.object({ workflow_id: z.string().min(1) }),
    scopes: allScopes,
    authorization: unrestricted,
    execute: executeReadWorkflow,
  }),
  tool({
    name: "list_documents",
    description: "list documents",
    inputSchema: z.object({}),
    scopes: ["project", "workspace"],
    authorization: unrestricted,
    execute: executeListDocuments,
  }),
  tool({
    name: "fetch_documents",
    description: "fetch documents",
    inputSchema: z.object({ doc_ids: z.array(z.string().min(1)).min(1) }),
    scopes: ["project", "workspace"],
    authorization: {
      kind: "checked",
      authorize: async (context, input) => {
        for (const id of input.doc_ids) {
          await authorizeDocument(context, id, "read_document");
        }
      },
    },
    execute: executeFetchDocuments,
  }),
  tool({
    name: "replicate_document",
    description: "Copy a project document while preserving its bytes.",
    inputSchema: z.object({
      doc_id: z.string().min(1),
      count: z.number().int().min(1).max(20).optional(),
      new_filename: z.string().optional(),
    }),
    scopes: ["project"],
    authorization: {
      kind: "checked",
      authorize: async (context, input) =>
        authorizeDocument(context, input.doc_id, "read_document"),
    },
    execute: executeReplicateDocument,
  }),
  tool({
    name: "read_table_cells",
    description: "Read extracted cells from a tabular review.",
    inputSchema: z.object({
      col_indices: z.array(z.number().int().nonnegative()).optional(),
      row_indices: z.array(z.number().int().nonnegative()).optional(),
    }),
    scopes: ["tabular"],
    authorization: unrestricted,
    execute: executeReadTableCells,
  }),
];

type RegisteredTool = Readonly<{
  name: string;
  scopes: readonly ToolScope["kind"][];
  run: (context: ToolExecutionContext, input: unknown) => Promise<ToolExecutorResult | void>;
}>;

export function createToolRegistry(definitions: readonly RegisteredTool[]) {
  const definitionsByName = new Map(definitions.map((definition) => [definition.name, definition]));
  if (definitionsByName.size !== definitions.length) {
    throw new Error("AI tool names must be unique.");
  }

  return {
    get(name: string) {
      return definitionsByName.get(name);
    },
    async execute(
      context: ToolExecutionContext,
      call: { id: string; name: string; input: unknown },
    ): Promise<ToolMessage> {
      context.write({
        type: "tool_call_start",
        tool_call_id: call.id,
        tool: call.name,
        name: call.name,
        input: call.input,
        status: "started",
      });

      try {
        context.signal.throwIfAborted();
        const definition = definitionsByName.get(call.name);
        if (!definition || !definition.scopes.includes(context.scope.kind)) {
          throw new Error(`Tool '${call.name}' is not available in ${context.scope.kind} scope.`);
        }
        const previousResultCount = context.events.toolResults.length;
        const returned = await definition.run(context, call.input);
        context.signal.throwIfAborted();
        const appendedResults = context.events.toolResults.splice(previousResultCount);
        if (appendedResults.length > 1) {
          throw new Error(`Tool '${call.name}' produced more than one result.`);
        }
        const appended = appendedResults[0];
        const content =
          returned?.content ??
          appended?.content ??
          (typeof returned?.output === "string"
            ? returned.output
            : JSON.stringify(returned?.output ?? null));
        let output = returned?.output;
        if (output === undefined && appended) {
          try {
            output = JSON.parse(appended.content);
          } catch {
            output = appended.content;
          }
        }
        if (output === undefined) {
          throw new Error(`Tool '${call.name}' did not return a result.`);
        }
        const status =
          returned?.status ??
          (typeof output === "object" &&
          output !== null &&
          (("ok" in output && output.ok === false) || "error" in output)
            ? "error"
            : "complete");
        context.write({
          type: "tool_result",
          tool_call_id: call.id,
          tool: call.name,
          output,
          status,
        });
        return { role: "tool", tool_call_id: call.id, content };
      } catch (error) {
        const output = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
        context.write({
          type: "tool_result",
          tool_call_id: call.id,
          tool: call.name,
          output,
          status: "error",
        });
        if (context.signal.aborted) throw error;
        return {
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(output),
        };
      }
    },
  };
}

export const toolRegistry = createToolRegistry(toolDefinitions);

export function getToolDefinitions(scope: ToolScope["kind"]) {
  return toolDefinitions.filter((definition) => definition.scopes.includes(scope));
}

export function getAiToolSchemas(scope: ToolScope["kind"]): OpenAIToolSchema[] {
  return getToolDefinitions(scope).map((definition) => ({
    type: "function",
    function: {
      name: definition.name,
      description: definition.description,
      parameters: { ...z.toJSONSchema(definition.inputSchema) },
    },
  }));
}
