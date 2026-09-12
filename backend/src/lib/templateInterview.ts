import { eq } from "drizzle-orm";
import { chatInterviewState, db } from "../db/index.js";
import type { NormalizedTemplateField } from "./templateDocuments.js";

export type TemplateField = NormalizedTemplateField;

export type InterviewStatus = "active" | "completed" | "cancelled";

export type InterviewState = {
  chatId: string;
  templateId: string;
  templateName: string;
  fields: TemplateField[];
  collectedValues: Record<string, string>;
  currentFieldIndex: number;
  status: InterviewStatus;
  createdDocumentId?: string | null;
  updatedAt: string;
};

type ExtractOptions = {
  allowCurrentFieldFallback?: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeFieldName(value: string): string {
  return value
    .replace(/[{}]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function hasRequiredValue(state: InterviewState, field: TemplateField): boolean {
  return !!state.collectedValues[field.id]?.trim();
}

function hasOptionalValueOrSkip(state: InterviewState, field: TemplateField): boolean {
  return Object.prototype.hasOwnProperty.call(state.collectedValues, field.id);
}

export function getNextField(state: InterviewState): TemplateField | null {
  return (
    state.fields.find((field) => field.required && !hasRequiredValue(state, field)) ??
    state.fields.find((field) => !field.required && !hasOptionalValueOrSkip(state, field)) ??
    null
  );
}

function currentIndexFor(state: InterviewState): number {
  const field = getNextField(state);
  return field
    ? state.fields.findIndex((candidate) => candidate.id === field.id)
    : state.fields.length;
}

export function buildFieldQuestion(field: TemplateField): string {
  const base = `What is the ${field.label.toLowerCase()}?`;
  const options = field.options?.length ? ` Options: ${field.options.join(", ")}.` : "";
  const hint = field.type?.toLowerCase() === "date" ? " (e.g. 1 January 2025)" : "";
  const optional = field.required ? "" : " You can say skip.";
  return `${base}${hint}${options}${optional}`;
}

export function getNextQuestion(state: InterviewState): string | null {
  const field = getNextField(state);
  return field ? buildFieldQuestion(field) : null;
}

export function isInterviewComplete(state: InterviewState): boolean {
  return getNextField(state) === null;
}

export function advanceInterview(
  state: InterviewState,
  fieldId: string,
  value: string,
): InterviewState {
  const nextState: InterviewState = {
    ...state,
    collectedValues: {
      ...state.collectedValues,
      [fieldId]: value,
    },
    updatedAt: nowIso(),
  };
  return {
    ...nextState,
    currentFieldIndex: currentIndexFor(nextState),
  };
}

export function applySkip(state: InterviewState): {
  state: InterviewState;
  skipped: boolean;
  required: boolean;
  field: TemplateField | null;
} {
  const field = getNextField(state);
  if (!field) return { state, skipped: false, required: false, field: null };
  if (field.required) return { state, skipped: false, required: true, field };
  return {
    state: advanceInterview(state, field.id, ""),
    skipped: true,
    required: false,
    field,
  };
}

export function extractFieldAnswer(
  state: InterviewState,
  message: string,
  options: ExtractOptions = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  const fieldByName = new Map<string, TemplateField>();
  for (const field of state.fields) {
    fieldByName.set(normalizeFieldName(field.id), field);
    fieldByName.set(normalizeFieldName(field.label), field);
    if (field.placeholder) {
      fieldByName.set(normalizeFieldName(field.placeholder), field);
    }
  }

  for (const line of message.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:=]{2,100})\s*[:=]\s*(.+?)\s*$/);
    if (!match) continue;
    const field = fieldByName.get(normalizeFieldName(match[1]));
    if (field) out[field.id] = match[2].trim();
  }

  const trimmed = message.trim();
  if (Object.keys(out).length === 0 && options.allowCurrentFieldFallback !== false && trimmed) {
    const field = getNextField(state);
    if (field) out[field.id] = trimmed;
  }
  return out;
}

export async function saveInterviewState(
  chatId: string,
  state: InterviewState,
): Promise<InterviewState> {
  const storedState = { ...state, chatId, updatedAt: nowIso() };
  await db
    .insert(chatInterviewState)
    .values({
      chatId,
      state: storedState,
      status: storedState.status,
      updatedAt: new Date(storedState.updatedAt),
    })
    .onConflictDoUpdate({
      target: chatInterviewState.chatId,
      set: {
        state: storedState,
        status: storedState.status,
        updatedAt: new Date(storedState.updatedAt),
      },
    });
  return storedState;
}

function isInterviewState(value: unknown): value is InterviewState {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof Reflect.get(value, "chatId") === "string" &&
    typeof Reflect.get(value, "templateId") === "string" &&
    typeof Reflect.get(value, "templateName") === "string" &&
    Array.isArray(Reflect.get(value, "fields")) &&
    typeof Reflect.get(value, "collectedValues") === "object"
  );
}

export async function loadActiveInterview(chatId: string): Promise<InterviewState | null> {
  const [row] = await db
    .select({ state: chatInterviewState.state, status: chatInterviewState.status })
    .from(chatInterviewState)
    .where(eq(chatInterviewState.chatId, chatId))
    .limit(1);
  if (!row || row.status !== "active" || !isInterviewState(row.state)) {
    return null;
  }
  return row.state;
}

export async function cancelInterview(chatId: string): Promise<InterviewState | null> {
  const current = await loadActiveInterview(chatId);
  if (!current) return null;
  return saveInterviewState(chatId, {
    ...current,
    status: "cancelled",
    updatedAt: nowIso(),
  });
}

export async function completeInterview(
  chatId: string,
  state: InterviewState,
  createdDocumentId: string,
): Promise<InterviewState> {
  return saveInterviewState(chatId, {
    ...state,
    status: "completed",
    createdDocumentId,
    updatedAt: nowIso(),
  });
}

export async function completeActiveInterview(
  chatId: string,
  createdDocumentId: string,
): Promise<InterviewState | null> {
  const current = await loadActiveInterview(chatId);
  if (!current) return null;
  return completeInterview(chatId, current, createdDocumentId);
}
