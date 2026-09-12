export interface User {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  displayName?: string
  avatar?: string
  role: string
  jurisdiction?: string
  organisation?: string
  plan?: 'free' | 'pro' | 'enterprise'
  emailVerified?: boolean
  onboardingCompleted: boolean
  createdAt: string
  updatedAt?: string
}

export interface Project {
  id: string
  name: string
  cm_number: string | null
  user_id: string
  invite_email_results?: InviteEmailResult[]
  is_owner: boolean
  role?: 'owner' | 'admin' | 'editor' | 'viewer'
  document_count: number
  chat_count: number
  review_count: number
  created_at: string
  updated_at: string
}

interface InviteEmailResult {
  email: string
  status: 'sent' | 'failed' | 'suppressed' | 'skipped'
  message_id?: string
  error?: string
  suppressed?: boolean
  attempts?: number
}

export interface CreateProjectRequest {
  name: string
  cm_number?: string | null
}

export interface UpdateProjectRequest {
  id: string
  name?: string
  cm_number?: string
}

export interface Document {
  id: string
  project_id: string | null
  workspace_id: string | null
  user_id: string
  folder_id: string | null
  filename: string
  file_type: 'pdf' | 'docx' | 'doc' | string | null
  size_bytes: number | null
  page_count: number | null
  structure_tree?: unknown
  status: 'processing' | 'ready' | 'error' | string | null
  lifecycle_status?: 'DRAFT' | 'IN_REVIEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'FINALIZED' | string
  current_version_id: string | null
  storage_path?: string | null
  pdf_storage_path?: string | null
  latest_version_number?: number | null
  active_version_number?: number | null
  is_primary?: boolean
  created_at: string
  updated_at: string
}

export interface CreateDocumentRequest {
  name?: string
  filename?: string
  content_html?: string
  project_id?: string | null
  workspace_id?: string | null
  folder_id?: string | null
  is_primary?: boolean
}

export interface UpdateDocumentRequest {
  id: string
  name?: string
  filename?: string
  project_id?: string | null
  workspace_id?: string | null
  folder_id?: string | null
}
