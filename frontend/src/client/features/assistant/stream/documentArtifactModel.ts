import type { ChatDocumentArtifact } from './artifactTypes'

type DocumentAction = ChatDocumentArtifact['action']

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}

function actionFor(type: string): DocumentAction | null {
  if (type === 'doc_created') return 'created'
  if (type === 'doc_edited') return 'edited'
  if (type === 'doc_replicated') return 'replicated'
  return null
}

function failedArtifact({
  action,
  filename,
  error,
  createdAt,
  documentId,
  completedCount,
  expectedCount,
}: {
  action: DocumentAction
  filename: string
  error: string
  createdAt: string
  documentId?: string
  completedCount?: number
  expectedCount?: number
}): ChatDocumentArtifact {
  return {
    status: 'failed',
    action,
    filename,
    error,
    createdAt,
    ...(documentId ? { documentId } : {}),
    ...(completedCount !== undefined ? { completedCount } : {}),
    ...(expectedCount !== undefined ? { expectedCount } : {}),
  }
}

export function documentArtifactsFromEvent(
  event: unknown,
  fallbackCreatedAt = new Date().toISOString(),
): ChatDocumentArtifact[] {
  const value = record(event)
  const type = text(value?.type)
  const action = type ? actionFor(type) : null
  if (!value || !action || !type) return []

  const filename = text(value.filename) ?? 'Untitled'
  const createdAt = text(value.created_at) ?? text(value.createdAt) ?? fallbackCreatedAt
  const documentId = text(value.document_id)
  const eventError = text(value.error)

  if (type !== 'doc_replicated') {
    if (eventError || !documentId) {
      return [
        failedArtifact({
          action,
          filename,
          error: eventError ?? 'The document operation did not return a stored document ID.',
          createdAt,
          documentId,
        }),
      ]
    }
    return [{ status: 'ready', id: documentId, filename, action, createdAt }]
  }

  const ready: ChatDocumentArtifact[] = []
  const seenIds = new Set<string>()
  const addReady = (id: string, copyFilename: string) => {
    if (seenIds.has(id)) return
    seenIds.add(id)
    ready.push({
      status: 'ready',
      id,
      filename: copyFilename,
      action: 'replicated',
      createdAt,
    })
  }

  if (Array.isArray(value.copies)) {
    for (const copyValue of value.copies) {
      const copy = record(copyValue)
      const copyId = text(copy?.document_id)
      if (!copy || !copyId) continue
      addReady(copyId, text(copy.new_filename) ?? text(copy.filename) ?? filename)
    }
  }
  if (documentId) addReady(documentId, filename)

  const expectedCount = count(value.count)
  const incomplete = expectedCount !== undefined && ready.length < expectedCount
  if (eventError || ready.length === 0 || incomplete) {
    const error =
      eventError ??
      (incomplete
        ? `Only ${ready.length} of ${expectedCount} document copies were returned.`
        : 'The document operation did not return any stored copies.')
    ready.push(
      failedArtifact({
        action: 'replicated',
        filename,
        error,
        createdAt,
        completedCount: ready.length,
        expectedCount,
      }),
    )
  }

  return ready
}

function artifactKey(artifact: ChatDocumentArtifact): string {
  return artifact.status === 'ready'
    ? `ready:${artifact.id}`
    : [
        'failed',
        artifact.action,
        artifact.documentId ?? '',
        artifact.filename,
        artifact.error,
        artifact.completedCount ?? '',
        artifact.expectedCount ?? '',
      ].join(':')
}

export function mergeDocumentArtifacts(
  current: readonly ChatDocumentArtifact[] | undefined,
  incoming: readonly ChatDocumentArtifact[],
): ChatDocumentArtifact[] {
  const merged = [...(current ?? [])]
  const keys = new Set(merged.map(artifactKey))
  for (const artifact of incoming) {
    const key = artifactKey(artifact)
    if (keys.has(key)) continue
    keys.add(key)
    merged.push(artifact)
  }
  return merged
}
