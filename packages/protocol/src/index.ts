export * from "./citations.js";

export type TemplateWizardField = {
  id: string;
  label: string;
  type?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

export type ChatSourceResult = {
  rank?: number;
  source_id?: string | null;
  source_type?: string | null;
  version_id?: string;
  filename?: string;
  mime_type?: string | null;
  scope_type?: string;
  page_number?: number | null;
  text?: string;
  document_context?: string | null;
  score?: number | null;
  document_url?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isString = (value: unknown) => typeof value === "string";
const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const isOptionalString = (value: unknown) => value === undefined || isString(value);
const hasText = (event: Record<string, unknown>) => isString(event.text);
const hasFilename = (event: Record<string, unknown>) => isString(event.filename);
const hasDocumentCell = (event: Record<string, unknown>) =>
  isString(event.document_id) && isNumber(event.column_index);
const hasRule = (event: Record<string, unknown>) => isString(event.rule_id);
const hasQuestion = (event: Record<string, unknown>) => isString(event.question_id);
const inSet = <Value extends string>(value: unknown, values: readonly Value[]) =>
  typeof value === "string" && values.some((candidate) => candidate === value);
const isOptionalNumber = (value: unknown) => value === undefined || isNumber(value);
const isOptionalNullableString = (value: unknown) =>
  value === undefined || value === null || isString(value);
const isOptionalNullableNumber = (value: unknown) =>
  value === undefined || value === null || isNumber(value);
const isStringArray = (value: unknown) => Array.isArray(value) && value.every(isString);
const hasOnlyOptionalStrings = (event: Record<string, unknown>, fields: string[]) =>
  fields.every((field) => isOptionalString(event[field]));
const isChatSourceResult = (value: unknown): value is ChatSourceResult =>
  isRecord(value) &&
  hasOnlyOptionalStrings(value, ["version_id", "filename", "scope_type", "text"]) &&
  ["source_id", "source_type", "mime_type", "document_context", "document_url"].every((field) =>
    isOptionalNullableString(value[field]),
  ) &&
  isOptionalNumber(value.rank) &&
  isOptionalNullableNumber(value.page_number) &&
  isOptionalNullableNumber(value.score);

type Family = "chat" | "tabular-generate" | "compliance";
type Validator<Payload> = (value: unknown) => value is Payload;
type ToolCallPayload = {
  tool_call_id?: string;
  tool: string;
  name?: string;
  input?: unknown;
  status?: string;
};

function dataEvent<const Families extends readonly Family[], Payload>(
  families: Families,
  validate: Validator<Payload>,
) {
  return { families, validate };
}

function terminalEvent<
  const Families extends readonly Family[],
  const Terminal extends "success" | "error",
  Payload,
>(families: Families, terminal: Terminal, validate: Validator<Payload>) {
  return { families, terminal, validate };
}

const isToolCallPayload: Validator<ToolCallPayload> = (value): value is ToolCallPayload =>
  isRecord(value) &&
  isString(value.tool) &&
  hasOnlyOptionalStrings(value, ["tool_call_id", "name", "status"]);

const streamEventRegistry = {
  chat_id: dataEvent(["chat"], (value): value is { chatId: string } => {
    return isRecord(value) && isString(value.chatId);
  }),
  chat_title: dataEvent(["chat"], (value): value is { chatId: string; title: string } => {
    return isRecord(value) && isString(value.chatId) && isString(value.title);
  }),
  text_delta: dataEvent(["chat"], (value): value is { text: string } => {
    return isRecord(value) && hasText(value);
  }),
  content_delta: dataEvent(["chat"], (value): value is { text: string } => {
    return isRecord(value) && hasText(value);
  }),
  reasoning_delta: dataEvent(["chat"], (value): value is { text: string } => {
    return isRecord(value) && hasText(value);
  }),
  reasoning_block_end: dataEvent(["chat"], (value): value is Record<never, never> => {
    return isRecord(value);
  }),
  tool_call: dataEvent(["chat"], isToolCallPayload),
  tool_call_start: dataEvent(["chat"], isToolCallPayload),
  tool_result: dataEvent(
    ["chat"],
    (
      value,
    ): value is {
      tool_call_id?: string;
      tool: string;
      output: unknown;
      status?: string;
    } => {
      return (
        isRecord(value) &&
        isString(value.tool) &&
        "output" in value &&
        hasOnlyOptionalStrings(value, ["tool_call_id", "status"])
      );
    },
  ),
  source_results: dataEvent(
    ["chat"],
    (
      value,
    ): value is {
      tool_call_id?: string;
      query?: string;
      scope?: unknown;
      results: ChatSourceResult[];
      count?: number;
    } => {
      return (
        isRecord(value) &&
        Array.isArray(value.results) &&
        value.results.every(isChatSourceResult) &&
        hasOnlyOptionalStrings(value, ["tool_call_id", "query"]) &&
        isOptionalNumber(value.count)
      );
    },
  ),
  citations: dataEvent(["chat"], (value): value is { citations: unknown[] } => {
    return isRecord(value) && Array.isArray(value.citations);
  }),
  done: terminalEvent(
    ["chat", "tabular-generate", "compliance"],
    "success",
    (value): value is Record<never, never> => isRecord(value),
  ),
  error: terminalEvent(
    ["chat", "tabular-generate", "compliance"],
    "error",
    (value): value is { message: string } => isRecord(value) && isString(value.message),
  ),
  workspace_created: dataEvent(
    ["chat"],
    (value): value is { workspace_id: string; name: string } =>
      isRecord(value) && isString(value.workspace_id) && isString(value.name),
  ),
  project_created: dataEvent(
    ["chat"],
    (value): value is { project_id: string; name: string } =>
      isRecord(value) && isString(value.project_id) && isString(value.name),
  ),
  template_wizard_start: dataEvent(
    ["chat"],
    (
      value,
    ): value is {
      template_id: string | null;
      template_name: string;
      fields: TemplateWizardField[];
    } =>
      isRecord(value) &&
      (value.template_id === null || isString(value.template_id)) &&
      isString(value.template_name) &&
      Array.isArray(value.fields) &&
      value.fields.every(
        (field) =>
          isRecord(field) &&
          isString(field.id) &&
          isString(field.label) &&
          typeof field.required === "boolean" &&
          isOptionalString(field.type) &&
          isOptionalString(field.placeholder) &&
          (field.options === undefined || isStringArray(field.options)),
      ),
  ),
  doc_read_start: dataEvent(
    ["chat"],
    (value): value is { filename: string; document_id?: string } =>
      isRecord(value) && hasFilename(value) && isOptionalString(value.document_id),
  ),
  doc_read: dataEvent(
    ["chat"],
    (value): value is { filename: string; document_id?: string } =>
      isRecord(value) && hasFilename(value) && isOptionalString(value.document_id),
  ),
  doc_read_failed: dataEvent(
    ["chat"],
    (
      value,
    ): value is {
      doc_id: string;
      filename?: string;
      document_id?: string;
      reason: "not_found" | "download_failed" | "decode_failed";
      error: string;
    } =>
      isRecord(value) &&
      isString(value.doc_id) &&
      hasOnlyOptionalStrings(value, ["filename", "document_id"]) &&
      inSet(value.reason, ["not_found", "download_failed", "decode_failed"]) &&
      isString(value.error),
  ),
  doc_find_start: dataEvent(
    ["chat"],
    (value): value is { filename: string; query?: string } =>
      isRecord(value) && hasFilename(value) && isOptionalString(value.query),
  ),
  doc_find: dataEvent(
    ["chat"],
    (
      value,
    ): value is {
      filename: string;
      query?: string;
      document_id?: string;
      total_matches?: number;
    } =>
      isRecord(value) &&
      hasFilename(value) &&
      hasOnlyOptionalStrings(value, ["query", "document_id"]) &&
      isOptionalNumber(value.total_matches),
  ),
  doc_created_start: dataEvent(
    ["chat"],
    (value): value is { filename: string } => isRecord(value) && hasFilename(value),
  ),
  doc_created: dataEvent(
    ["chat"],
    (
      value,
    ): value is {
      filename: string;
      document_id?: string;
      download_url?: string;
      version_id?: string | null;
      version_number?: number | null;
    } =>
      isRecord(value) &&
      hasFilename(value) &&
      hasOnlyOptionalStrings(value, ["document_id", "download_url"]) &&
      isOptionalNullableString(value.version_id) &&
      isOptionalNullableNumber(value.version_number),
  ),
  doc_edited_start: dataEvent(
    ["chat"],
    (value): value is { filename: string } => isRecord(value) && hasFilename(value),
  ),
  doc_edited: dataEvent(
    ["chat"],
    (
      value,
    ): value is {
      filename: string;
      document_id?: string;
      edit_id?: string;
      version_id?: string;
      version_number?: number | null;
      download_url?: string;
      annotations?: unknown[];
      error?: string;
    } =>
      isRecord(value) &&
      hasFilename(value) &&
      hasOnlyOptionalStrings(value, [
        "document_id",
        "edit_id",
        "version_id",
        "download_url",
        "error",
      ]) &&
      isOptionalNullableNumber(value.version_number) &&
      (value.annotations === undefined || Array.isArray(value.annotations)),
  ),
  doc_replicate_start: dataEvent(
    ["chat"],
    (value): value is { filename: string; count?: number } =>
      isRecord(value) && hasFilename(value) && isOptionalNumber(value.count),
  ),
  doc_replicated: dataEvent(
    ["chat"],
    (
      value,
    ): value is {
      filename: string;
      document_id?: string;
      count?: number;
      copies?: Array<{
        filename?: string;
        new_filename?: string;
        document_id: string;
        version_id?: string;
      }>;
      error?: string;
    } =>
      isRecord(value) &&
      hasFilename(value) &&
      hasOnlyOptionalStrings(value, ["document_id", "error"]) &&
      isOptionalNumber(value.count) &&
      (value.copies === undefined ||
        (Array.isArray(value.copies) &&
          value.copies.every(
            (copy) =>
              isRecord(copy) &&
              isString(copy.document_id) &&
              hasOnlyOptionalStrings(copy, ["filename", "new_filename", "version_id"]),
          ))),
  ),
  workflow_applied: dataEvent(
    ["chat"],
    (value): value is { workflow_id: string; title: string } =>
      isRecord(value) && isString(value.workflow_id) && isString(value.title),
  ),
  cell_update: dataEvent(
    ["tabular-generate"],
    (
      value,
    ): value is {
      document_id: string;
      column_index: number;
      content: {
        summary?: string;
        flag?: "green" | "grey" | "yellow" | "red";
        reasoning?: string;
      } | null;
      status: "generating" | "done" | "error";
    } =>
      isRecord(value) &&
      hasDocumentCell(value) &&
      inSet(value.status, ["generating", "done", "error"]) &&
      (value.content === null ||
        (isRecord(value.content) &&
          hasOnlyOptionalStrings(value.content, ["summary", "reasoning"]) &&
          (value.content.flag === undefined ||
            inSet(value.content.flag, ["green", "grey", "yellow", "red"])))),
  ),
  cell_start: dataEvent(
    ["tabular-generate"],
    (value): value is { document_id: string; column_index: number } =>
      isRecord(value) && hasDocumentCell(value),
  ),
  cell_delta: dataEvent(
    ["tabular-generate"],
    (value): value is { document_id: string; column_index: number; text: string } =>
      isRecord(value) && hasDocumentCell(value) && isString(value.text),
  ),
  status: dataEvent(
    ["compliance"],
    (value): value is { status: "running" | "completed" | "failed" } =>
      isRecord(value) && inSet(value.status, ["running", "completed", "failed"]),
  ),
  rule_start: dataEvent(
    ["compliance"],
    (value): value is { rule_id: string } => isRecord(value) && hasRule(value),
  ),
  rule_delta: dataEvent(
    ["compliance"],
    (value): value is { rule_id: string; text: string } =>
      isRecord(value) && hasRule(value) && isString(value.text),
  ),
  rule_result: dataEvent(
    ["compliance"],
    (
      value,
    ): value is {
      rule_id: string;
      result: { summary?: string; reasoning?: string; citations?: unknown[] };
      status: "compliant" | "non_compliant" | "partial";
    } =>
      isRecord(value) &&
      hasRule(value) &&
      isRecord(value.result) &&
      hasOnlyOptionalStrings(value.result, ["summary", "reasoning"]) &&
      (value.result.citations === undefined || Array.isArray(value.result.citations)) &&
      inSet(value.status, ["compliant", "non_compliant", "partial"]),
  ),
  rule_error: dataEvent(
    ["compliance"],
    (value): value is { rule_id: string; error: string } =>
      isRecord(value) && hasRule(value) && isString(value.error),
  ),
  question_start: dataEvent(
    ["compliance"],
    (value): value is { question_id: string } => isRecord(value) && hasQuestion(value),
  ),
  question_delta: dataEvent(
    ["compliance"],
    (value): value is { question_id: string; text: string } =>
      isRecord(value) && hasQuestion(value) && isString(value.text),
  ),
  question_result: dataEvent(
    ["compliance"],
    (
      value,
    ): value is {
      question_id: string;
      result: { answer?: string; reasoning?: string; citations?: unknown[] };
      status?: "compliant" | "non_compliant" | "partial";
    } =>
      isRecord(value) &&
      hasQuestion(value) &&
      isRecord(value.result) &&
      hasOnlyOptionalStrings(value.result, ["answer", "reasoning"]) &&
      (value.result.citations === undefined || Array.isArray(value.result.citations)) &&
      (value.status === undefined ||
        inSet(value.status, ["compliant", "non_compliant", "partial"])),
  ),
  question_error: dataEvent(
    ["compliance"],
    (value): value is { question_id: string; error: string } =>
      isRecord(value) && hasQuestion(value) && isString(value.error),
  ),
  insights_start: dataEvent(["compliance"], (value): value is Record<never, never> =>
    isRecord(value),
  ),
  insights_result: dataEvent(
    ["compliance"],
    (value): value is { insights: string[] } => isRecord(value) && isStringArray(value.insights),
  ),
  summary: dataEvent(
    ["compliance"],
    (
      value,
    ): value is {
      compliance_score: number | null;
      critical_issues: number;
      pending_items: number;
      resolved_issues: number;
      partial_issues?: number;
      compliant_rules?: number;
      total_rules?: number;
      total_questions?: number;
      errors?: number;
      ai_insights?: string[];
    } =>
      isRecord(value) &&
      (value.compliance_score === null || isNumber(value.compliance_score)) &&
      isNumber(value.critical_issues) &&
      isNumber(value.pending_items) &&
      isNumber(value.resolved_issues) &&
      ["partial_issues", "compliant_rules", "total_rules", "total_questions", "errors"].every(
        (field) => isOptionalNumber(value[field]),
      ) &&
      (value.ai_insights === undefined || isStringArray(value.ai_insights)),
  ),
  clause_validation: dataEvent(
    ["compliance"],
    (
      value,
    ): value is {
      clause_id?: string;
      clause: string;
      status: "valid" | "invalid" | "warning";
      details: string;
    } =>
      isRecord(value) &&
      isOptionalString(value.clause_id) &&
      isString(value.clause) &&
      inSet(value.status, ["valid", "invalid", "warning"]) &&
      isString(value.details),
  ),
  recommendation: dataEvent(
    ["compliance"],
    (
      value,
    ): value is {
      recommendation_id?: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
    } =>
      isRecord(value) &&
      isOptionalString(value.recommendation_id) &&
      isString(value.title) &&
      isString(value.description) &&
      inSet(value.priority, ["high", "medium", "low"]),
  ),
  activity: dataEvent(
    ["compliance"],
    (
      value,
    ): value is {
      activity_id?: string;
      action: string;
      timestamp: string;
      user: string;
    } =>
      isRecord(value) &&
      isOptionalString(value.activity_id) &&
      isString(value.action) &&
      isString(value.timestamp) &&
      isString(value.user),
  ),
} as const;

type StreamEventRegistry = typeof streamEventRegistry;
type EventType = keyof StreamEventRegistry;
const streamEventDefinitions: Readonly<Record<string, { validate: (value: unknown) => boolean }>> =
  streamEventRegistry;
type Payload<Type extends EventType> =
  StreamEventRegistry[Type]["validate"] extends Validator<infer Value> ? Value : never;

export type StreamEvent = {
  [Type in EventType]: { type: Type } & Payload<Type>;
}[EventType];

type EventOf<Type extends EventType> = Extract<StreamEvent, { type: Type }>;
type EventInFamily<SelectedFamily extends Family> = {
  [Type in EventType]: SelectedFamily extends StreamEventRegistry[Type]["families"][number]
    ? EventOf<Type>
    : never;
}[EventType];

export type ChatStreamEvent = EventInFamily<"chat">;
export type TabularGenerateEvent = EventInFamily<"tabular-generate">;
export type TabularChatEvent = ChatStreamEvent;
export type ComplianceRunEvent = EventInFamily<"compliance">;
export type StreamTerminalEvent = Extract<StreamEvent, { type: "done" | "error" }>;
export type StreamDataEvent = Exclude<StreamEvent, StreamTerminalEvent>;
export type StreamEventWriter = (event: StreamDataEvent) => void;

export type ChatIdEvent = EventOf<"chat_id">;
export type ChatTitleEvent = EventOf<"chat_title">;
export type TextDeltaEvent = EventOf<"text_delta"> | EventOf<"content_delta">;
export type ReasoningDeltaEvent = EventOf<"reasoning_delta">;
export type ReasoningBlockEndEvent = EventOf<"reasoning_block_end">;
export type ToolCallEvent = EventOf<"tool_call"> | EventOf<"tool_call_start">;
export type ToolResultEvent = EventOf<"tool_result">;
export type SourceResultsEvent = EventOf<"source_results">;
export type CitationsEvent = EventOf<"citations">;
export type DoneEvent = EventOf<"done">;
export type ErrorEvent = EventOf<"error">;
export type WorkspaceCreatedEvent = EventOf<"workspace_created">;
export type ProjectCreatedEvent = EventOf<"project_created">;
export type TemplateWizardStartEvent = EventOf<"template_wizard_start">;
export type DocReadStartEvent = EventOf<"doc_read_start">;
export type DocReadEvent = EventOf<"doc_read">;
export type DocReadFailedEvent = EventOf<"doc_read_failed">;
export type DocReadFailureReason = DocReadFailedEvent["reason"];
export type DocFindStartEvent = EventOf<"doc_find_start">;
export type DocFindEvent = EventOf<"doc_find">;
export type DocCreatedStartEvent = EventOf<"doc_created_start">;
export type DocCreatedEvent = EventOf<"doc_created">;
export type DocEditedStartEvent = EventOf<"doc_edited_start">;
export type DocEditedEvent = EventOf<"doc_edited">;
export type DocReplicateStartEvent = EventOf<"doc_replicate_start">;
export type DocReplicatedEvent = EventOf<"doc_replicated">;
export type WorkflowAppliedEvent = EventOf<"workflow_applied">;
export type CellUpdateEvent = EventOf<"cell_update">;
export type CellStartEvent = EventOf<"cell_start">;
export type CellDeltaEvent = EventOf<"cell_delta">;
export type ComplianceStatusEvent = EventOf<"status">;
export type RuleStartEvent = EventOf<"rule_start">;
export type RuleDeltaEvent = EventOf<"rule_delta">;
export type RuleResultEvent = EventOf<"rule_result">;
export type RuleErrorEvent = EventOf<"rule_error">;
export type QuestionStartEvent = EventOf<"question_start">;
export type QuestionDeltaEvent = EventOf<"question_delta">;
export type QuestionResultEvent = EventOf<"question_result">;
export type QuestionErrorEvent = EventOf<"question_error">;
export type InsightsStartEvent = EventOf<"insights_start">;
export type InsightsResultEvent = EventOf<"insights_result">;
export type SummaryEvent = EventOf<"summary">;
export type ClauseValidationEvent = EventOf<"clause_validation">;
export type RecommendationEvent = EventOf<"recommendation">;
export type ActivityEvent = EventOf<"activity">;

export function isStreamEvent(value: unknown): value is StreamEvent {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  const definition = streamEventDefinitions[value.type];
  return definition?.validate(value) ?? false;
}

export function parseStreamEvent(value: unknown): StreamEvent {
  if (!isStreamEvent(value)) {
    throw new TypeError("Unknown stream event");
  }
  return value;
}

function eventHasFamily(event: StreamEvent, family: Family): boolean {
  const definition: { families: readonly Family[] } = streamEventRegistry[event.type];
  return definition.families.includes(family);
}

export function isChatStreamEvent(event: StreamEvent): event is ChatStreamEvent {
  return eventHasFamily(event, "chat");
}

export function isTabularGenerateEvent(event: StreamEvent): event is TabularGenerateEvent {
  return eventHasFamily(event, "tabular-generate");
}

export function isTabularChatEvent(event: StreamEvent): event is TabularChatEvent {
  return isChatStreamEvent(event);
}

export function isComplianceRunEvent(event: StreamEvent): event is ComplianceRunEvent {
  return eventHasFamily(event, "compliance");
}

export function getStreamTerminalKind(event: StreamEvent): "success" | "error" | undefined {
  const definition = streamEventRegistry[event.type];
  return "terminal" in definition ? definition.terminal : undefined;
}

export function isStreamTerminalEvent(event: StreamEvent): event is StreamTerminalEvent {
  return getStreamTerminalKind(event) !== undefined;
}
