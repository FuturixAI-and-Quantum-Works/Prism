import type { DocumentPlaceholderField } from '../documents/api/documentContentApi'
import type { Template } from '../templates/templatesApi'

export type PlaceholderToolStatus = 'collecting' | 'saving' | 'applied' | 'error'

export interface PlaceholderToolState {
  fields: DocumentPlaceholderField[]
  values: Record<string, string>
  status: PlaceholderToolStatus
  message?: string
}

export type PlaceholderPromptOutcome = { kind: 'presented' } | { kind: 'reply'; message: string }

export type PlaceholderSubmitOutcome =
  | { kind: 'idle' }
  | { kind: 'failed' }
  | { kind: 'redirecting' }
  | { kind: 'reply'; message: string }

export function isPlaceholderFillPrompt(text: string) {
  const normalized = text.toLowerCase()
  return (
    normalized.includes('placeholder') ||
    normalized.includes('{{') ||
    /\[[A-Za-z][A-Za-z0-9\s/&._-]{1,80}\]/.test(text) ||
    /fill\s+(all\s+)?(the\s+)?(details|fields|blanks)/i.test(text) ||
    /complete\s+(this\s+)?(document|template|agreement)/i.test(text)
  )
}

export function getPlaceholderInputHint(field: DocumentPlaceholderField) {
  if (field.type === 'date') return 'Select date'
  if (field.type === 'number') return 'Enter amount or number'
  return `Enter ${field.label.toLowerCase()}`
}

export function templatePlaceholderFields(
  template: Pick<Template, 'fields'>,
): DocumentPlaceholderField[] {
  return (template.fields ?? []).map((field) => ({
    key: field.id,
    label: field.label,
    type:
      field.type === 'email' || field.type === 'phone' || field.type === 'address'
        ? 'text'
        : field.type,
    required: field.required,
    occurrences: 1,
    value: null,
  }))
}

export function placeholderValues(fields: DocumentPlaceholderField[]) {
  return Object.fromEntries(fields.map((field) => [field.key, field.value ?? '']))
}

export function updatePlaceholderValue(
  state: PlaceholderToolState,
  key: string,
  value: string,
): PlaceholderToolState {
  return { ...state, values: { ...state.values, [key]: value } }
}
