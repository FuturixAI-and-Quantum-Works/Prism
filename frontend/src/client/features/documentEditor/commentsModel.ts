import type { DocumentComment } from '../documents/api/documentGovernanceApi'

export interface EditorComment {
  id: string
  author: string
  initials: string
  avatarColor: string
  time: string
  mention?: string
  content: string
  clauseRef?: string
  replyTo?: { mention: string; preview: string }
  resolved?: boolean
  kind?: string
  label?: string
  pageNumber?: number | null
  sectionRef?: string | null
  anchorText?: string | null
  fixPrompt?: string | null
}

const avatarColors = ['#E5713E', '#5C7B1D', '#8A38F5', '#454545', '#B56453', '#284679']

export function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || 'User').trim()
  const parts = source.includes('@') ? source.split('@')[0].split(/[._-]/) : source.split(/\s+/)
  return (
    parts
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  )
}

export function getAvatarColor(seed: string) {
  const index =
    Array.from(seed || 'user').reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    avatarColors.length
  return avatarColors[index]
}

export function formatRelativeTime(value?: string | null, now = Date.now()) {
  if (!value) return 'Just now'
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return 'Just now'
  const diffMs = now - time
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diffMs < minute) return 'Just now'
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} mins ago`
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hours ago`
  return `${Math.floor(diffMs / day)} days ago`
}

export function mapDocumentComments(
  persistedComments: DocumentComment[],
  now = Date.now(),
): EditorComment[] {
  const byId = new Map(persistedComments.map((comment) => [comment.id, comment]))

  return persistedComments.map((comment) => {
    const author = comment.user_name || comment.user_email || 'User'
    const parent = comment.parent_comment_id ? byId.get(comment.parent_comment_id) : null
    const parentAuthor = parent?.user_name || parent?.user_email || 'User'
    const metadata = comment.metadata ?? {}
    const pageNumber = typeof metadata.page_number === 'number' ? metadata.page_number : null
    const sectionRef =
      typeof metadata.section_ref === 'string' && metadata.section_ref.trim()
        ? metadata.section_ref.trim()
        : null
    const anchorText =
      typeof metadata.anchor_text === 'string' && metadata.anchor_text.trim()
        ? metadata.anchor_text.trim()
        : comment.anchor_text
    const clauseParts = [
      pageNumber ? `Page ${pageNumber}` : null,
      sectionRef ? `Section: ${sectionRef}` : null,
      anchorText ? `Selected: ${anchorText.slice(0, 60)}` : null,
    ].filter(Boolean)

    return {
      id: comment.id,
      author,
      initials: getInitials(comment.user_name, comment.user_email),
      avatarColor: getAvatarColor(comment.user_id || comment.user_email || comment.id),
      time: formatRelativeTime(comment.created_at, now),
      content: comment.body,
      clauseRef: clauseParts.length > 0 ? clauseParts.join(' | ') : undefined,
      replyTo: parent
        ? {
            mention: `@${parentAuthor.split('@')[0]}`,
            preview: parent.body,
          }
        : undefined,
      resolved: comment.resolved,
      kind: typeof metadata.kind === 'string' ? metadata.kind : undefined,
      label: typeof metadata.label === 'string' ? metadata.label : undefined,
      pageNumber,
      sectionRef,
      anchorText,
      fixPrompt: typeof metadata.fix_prompt === 'string' ? metadata.fix_prompt : null,
    }
  })
}

export function getRejectionFixPrompt(comment: EditorComment) {
  const targetLines = [
    comment.pageNumber ? `Page ${comment.pageNumber}` : null,
    comment.sectionRef ? `Section: ${comment.sectionRef}` : null,
    comment.anchorText ? `Anchor text: ${comment.anchorText}` : null,
  ].filter(Boolean)

  return (
    comment.fixPrompt ||
    [
      'Revise the document to address this rejection.',
      targetLines.length ? targetLines.join('\n') : '',
      `Reason: ${comment.content}`,
      'Update the relevant section, preserve the rest of the document, and resubmit for approval.',
    ]
      .filter(Boolean)
      .join('\n\n')
  )
}
