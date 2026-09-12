import {
  parseDocumentCitationBlock,
  type CitationBlockStatus,
  type DocumentCitation,
} from '@prism/protocol'

export type ParsedCitation = DocumentCitation

export interface ParsedBottleneck {
  bottleneck: string
  reason: string
  heading: string
}

export interface ParsedMessageContent {
  cleanContent: string
  citations: ParsedCitation[]
  citationState: CitationBlockStatus
  bottlenecks: ParsedBottleneck[]
}

function findJsonObjectEnd(source: string, start: number) {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = inString
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return -1
}

function normalizeBottleneck(value: unknown): ParsedBottleneck | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const rawBottleneck = Reflect.get(value, 'bottleneck')
  const rawReason = Reflect.get(value, 'reason')
  const rawHeading = Reflect.get(value, 'heading')
  const bottleneck = typeof rawBottleneck === 'string' ? rawBottleneck.trim() : ''
  const reason = typeof rawReason === 'string' ? rawReason.trim() : ''
  const heading = typeof rawHeading === 'string' ? rawHeading.trim() : ''
  if (!bottleneck) return null
  return { bottleneck, reason, heading }
}

function parseBottleneckBlock(content: string) {
  const keyIndex = content.lastIndexOf('"bottlenecks"')
  if (keyIndex < 0) return { cleanContent: content.trim(), bottlenecks: [] }

  const start = content.lastIndexOf('{', keyIndex)
  if (start < 0) return { cleanContent: content.trim(), bottlenecks: [] }

  const end = findJsonObjectEnd(content, start)
  if (end < 0) return { cleanContent: content.trim(), bottlenecks: [] }

  try {
    const parsed: unknown = JSON.parse(content.slice(start, end + 1))
    const values =
      parsed && typeof parsed === 'object' && 'bottlenecks' in parsed
        ? parsed.bottlenecks
        : undefined
    const bottlenecks = Array.isArray(values)
      ? values.map(normalizeBottleneck).filter((item): item is ParsedBottleneck => !!item)
      : []
    if (bottlenecks.length === 0) return { cleanContent: content.trim(), bottlenecks: [] }

    const cleanContent = `${content.slice(0, start)}${content.slice(end + 1)}`
      .replace(/```(?:json)?\s*```/gi, '')
      .trim()
    return { cleanContent, bottlenecks }
  } catch {
    return { cleanContent: content.trim(), bottlenecks: [] }
  }
}

export function parseMessageContent(content: string): ParsedMessageContent {
  const citationResult = parseDocumentCitationBlock(content)
  if (citationResult.status === 'invalid' || citationResult.status === 'incomplete') {
    return {
      cleanContent: citationResult.visibleText.trim(),
      citations: [],
      citationState: citationResult.status,
      bottlenecks: [],
    }
  }

  const bottleneckResult = parseBottleneckBlock(citationResult.visibleText)
  return {
    cleanContent: bottleneckResult.cleanContent,
    citations: citationResult.status === 'valid' ? [...citationResult.citations] : [],
    citationState: citationResult.status,
    bottlenecks: bottleneckResult.bottlenecks,
  }
}
