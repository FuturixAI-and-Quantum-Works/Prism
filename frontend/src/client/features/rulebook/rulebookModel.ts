import type { Document } from '../../store/types'
import type { ColumnConfig as ReviewColumnConfig } from '../../store/api/tabularReviewApi'
import type {
  RulebookColumnFormat,
  RulebookFaq,
  RulebookSeverity,
} from '../../store/api/rulebookApi'
import type { ColumnConfig as WorkflowColumnConfig, Workflow } from '../../store/api/workflowsApi'

export type RulebookWorkflow = Workflow

export const rulebookFontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export const rulebookFormatOptions: { value: RulebookColumnFormat; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'bulleted_list', label: 'Bulleted list' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'date', label: 'Date' },
  { value: 'tag', label: 'Tag' },
  { value: 'percentage', label: 'Percentage' },
]

export const rulebookSeverityOptions: { value: RulebookSeverity; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Critical' },
]

export interface RulebookModalState {
  mode: 'new' | 'edit'
  workflow?: Workflow
}

export function makeRulebookId(prefix = 'rule'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeRulebookFormat(value: unknown): RulebookColumnFormat {
  const candidate = String(value ?? '').trim()
  return rulebookFormatOptions.find((option) => option.value === candidate)?.value ?? 'text'
}

export function normalizeRulebookSeverity(value: unknown): RulebookSeverity {
  const candidate = String(value ?? '').trim()
  return rulebookSeverityOptions.find((option) => option.value === candidate)?.value ?? 'info'
}

export function formatRulebookDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function rulebookFormatLabel(format: RulebookColumnFormat): string {
  return rulebookFormatOptions.find((option) => option.value === format)?.label ?? 'Text'
}

export function rulebookSeverityColor(severity: RulebookSeverity) {
  if (severity === 'error') return { backgroundColor: '#FDECEC', color: '#B42318' }
  if (severity === 'warning') return { backgroundColor: '#FFF6DB', color: '#8A5A00' }
  return { backgroundColor: '#EDF4FF', color: '#2156A5' }
}

export function blankRulebookFaq(index: number): RulebookFaq {
  return {
    id: makeRulebookId(),
    question: '',
    column_name: `Check ${index + 1}`,
    prompt: '',
    format: 'yes_no',
    category: 'General',
    severity: 'info',
    rationale: '',
  }
}

export function toWorkflowColumns(faqs: RulebookFaq[]): WorkflowColumnConfig[] {
  return faqs.map((faq, index) => ({
    id: faq.id || makeRulebookId('col'),
    index,
    name: faq.column_name.trim() || `Check ${index + 1}`,
    prompt: faq.prompt.trim() || faq.question.trim(),
    format: faq.format,
    tags: faq.tags,
    width: 260,
    question: faq.question.trim(),
    category: faq.category.trim() || 'General',
    severity: faq.severity,
    rationale: faq.rationale?.trim() || '',
  }))
}

export function toReviewColumns(faqs: RulebookFaq[]): ReviewColumnConfig[] {
  return toWorkflowColumns(faqs).map((column, index) => ({
    id: column.id,
    index,
    name: column.name,
    prompt: column.prompt || '',
    format: column.format,
    tags: column.tags,
    width: column.width,
  }))
}

export function faqsFromWorkflow(workflow: Workflow): RulebookFaq[] {
  return (workflow.columnsConfig ?? []).map((column, index) => ({
    id: column.id || makeRulebookId('rule'),
    question: column.question || column.prompt || column.name || `Check ${index + 1}`,
    column_name: column.name || `Check ${index + 1}`,
    prompt: column.prompt || column.question || column.name || '',
    format: normalizeRulebookFormat(column.format || column.type),
    category: column.category || workflow.practice || 'General',
    severity: normalizeRulebookSeverity(column.severity),
    rationale: column.rationale || '',
    tags: column.tags,
  }))
}

export function selectedRulebookDocumentLabel(
  documents: Document[],
  selectedIds: string[],
): string {
  if (selectedIds.length === 0) return 'No documents selected'
  const names = selectedIds
    .map((id) => documents.find((document) => document.id === id)?.filename)
    .filter((name): name is string => Boolean(name))
  if (names.length === 0) return `${selectedIds.length} selected`
  if (names.length === 1) return names[0]
  return `${names.length} documents selected`
}

export function workflowColumnCount(workflow: Workflow): number {
  return workflow.columnsConfig?.length ?? 0
}

export function selectRulebooks(workflows: Workflow[], searchQuery: string): Workflow[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return workflows
  return workflows.filter((workflow) =>
    `${workflow.title} ${workflow.practice ?? ''}`.toLowerCase().includes(query),
  )
}
