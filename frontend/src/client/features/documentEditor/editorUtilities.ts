import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface TextRange {
  from: number
  to: number
}

export function formatChatTimestamp(value?: string | null) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatActivityAction(action: string) {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getActivityDetail(details: unknown) {
  if (!details || typeof details !== 'object') return ''
  const name = Reflect.get(details, 'name')
  if (typeof name === 'string') return name
  const displayName = Reflect.get(details, 'display_name')
  if (typeof displayName === 'string') return displayName
  const id = Reflect.get(details, 'id')
  return typeof id === 'string' ? id : ''
}

export function findTextMatchesInDoc(doc: ProseMirrorNode, searchText: string): TextRange[] {
  const needle = searchText.trim()
  if (!needle) return []

  const matches: TextRange[] = []
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true
    let index = node.text.indexOf(needle)
    while (index >= 0) {
      matches.push({ from: pos + index, to: pos + index + needle.length })
      index = node.text.indexOf(needle, index + 1)
    }
    return true
  })
  return matches
}

export function formatVersionDateTime(value?: string | null) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (inputDate.getTime() === today.getTime()) return `Today • ${time}`
  if (inputDate.getTime() === yesterday.getTime()) return `Yesterday • ${time}`
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  return `${day} • ${time}`
}

export function isDocumentEditPrompt(text: string) {
  return /\b(change|fix|update|rewrite|revise|insert|delete|remove|replace|edit|add)\b/i.test(text)
}

export function truncateName(name: string, maxLength = 25) {
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name
}
