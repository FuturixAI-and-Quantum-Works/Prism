import type { DocCreatedEvent, StreamEventWriter, TemplateWizardStartEvent } from "@prism/protocol";
import { getUserAiRuntime } from "../../lib/aiRegistry.js";
import type { SSEWriter } from "../../lib/sseHelpers.js";
import {
  createDocumentFromTemplate,
  normalizeTemplateFields,
  normalizeTemplateValues,
  type TemplateRecord,
} from "../../lib/templateDocuments.js";
import {
  advanceInterview,
  applySkip,
  cancelInterview,
  completeInterview,
  extractFieldAnswer,
  getNextQuestion,
  isInterviewComplete,
  saveInterviewState,
  type InterviewState,
} from "../../lib/templateInterview.js";
import { applyDisplayedItem } from "../ai/context/promptContext.js";
import { extractAnnotations } from "../ai/citations/citations.js";
import { buildMessages } from "../ai/prompts/chatPrompt.js";
import { runLLMStream } from "../ai/tools/runtimeCoordinator.js";
import type { ChatContextRepository } from "./chat.context.repository.js";
import { detectChatIntent } from "./chat.intent.js";
import type { DocumentCreator } from "../documents/documents.service.js";
import type {
  AssembledChatContext,
  ChatIntent,
  EphemeralRequest,
  HandlerOutcome,
} from "./chat.types.js";

const RAG_QUERY_PROMPT_EXTRA =
  "TURN ROUTING: The user is asking a source-backed search question. Use search_sources first with a focused query before answering, then cite document content when making factual claims.";

const DOCUMENT_EDIT_PROMPT_EXTRA =
  "TURN ROUTING: The user is asking to edit an existing document. Read or locate the relevant text first, then use edit_document for DOCX edits when an attached or scoped document is available.";

const PROJECT_WORKSPACE_PROMPT_EXTRA =
  "TURN ROUTING: The user is asking to create or manage an app project, matter, case folder, or workspace. Do NOT say you cannot create projects or workspaces. Use create_project when the user asks for a project/matter/case folder. Use create_workspace when the user asks for a workspace. After the tool succeeds, confirm the name and provide the app path when the tool returns one. Do not redirect the user to legal document drafting unless they ask for a legal document.";

const DOCUMENT_GENERATION_PROMPT_EXTRA =
  "TURN ROUTING: The user is asking to generate a legal document. Follow the DOCUMENT GENERATION doctrine exactly: call search_templates first, use fill_and_create for a suitable template after collecting missing required fields one at a time, and only use generate_docx if no suitable template exists.";

export class ChatAiExecution {
  constructor(
    private readonly contextRepository: Pick<ChatContextRepository, "enrichWithPriorEvents">,
    private readonly documentCreator: DocumentCreator,
  ) {}

  async prepareEphemeral(
    req: EphemeralRequest,
  ): Promise<(writer: SSEWriter, signal: AbortSignal) => Promise<void>> {
    const runtime = await getUserAiRuntime(req.userId);
    return async (writer, signal) => {
      await runLLMStream({
        apiMessages: req.messages.map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content ?? "",
        })),
        docStore: new Map(),
        docIndex: {},
        userId: req.userId,
        write: writer.event,
        signal,
        model: req.model,
        runtime,
        scope: { kind: "personal" },
        documentCreator: this.documentCreator,
      });
    };
  }

  async execute(
    context: AssembledChatContext,
    intent: ChatIntent,
    write: StreamEventWriter,
    signal: AbortSignal,
  ): Promise<HandlerOutcome> {
    if (intent.type === "fill_template_field" && context.interviewState) {
      return this.handleInterviewTurn(context, write, signal);
    }
    if (intent.type === "generate_document") {
      return this.handleDocumentGeneration(context, write, signal);
    }
    if (intent.type === "search_question") {
      return this.handleGeneralChat(context, write, signal, RAG_QUERY_PROMPT_EXTRA);
    }
    if (intent.type === "document_edit") {
      return this.handleGeneralChat(context, write, signal, DOCUMENT_EDIT_PROMPT_EXTRA);
    }
    if (intent.type === "project_workspace") {
      return this.handleGeneralChat(context, write, signal, PROJECT_WORKSPACE_PROMPT_EXTRA);
    }
    return this.handleGeneralChat(context, write, signal);
  }

  private async handleGeneralChat(
    context: AssembledChatContext,
    write: StreamEventWriter,
    signal: AbortSignal,
    promptExtra?: string,
  ): Promise<HandlerOutcome> {
    const apiMessages = await this.buildApiMessages(context, promptExtra);
    const { fullText, events } = await runLLMStream({
      apiMessages,
      docStore: context.docStore,
      docIndex: context.docIndex,
      userId: context.req.userId,
      userEmail: context.req.userEmail,
      write,
      scope:
        context.req.scope.type === "project"
          ? { kind: "project", projectId: context.req.scope.projectId }
          : context.req.scope.type === "workspace"
            ? { kind: "workspace", workspaceId: context.req.scope.workspaceId }
            : { kind: "personal" },
      workflowStore: context.workflowStore,
      model: context.req.model,
      runtime: context.aiRuntime,
      chatId: context.session.chatId,
      signal,
      documentCreator: this.documentCreator,
    });
    return {
      fullText,
      events,
      annotations: extractAnnotations(fullText, context.docIndex, events),
    };
  }

  private async handleDocumentGeneration(
    context: AssembledChatContext,
    write: StreamEventWriter,
    signal: AbortSignal,
  ): Promise<HandlerOutcome> {
    const template = selectTemplate(context.lastUser?.content ?? "", context.templates);
    if (!template) {
      return this.handleGeneralChat(context, write, signal, DOCUMENT_GENERATION_PROMPT_EXTRA);
    }
    const fields = normalizeTemplateFields(template.fields);
    const wizardEvent: TemplateWizardStartEvent = {
      type: "template_wizard_start",
      template_id: template.id,
      template_name: template.name,
      fields: fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options,
        placeholder: field.placeholder,
      })),
    };
    write(wizardEvent);
    const text = `I found ${template.name}. Please fill in the details below.`;
    write({ type: "content_delta", text });
    write({ type: "citations", citations: [] });
    return {
      fullText: text,
      events: [wizardEvent, { type: "content", text }],
    };
  }

  private async handleInterviewTurn(
    context: AssembledChatContext,
    write: StreamEventWriter,
    signal: AbortSignal,
  ): Promise<HandlerOutcome> {
    const state = context.interviewState;
    if (!state) return this.handleGeneralChat(context, write, signal);
    const message = (context.lastUser?.content ?? "").trim();
    if (
      /^(cancel|stop|never mind|nevermind|abort)(\s+(this|interview|template|draft))?[.!]?$/i.test(
        message,
      )
    ) {
      await cancelInterview(context.session.chatId);
      return contentOutcome(`Cancelled the ${state.templateName} interview.`, write);
    }
    if (/^(skip|skip this|skip it|pass)[.!]?$/i.test(message)) {
      const skipped = applySkip(state);
      if (skipped.required) {
        const question = getNextQuestion(state);
        return contentOutcome(
          question ? `That field is required. ${question}` : "That field is required.",
          write,
        );
      }
      const nextState = await saveInterviewState(context.session.chatId, skipped.state);
      return isInterviewComplete(nextState)
        ? this.completeInterview(context, nextState, write)
        : this.askNextInterviewField(nextState, write);
    }
    let nextState = state;
    const answers = extractFieldAnswer(nextState, message);
    for (const [fieldId, value] of Object.entries(answers)) {
      nextState = advanceInterview(nextState, fieldId, value);
    }
    if (Object.keys(answers).length === 0) {
      const question = getNextQuestion(state);
      return contentOutcome(
        question ? `I still need that value. ${question}` : "I still need that value.",
        write,
      );
    }
    nextState = await saveInterviewState(context.session.chatId, nextState);
    return isInterviewComplete(nextState)
      ? this.completeInterview(context, nextState, write)
      : this.askNextInterviewField(nextState, write);
  }

  private async completeInterview(
    context: AssembledChatContext,
    state: InterviewState,
    write: StreamEventWriter,
  ): Promise<HandlerOutcome> {
    const result = await createDocumentFromTemplate(
      this.documentCreator,
      { userId: context.req.userId, userEmail: context.req.userEmail },
      {
        templateId: state.templateId,
        values: normalizeTemplateValues(state.collectedValues),
        projectId: context.session.projectId,
        workspaceId: context.session.workspaceId,
      },
    );
    await completeInterview(context.session.chatId, state, result.doc.id);
    const event: DocCreatedEvent = {
      type: "doc_created",
      filename: result.doc.filename,
      download_url: result.downloadUrl,
      document_id: result.doc.id,
      version_id: result.doc.current_version_id,
      version_number: result.doc.active_version_number ?? null,
    };
    const text = `Created ${result.doc.filename} from ${result.template.name}.`;
    write(event);
    write({ type: "content_delta", text });
    write({ type: "citations", citations: [] });
    return {
      fullText: text,
      events: [event, { type: "content", text }],
    };
  }

  private askNextInterviewField(state: InterviewState, write: StreamEventWriter): HandlerOutcome {
    const question = getNextQuestion(state);
    if (!question) throw new Error("Template interview has no missing field to ask for.");
    return contentOutcome(`To create ${state.templateName}, ${question}`, write);
  }

  private async buildApiMessages(context: AssembledChatContext, promptExtra?: string) {
    const availability = Object.entries(context.docIndex).map(([doc_id, info]) => ({
      doc_id,
      filename: info.filename,
      lifecycle_status: info.lifecycle_status,
      folder_path: context.folderPaths.get(doc_id),
    }));
    const enriched = await this.contextRepository.enrichWithPriorEvents(
      context.req.messages,
      context.session.chatId,
      context.docIndex,
    );
    const messages = applyDisplayedItem(context.req.scope, context.req.displayedItem, enriched);
    const systemPromptExtra = [context.baseSystemPromptExtra, promptExtra]
      .filter(Boolean)
      .join("\n\n");
    return buildMessages(messages, availability, systemPromptExtra, context.docIndex);
  }
}

function contentOutcome(text: string, write: StreamEventWriter): HandlerOutcome {
  write({ type: "content_delta", text });
  write({ type: "citations", citations: [] });
  return {
    fullText: text,
    events: [{ type: "content", text }],
  };
}

function selectTemplate(message: string, templates: TemplateRecord[]): TemplateRecord | null {
  const normalizedMessage = normalizeSearchText(message);
  const messageTokens = new Set(normalizedMessage.split(" ").filter(Boolean));
  const explicit = templates.find((template) => {
    const name = normalizeSearchText(template.name);
    return (
      message.toLowerCase().includes(template.id.toLowerCase()) ||
      Boolean(name && normalizedMessage.includes(name))
    );
  });
  if (explicit) return explicit;
  const wantsTemplate = /\b(template|form|precedent)\b/i.test(message);
  const wantsGeneration = detectChatIntent(message).type === "generate_document";
  let best: { template: TemplateRecord; score: number } | null = null;
  for (const template of templates) {
    const tokens = normalizeSearchText(`${template.name} ${template.category ?? ""}`)
      .split(" ")
      .filter((token) => token.length > 2 && !isGenericTemplateToken(token));
    if (tokens.length === 0) continue;
    const hits = tokens.filter((token) => messageTokens.has(token));
    const acronymHit = tokens.some((token) => token.length <= 4 && messageTokens.has(token));
    const score = hits.length / tokens.length + (acronymHit ? 0.4 : 0);
    if (!best || score > best.score) best = { template, score };
  }
  if (!best) return null;
  if (wantsTemplate && best.score >= 0.35) return best.template;
  if (wantsGeneration && best.score >= 0.5) return best.template;
  return null;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericTemplateToken(token: string): boolean {
  return [
    "agreement",
    "contract",
    "document",
    "template",
    "form",
    "legal",
    "the",
    "and",
    "for",
  ].includes(token);
}
