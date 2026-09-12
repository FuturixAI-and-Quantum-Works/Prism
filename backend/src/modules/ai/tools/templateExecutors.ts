import { and, eq, ilike, or } from "drizzle-orm";
import type { DocCreatedEvent, TemplateWizardStartEvent } from "@prism/protocol";
import { db, templates as templatesTable } from "../../../db/index.js";
import {
  createDocumentFromTemplate,
  getMissingRequiredTemplateFields,
  isMissingTemplateFieldsError,
  loadAccessibleTemplate,
  normalizeTemplateValues,
} from "../../../lib/templateDocuments.js";
import { completeActiveInterview } from "../../../lib/templateInterview.js";
import { registerCreatedDocumentInTurn } from "./turnState.js";
import type { ToolExecutionContext, ToolExecutorResult } from "./types.js";

export async function executeSearchTemplates(
  context: ToolExecutionContext,
  input: { query: string },
): Promise<ToolExecutorResult> {
  const query = input.query.trim();
  const matchingTemplates = query
    ? await db
        .select()
        .from(templatesTable)
        .where(
          and(
            or(
              eq(templatesTable.isCreatedByUser, false),
              and(
                eq(templatesTable.isCreatedByUser, true),
                eq(templatesTable.userId, context.user.id),
              ),
            ),
            or(
              ilike(templatesTable.name, `%${query}%`),
              ilike(templatesTable.description, `%${query}%`),
              ilike(templatesTable.category, `%${query}%`),
            ),
          ),
        )
        .limit(5)
    : [];
  const output = matchingTemplates.length
    ? {
        found: true,
        templates: matchingTemplates.map((template) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          fields: Array.isArray(template.fields) ? template.fields : [],
          hasDocxSource: !!template.sourceStoragePath,
        })),
      }
    : { found: false };
  return { output };
}

export async function executeFillAndCreate(
  context: ToolExecutionContext,
  input: { template_id: string; values: Record<string, string>; filename?: string },
): Promise<ToolExecutorResult> {
  const templateId = input.template_id.trim();
  const values = normalizeTemplateValues(input.values);
  const filename = input.filename?.trim();
  if (!templateId) {
    const output = {
      ok: false,
      error: "template_id is required",
    };
    return { output, status: "error" };
  }
  try {
    const template = await loadAccessibleTemplate(templateId, context.user.id);
    if (!template) {
      const output = {
        ok: false,
        error: "Template not found",
      };
      return { output, status: "error" };
    }
    const missingFields = getMissingRequiredTemplateFields(template, values);
    if (missingFields.length) {
      const output = {
        ok: false,
        error: "Missing required template fields",
        missing_fields: missingFields,
      };
      return { output, status: "error" };
    }
    const previewFilename = `${
      (filename || template.name || "document")
        .replace(/[^a-zA-Z0-9 _.-]/g, "")
        .trim()
        .slice(0, 64) || "document"
    }${(filename || "").toLowerCase().endsWith(".docx") ? "" : ".docx"}`;
    context.write({
      type: "doc_created_start",
      filename: previewFilename,
    });
    const result = await createDocumentFromTemplate(
      context.documentCreator,
      { userId: context.user.id, userEmail: context.user.email },
      {
        templateId,
        values,
        filename,
        projectId:
          context.scope.kind === "project" || context.scope.kind === "tabular"
            ? context.scope.projectId
            : null,
        workspaceId: context.scope.kind === "workspace" ? context.scope.workspaceId : null,
      },
    );
    const documentId = result.doc.id;
    const versionId = result.doc.current_version_id ?? undefined;
    const versionNumber =
      result.doc.active_version_number ?? result.doc.latest_version_number ?? null;
    const storagePath = result.doc.storage_path ?? undefined;
    const docLabel = registerCreatedDocumentInTurn(
      context.documents.index,
      context.documents.store,
      {
        documentId,
        filename: result.doc.filename,
        storagePath,
        fileType: result.doc.file_type ?? "docx",
        versionId,
        versionNumber,
      },
    );
    const docEvent: DocCreatedEvent = {
      type: "doc_created",
      filename: result.doc.filename,
      download_url: result.downloadUrl,
      document_id: documentId,
      version_id: versionId,
      version_number: versionNumber,
    };
    context.write(docEvent);
    context.events.docsCreated.push({
      filename: result.doc.filename,
      download_url: result.downloadUrl,
      document_id: documentId,
      version_id: versionId,
      version_number: versionNumber,
    });
    if (context.chatId) {
      await completeActiveInterview(context.chatId, documentId);
    }
    const output = {
      ok: true,
      template_id: result.template.id,
      template_name: result.template.name,
      filename: result.doc.filename,
      download_url: result.downloadUrl,
      document_id: documentId,
      version_id: versionId,
      version_number: versionNumber,
      doc_id: docLabel,
      replacements: result.replacements ?? null,
      next_required_action: docLabel
        ? `Before writing your final response, call read_document with doc_id "${docLabel}". Describe and cite the created document using doc_id "${docLabel}", not the template id.`
        : "Before writing your final response, describe the created document by filename.",
    };
    return { output };
  } catch (error) {
    const output = isMissingTemplateFieldsError(error)
      ? {
          ok: false,
          error: error.message,
          missing_fields: error.missingFields,
        }
      : {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
    return { output, status: "error" };
  }
}

export async function executeStartDocumentWizard(
  context: ToolExecutionContext,
  input: {
    document_type: string;
    fields: {
      id: string;
      label: string;
      type?: "text" | "date" | "number" | "textarea";
      required: boolean;
      options?: string[];
      placeholder?: string;
    }[];
  },
): Promise<ToolExecutorResult> {
  const documentType = input.document_type.trim();
  const fields = input.fields;
  const wizardEvent: TemplateWizardStartEvent = {
    type: "template_wizard_start",
    template_id: null,
    template_name: documentType,
    fields: fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type ?? "text",
      required: field.required,
      options: field.options,
      placeholder: field.placeholder,
    })),
  };
  context.write(wizardEvent);
  const output = {
    ok: true,
    message:
      "Wizard started. The user will fill in the form and the document will be created automatically.",
    fields_count: fields.length,
  };
  return { output };
}
