import type { DocumentVersion } from '../documents/api/documentVersionsApi'

export interface VersionDiffSample {
  type: 'added' | 'removed' | 'modified'
  lineNumber: number
  before?: string
  after?: string
}

export interface VersionComparisonRow {
  version: DocumentVersion
  added: number
  removed: number
  changed: number
  previousLineCount: number
  currentLineCount: number
  samples: VersionDiffSample[]
}

function decodeHtmlEntities(value: string) {
  if (typeof window === 'undefined') return value
  const textarea = window.document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

export function htmlToComparableLines(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h[1-6]|li|tr|div|section|article|table)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export function compareVersionHtml(previousHtml: string, currentHtml: string) {
  const previousLines = htmlToComparableLines(previousHtml)
  const currentLines = htmlToComparableLines(currentHtml)
  const samples: VersionDiffSample[] = []
  let added = 0
  let removed = 0
  let changed = 0

  const maxLines = Math.max(previousLines.length, currentLines.length)
  for (let index = 0; index < maxLines; index += 1) {
    const before = previousLines[index]
    const after = currentLines[index]

    if (!before && after) {
      added += 1
      if (samples.length < 6) samples.push({ type: 'added', lineNumber: index + 1, after })
      continue
    }
    if (before && !after) {
      removed += 1
      if (samples.length < 6) samples.push({ type: 'removed', lineNumber: index + 1, before })
      continue
    }
    if (before && after && before !== after) {
      changed += 1
      if (samples.length < 6) {
        samples.push({ type: 'modified', lineNumber: index + 1, before, after })
      }
    }
  }

  return {
    added,
    removed,
    changed,
    previousLineCount: previousLines.length,
    currentLineCount: currentLines.length,
    samples,
  }
}

export function versionLabel(version?: DocumentVersion | null) {
  if (!version) return 'Current version'
  return version.display_name || `Version ${version.version_number}`
}
