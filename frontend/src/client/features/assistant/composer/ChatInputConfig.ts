import addFilesIcon from '../../../assets/models/add-files-icon.svg'

export interface AddOption {
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly onSelect: () => void
}

export interface AttachedFile {
  id: string
  name: string
  size: number
  type: string
  previewUrl?: string | null
  source: { kind: 'local-file'; file: File } | { kind: 'stored-document'; documentId: string }
}

export const PROMPT_IMPROVEMENT_FAILURE_MESSAGE =
  "We couldn't improve your prompt. Your original text was kept."

export type PromptImprovementResult =
  { kind: 'improved'; text: string } | { kind: 'failed'; message: string }

export type PromptImprovementHandler = (text: string) => Promise<PromptImprovementResult>

export function createFileAddOption(onSelect: () => void): AddOption {
  return { id: 'files', name: 'Add Files', icon: addFilesIcon, onSelect }
}

export const defaultPlaceholders = [
  'Ask anything about this matter or its documents...',
  'Summarize key points from this contract...',
  'Find clauses related to termination...',
  'Compare this agreement with the previous version...',
  'Identify potential risks in this document...',
]
