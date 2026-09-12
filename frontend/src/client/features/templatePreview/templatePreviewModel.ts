import { sanitizeEditorHtml } from '../../lib/sanitizeHtml'
import type { CreateDocumentRequest } from '../../store/types'
import type {
  CreateDocumentFromTemplateRequest,
  Template,
  TemplateField,
} from '../templates/templatesApi'

export type TemplateFieldValues = Record<string, string>
export type TemplateSectionExpansion = Record<string, boolean>

export interface IndexedTemplateField extends TemplateField {
  key: string
}

export interface TemplateFieldSection {
  name: string
  fields: IndexedTemplateField[]
}

export interface TemplatePreviewInitialization {
  sourceHtml: string
  fields: TemplateField[]
  values: TemplateFieldValues
  expandedSections: TemplateSectionExpansion
}

export type TemplateCreationPlan =
  | {
      kind: 'source'
      input: {
        id: string
        data: CreateDocumentFromTemplateRequest
      }
    }
  | {
      kind: 'html'
      input: CreateDocumentRequest
    }

const emptyContentHtml = '<p></p>'
const docxMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function templateFieldKey(field: TemplateField, index: number): string {
  return `${field.id}_${index}`
}

export function indexTemplateFields(fields: TemplateField[]): IndexedTemplateField[] {
  return fields.map((field, index) => ({
    ...field,
    key: templateFieldKey(field, index),
  }))
}

export function findMissingRequiredTemplateField(
  fields: TemplateField[],
  values: TemplateFieldValues,
): IndexedTemplateField | undefined {
  return indexTemplateFields(fields).find(
    (field) => field.required && !(values[field.key] || '').trim(),
  )
}

export function groupTemplateFields(fields: TemplateField[]): TemplateFieldSection[] {
  const sections = new Map<string, IndexedTemplateField[]>()

  for (const field of indexTemplateFields(fields)) {
    const sectionName = field.section || 'General'
    const sectionFields = sections.get(sectionName)
    if (sectionFields) {
      sectionFields.push(field)
    } else {
      sections.set(sectionName, [field])
    }
  }

  return Array.from(sections, ([name, sectionFields]) => ({
    name,
    fields: sectionFields,
  }))
}

export function initializeTemplatePreview(template: Template): TemplatePreviewInitialization {
  const sourceHtml = sanitizeEditorHtml(template.contentHtml || emptyContentHtml)
  const fields = template.fields || []
  const values: TemplateFieldValues = {}

  fields.forEach((field, index) => {
    values[templateFieldKey(field, index)] = ''
  })

  const expandedSections: TemplateSectionExpansion = {}
  groupTemplateFields(fields).forEach(({ name }, index) => {
    expandedSections[name] = index === 0
  })

  return {
    sourceHtml,
    fields,
    values,
    expandedSections,
  }
}

function templateTokenPatterns(fieldId: string): RegExp[] {
  const escapedId = fieldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [
    new RegExp(`\\{\\{\\s*${escapedId}\\s*\\}\\}`, 'g'),
    new RegExp(`\\$\\{${escapedId}\\}`, 'g'),
    new RegExp(`\\[${escapedId}\\]`, 'g'),
  ]
}

function replaceFieldTokens(html: string, fieldId: string, replacement: string): string {
  let replacedHtml = html
  for (const pattern of templateTokenPatterns(fieldId)) {
    replacedHtml = replacedHtml.replace(pattern, () => replacement)
  }
  return replacedHtml
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fieldValuesById(
  fields: TemplateField[],
  values: TemplateFieldValues,
): Map<string, string> {
  const projectedValues = new Map<string, string>()
  fields.forEach((field, index) => {
    projectedValues.set(field.id, values[templateFieldKey(field, index)] || '')
  })
  return projectedValues
}

export function substituteTemplatePreviewText(
  sourceHtml: string,
  fields: TemplateField[],
  values: TemplateFieldValues,
): string {
  let html = sanitizeEditorHtml(sourceHtml)

  fieldValuesById(fields, values).forEach((value, fieldId) => {
    if (value.trim()) html = replaceFieldTokens(html, fieldId, escapeHtmlText(value))
  })

  return sanitizeEditorHtml(html)
}

export function substitutePlainTemplateHtml(
  sourceHtml: string,
  fields: TemplateField[],
  values: TemplateFieldValues,
): string {
  let html = sanitizeEditorHtml(sourceHtml)

  fieldValuesById(fields, values).forEach((value, fieldId) => {
    html = replaceFieldTokens(html, fieldId, escapeHtmlText(value))
  })

  return sanitizeEditorHtml(html)
}

export function projectTemplateValues(
  fields: TemplateField[],
  values: TemplateFieldValues,
): Record<string, string> {
  return Object.fromEntries(fieldValuesById(fields, values))
}

export function hasUsableDocxSource(template: Template): boolean {
  if (!template.sourceStoragePath) return false
  const sourceName = template.sourceFilename || template.sourceStoragePath
  return (
    template.sourceMimeType?.toLowerCase() === docxMimeType ||
    sourceName.toLowerCase().endsWith('.docx')
  )
}

export function buildTemplateCreationPlan({
  template,
  fields,
  values,
  editorHtml,
  hasEditorChanges,
}: {
  template: Template
  fields: TemplateField[]
  values: TemplateFieldValues
  editorHtml: string
  hasEditorChanges: boolean
}): TemplateCreationPlan {
  if (hasUsableDocxSource(template) && !hasEditorChanges) {
    return {
      kind: 'source',
      input: {
        id: template.id,
        data: {
          name: template.name,
          filename: `${template.name}.docx`,
          values: projectTemplateValues(fields, values),
        },
      },
    }
  }

  const sourceHtml = hasEditorChanges ? editorHtml : template.contentHtml || emptyContentHtml
  const contentHtml = substitutePlainTemplateHtml(sourceHtml, fields, values)

  return {
    kind: 'html',
    input: {
      name: template.name,
      filename: `${template.name}.docx`,
      content_html: contentHtml,
    },
  }
}
