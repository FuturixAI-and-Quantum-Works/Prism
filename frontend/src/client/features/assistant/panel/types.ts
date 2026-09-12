import type { ReactNode } from 'react'
import type { ProjectChatMessage } from '../../projects/projectsApi'
import type { AttachedFile } from '../composer/ChatInputConfig'
import type {
  ChatDocumentArtifact,
  ChatSourceResultArtifact,
  ChatToolCallArtifact,
} from '../stream/artifactTypes'
import type { WizardField } from '../../../components/chat/TemplateWizardCard'

export interface DisplayedDocument {
  filename: string
  document_id: string
}

export interface DisplayedFile {
  filename: string
  file_id: string
}

export interface WizardData {
  template_id: string | null
  template_name: string
  fields: WizardField[]
  completed?: boolean
}

export type PanelChatMessage = ProjectChatMessage & {
  wizardData?: WizardData
  reasoning?: string
  tools?: ChatToolCallArtifact[]
  sources?: ChatSourceResultArtifact[]
  documents?: ChatDocumentArtifact[]
  isStreaming?: boolean
  attachedFiles?: AttachedFile[]
}

export interface StoredPanelMessage {
  id: string
  role: 'user' | 'assistant'
  content: unknown
  createdAt?: string
  files?: Array<{ filename: string; document_id: string }> | null
}

export interface HistoryChat {
  id: string
  title: string | null
  updatedAt?: string
  createdAt: string
}

export interface AIModel {
  id: string
  name: string
  icon: string
  isPro?: boolean
}

export interface AiAssistantPanelProps {
  userName?: string
  collapsed: boolean
  onToggle: () => void
  width?: number
  onWidthChange?: (width: number) => void
  minWidth?: number
  maxWidth?: number
  projectId?: string
  workspaceId?: string
  displayedDocument?: DisplayedDocument
  displayedFile?: DisplayedFile
  onRefetch?: () => void
  hideActionCards?: boolean
  isProjectsEmpty?: boolean
  onCreateProject?: () => void
  continueWorkingContent?: ReactNode
}
