import { describe, expect, it } from 'vitest'
import { documentArtifactsFromEvent, mergeDocumentArtifacts } from './documentArtifactModel'

const createdAt = '2026-09-03T00:00:00.000Z'

describe('document artifact model', () => {
  it('models a missing document id as a failure', () => {
    expect(
      documentArtifactsFromEvent({ type: 'doc_created', filename: 'Agreement.docx' }, createdAt),
    ).toEqual([
      {
        status: 'failed',
        action: 'created',
        filename: 'Agreement.docx',
        error: 'The document operation did not return a stored document ID.',
        createdAt,
      },
    ])
  })

  it('expands copies and retains a partial replication error', () => {
    expect(
      documentArtifactsFromEvent(
        {
          type: 'doc_replicated',
          filename: 'Agreement.docx',
          count: 3,
          copies: [
            {
              new_filename: 'Agreement (1).docx',
              document_id: 'document-copy-1',
            },
            {
              new_filename: 'Agreement (2).docx',
              document_id: 'document-copy-2',
            },
          ],
          error: 'The third copy failed.',
        },
        createdAt,
      ),
    ).toEqual([
      {
        status: 'ready',
        id: 'document-copy-1',
        filename: 'Agreement (1).docx',
        action: 'replicated',
        createdAt,
      },
      {
        status: 'ready',
        id: 'document-copy-2',
        filename: 'Agreement (2).docx',
        action: 'replicated',
        createdAt,
      },
      {
        status: 'failed',
        action: 'replicated',
        filename: 'Agreement.docx',
        error: 'The third copy failed.',
        completedCount: 2,
        expectedCount: 3,
        createdAt,
      },
    ])
  })

  it('deduplicates only artifacts with the same real identity or failure details', () => {
    const ready = {
      status: 'ready' as const,
      id: 'document-1',
      filename: 'Agreement.docx',
      action: 'created' as const,
    }
    const failed = {
      status: 'failed' as const,
      filename: 'Agreement.docx',
      action: 'edited' as const,
      error: 'Edit failed.',
    }

    expect(mergeDocumentArtifacts([ready, failed], [ready, failed])).toEqual([ready, failed])
  })
})
