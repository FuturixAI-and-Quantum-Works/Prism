import type { Template as ApiTemplate } from '../../templates/templatesApi'
import type { AttachedFile } from '../composer/ChatInputConfig'

export type AssistantMode = 'initial' | 'create' | 'compare' | 'summarize'

export interface CompareDocument {
  id: string
  file: File | null
  previewUrl: string | null
}

export interface AssistantConversationRequest {
  readonly message: string
  readonly files: readonly AttachedFile[]
}

interface TemplateCategory {
  id: string
  label: string
  bgColor: string
  borderColor: string
  textColor: string
}

export interface AssistantTemplate {
  id: string
  title: string
  category: TemplateCategory
  description: string
  createdAt: string
  createdAtDate: Date
  apiTemplate: ApiTemplate
}

const categoryColors: Record<string, Omit<TemplateCategory, 'id' | 'label'>> = {
  nda: { bgColor: '#E8DEF9', borderColor: '#B4A6D7', textColor: '#7960B1' },
  employment: { bgColor: '#F9F2DE', borderColor: '#D7C7A6', textColor: '#B19660' },
  privacy: { bgColor: '#DEF2E6', borderColor: '#A6D7B8', textColor: '#60B17A' },
  service: { bgColor: '#DEE8F9', borderColor: '#A6B8D7', textColor: '#6080B1' },
  partnership: { bgColor: '#F9DEDE', borderColor: '#D7A6A6', textColor: '#B16060' },
  lease: { bgColor: '#F2F9DE', borderColor: '#C7D7A6', textColor: '#8AB160' },
  consulting: { bgColor: '#F9E8DE', borderColor: '#D7BFA6', textColor: '#B18A60' },
  default: { bgColor: '#EDEDED', borderColor: '#CCCCCC', textColor: '#666666' },
}

export const promptSuggestions = [
  {
    id: 'summarize',
    title: 'Summarize Document',
    description: 'Get a quick summary of key points and terms',
    prompt: 'Summarize the key points and important terms from my document',
  },
  {
    id: 'risks',
    title: 'Identify Risks',
    description: 'Find potential risks and problematic clauses',
    prompt: 'Identify potential risks and problematic clauses in my documents',
  },
  {
    id: 'draft',
    title: 'Draft Agreement',
    description: 'Help me create a new legal document',
    prompt: 'Help me draft a new agreement',
  },
  {
    id: 'compare',
    title: 'Compare Documents',
    description: 'Compare two versions and highlight differences',
    prompt: 'Compare my documents and highlight the key differences',
  },
]

export function createInitialCompareDocuments(): CompareDocument[] {
  return [
    { id: '1', file: null, previewUrl: null },
    { id: '2', file: null, previewUrl: null },
  ]
}

function getCategory(category: string): TemplateCategory {
  const normalized = category.toLowerCase().replace(/[_\s-]+/g, '')
  const colorKey = Object.keys(categoryColors).find((key) => normalized.includes(key)) || 'default'
  return {
    id: normalized,
    label: category.toUpperCase(),
    ...categoryColors[colorKey],
  }
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} year${diffDays >= 730 ? 's' : ''} ago`
}

export function mapAssistantTemplates(templates: ApiTemplate[] | undefined): AssistantTemplate[] {
  return (templates ?? []).map((template) => ({
    id: template.id,
    title: template.name,
    category: getCategory(template.category),
    description: template.description || '',
    createdAt: formatRelativeTime(template.createdAt),
    createdAtDate: new Date(template.createdAt),
    apiTemplate: template,
  }))
}
