export interface ChatToolCallArtifact {
  id: string
  tool: string
  input?: unknown
  output?: unknown
  status?: string
}

export interface ChatSourceResultArtifact {
  rank?: number
  filename?: string
  source_type?: string | null
  scope_type?: string
  page_number?: number | null
  text?: string
  document_context?: string | null
  score?: number | null
  document_url?: string | null
}

interface ChatDocumentArtifactBase {
  filename: string
  action: 'created' | 'edited' | 'replicated'
  createdAt?: string
}

export type ChatDocumentArtifact =
  | (ChatDocumentArtifactBase & {
      status: 'ready'
      id: string
    })
  | (ChatDocumentArtifactBase & {
      status: 'failed'
      error: string
      documentId?: string
      completedCount?: number
      expectedCount?: number
    })
