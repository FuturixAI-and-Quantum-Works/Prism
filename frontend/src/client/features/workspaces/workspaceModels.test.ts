import { describe, expect, it } from 'vitest'
import type { DriveFile } from '../../store/api/drive/driveFileApi'
import type { DriveWorkspace } from '../../store/api/drive/driveWorkspaceApi'
import type { Document } from '../../store/types'
import {
  buildCreateWorkspaceRequest,
  buildWorkspaceInvitationRequests,
  normalizeWorkspaceMembers,
  parseWorkspaceAnalysis,
  selectWorkspaceCards,
  normalizeWorkspaceItems,
  selectWorkspaceItems,
} from './workspaceModels'

const workspaces: DriveWorkspace[] = [
  {
    id: 'owned',
    owner_id: 'owner-1',
    owner_name: 'Alex Morgan',
    name: 'Apollo',
    description: 'Contracts',
    storage_used_bytes: 0,
    storage_quota_bytes: null,
    role: 'owner',
    file_count: 2,
    collaborators: [
      {
        id: 'collaborator-1',
        user_id: 'user-2',
        email: 'sam@example.com',
        full_name: 'Sam Lee',
        role: 'editor',
      },
    ],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'shared',
    owner_id: 'owner-2',
    owner_name: null,
    name: 'Beta',
    description: null,
    storage_used_bytes: 0,
    storage_quota_bytes: null,
    role: 'viewer',
    file_count: 0,
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
  },
]

const driveFile: DriveFile = {
  id: 'drive-file',
  user_id: 'owner-1',
  workspace_id: 'owned',
  folder_id: null,
  name: 'evidence.pdf',
  description: null,
  storage_path: 'evidence.pdf',
  size_bytes: 100,
  mime_type: 'application/pdf',
  extension: 'pdf',
  checksum: null,
  version: 1,
  is_primary: false,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
  last_accessed_at: null,
}

const document: Document = {
  id: 'document',
  project_id: null,
  workspace_id: 'owned',
  user_id: 'owner-1',
  folder_id: null,
  filename: 'Agreement.docx',
  file_type: 'docx',
  size_bytes: 200,
  page_count: 1,
  status: 'ready',
  current_version_id: null,
  is_primary: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
}

describe('workspace models', () => {
  it('normalizes, filters, and sorts workspace cards', () => {
    const cards = selectWorkspaceCards(workspaces, '', 'all', 'Newest')

    expect(cards.map((workspace) => workspace.id)).toEqual(['shared', 'owned'])
    expect(cards[1]).toMatchObject({
      membersCount: 2,
      filesCount: 2,
      createdBy: 'You',
      members: [
        { initials: 'AM', color: '#659d0b' },
        { initials: 'SL', email: 'sam@example.com' },
      ],
    })
    expect(selectWorkspaceCards(workspaces, 'contract', 'owned', 'Name A-Z')).toHaveLength(1)
    expect(selectWorkspaceCards(workspaces, '', 'shared', 'Name A-Z')[0]).toMatchObject({
      id: 'shared',
      sharedBy: 'Team Member',
    })
  })

  it('normalizes, filters, and sorts workspace items', () => {
    const items = normalizeWorkspaceItems([driveFile], [document])

    expect(items.map((item) => item.id)).toEqual(['document', 'drive-file'])
    expect(selectWorkspaceItems(items, 'primary', '', [], 'newest')).toEqual([items[0]])
    expect(selectWorkspaceItems(items, 'supporting', 'evidence', ['pdf'], 'name-asc')).toEqual([
      items[1],
    ])
  })

  it('normalizes owner and collaborator member metadata', () => {
    expect(normalizeWorkspaceMembers(workspaces[0])).toEqual([
      {
        id: 'owner',
        userId: 'owner-1',
        initials: 'AM',
        color: '#3F6F00',
        email: '',
        fullName: 'Alex Morgan',
        role: 'owner',
        isOwner: true,
      },
      {
        id: 'collaborator-1',
        userId: 'user-2',
        initials: 'SL',
        color: '#7d8a38',
        email: 'sam@example.com',
        fullName: 'Sam Lee',
        role: 'editor',
        isOwner: false,
      },
    ])
  })

  it('builds only supported create and invitation API fields', () => {
    expect(buildCreateWorkspaceRequest('', '')).toEqual({
      name: 'Untitled Workspace',
      description: null,
    })
    expect(
      buildWorkspaceInvitationRequests('workspace-1', [
        { email: 'admin@example.com', role: 'Admin' },
        { email: 'reader@example.com', role: 'Viewer' },
        { email: 'editor@example.com', role: 'Editor' },
      ]),
    ).toEqual([
      { workspaceId: 'workspace-1', email: 'admin@example.com', role: 'admin' },
      { workspaceId: 'workspace-1', email: 'reader@example.com', role: 'viewer' },
      { workspaceId: 'workspace-1', email: 'editor@example.com', role: 'editor' },
    ])
  })

  it('validates generated workspace analysis before exposing it to the UI', () => {
    expect(parseWorkspaceAnalysis('```json\n{"summaries":[]}\n```')).toEqual({
      summaries: [],
      risks: [],
      clauses: [],
    })
    expect(() =>
      parseWorkspaceAnalysis(
        JSON.stringify({
          risks: [
            {
              id: 'risk-1',
              title: 'Risk',
              category: 'Liability',
              description: 'Description',
              severity: 'critical',
            },
          ],
        }),
      ),
    ).toThrow('Invalid workspace analysis')
  })
})
