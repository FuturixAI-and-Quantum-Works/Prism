import type { Template as ApiTemplate } from './templatesApi'

export const templateFontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export interface TemplateCategory {
  id: string
  label: string
  bgColor: string
  borderColor: string
  textColor: string
}

export interface TemplateCardModel {
  id: string
  title: string
  category: TemplateCategory
  description: string
  createdAt: string
  createdAtDate: Date
  apiTemplate: ApiTemplate
}

export type TemplateSort = 'newest' | 'oldest' | 'name-asc' | 'name-desc'

export const templateSortOptions: { key: TemplateSort; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'name-asc', label: 'Name A-Z' },
  { key: 'name-desc', label: 'Name Z-A' },
]

export const templateSortLabels: Record<TemplateSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  'name-asc': 'Name A-Z',
  'name-desc': 'Name Z-A',
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

export function templateCategory(category: string): TemplateCategory {
  const normalized = category.toLowerCase().replace(/[_\s-]+/g, '')
  const colorKey = Object.keys(categoryColors).find((key) => normalized.includes(key)) || 'default'
  return {
    id: normalized,
    label: category.toUpperCase(),
    ...categoryColors[colorKey],
  }
}

export function formatTemplateRelativeTime(dateString: string, now = new Date()): string {
  const date = new Date(dateString)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} year${diffDays >= 730 ? 's' : ''} ago`
}

export function toTemplateCard(template: ApiTemplate): TemplateCardModel {
  return {
    id: template.id,
    title: template.name,
    category: templateCategory(template.category),
    description: template.description || '',
    createdAt: formatTemplateRelativeTime(template.createdAt),
    createdAtDate: new Date(template.createdAt),
    apiTemplate: template,
  }
}

export function selectTemplateCategories(templates: TemplateCardModel[]): TemplateCategory[] {
  return Array.from(
    templates.reduce((categories, template) => {
      if (!categories.has(template.category.id)) {
        categories.set(template.category.id, template.category)
      }
      return categories
    }, new Map<string, TemplateCategory>()),
    ([, category]) => category,
  )
}

export function selectTemplateCards(
  templates: TemplateCardModel[],
  searchQuery: string,
  selectedCategories: string[],
  sort: TemplateSort,
): TemplateCardModel[] {
  const query = searchQuery.toLowerCase()
  const result = templates.filter((template) => {
    const matchesSearch =
      !query ||
      template.title.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query)
    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(template.category.id)
    return matchesSearch && matchesCategory
  })

  return result.sort((left, right) => {
    switch (sort) {
      case 'newest':
        return right.createdAtDate.getTime() - left.createdAtDate.getTime()
      case 'oldest':
        return left.createdAtDate.getTime() - right.createdAtDate.getTime()
      case 'name-asc':
        return left.title.localeCompare(right.title)
      case 'name-desc':
        return right.title.localeCompare(left.title)
    }
  })
}
