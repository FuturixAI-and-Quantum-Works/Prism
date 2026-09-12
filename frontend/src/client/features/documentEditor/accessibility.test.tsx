import { useRef, useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import type { DocumentInsights } from '../documents/api/documentContentApi'
import type { DocumentActivity } from '../documents/api/documentGovernanceApi'
import type { DocumentVersion } from '../documents/api/documentVersionsApi'
import { AuditPanel } from './AuditPanel'
import { CommentsPanel } from './CommentsPanel'
import { ContextFilesPanel } from './ContextFilesPanel'
import { DocumentHeader } from './DocumentHeader'
import { InsightsPanel } from './InsightsPanel'
import type { DocumentAuditModel } from './useDocumentAudit'
import type { DocumentCommentsModel } from './useDocumentComments'
import type { DocumentInsightsModel } from './useDocumentInsights'
import { VersionComparisonTable } from './VersionComparisonTable'
import type { VersionComparisonRow } from './versionComparison'

const activity: DocumentActivity = {
  id: 'activity-1',
  document_id: 'document-1',
  user_id: 'user-1',
  user_email: 'alex@example.com',
  user_name: 'Alex Morgan',
  action: 'document_edited',
  target_type: 'document',
  target_id: 'document-1',
  target_name: 'Agreement',
  details: { name: 'Termination clause' },
  created_at: '2026-09-02T08:00:00.000Z',
  edit_details: {
    deleted_text: 'Old text',
    inserted_text: 'New text',
    context_before: null,
    context_after: null,
    reason: 'Clarify the obligation',
    status: 'accepted',
  },
  favorability: 'favorable',
  favorability_explanation: 'The revision reduces ambiguity.',
}

const insights: DocumentInsights = {
  mainDocument: {
    id: 'document-1',
    filename: 'Agreement.docx',
    summary: ['Summary point'],
    risks: [
      {
        title: 'Broad indemnity',
        severity: 'high',
        description: 'The indemnity is uncapped.',
      },
    ],
  },
  contextFiles: [
    {
      id: 'context-1',
      filename: 'Policy.pdf',
      summary: ['Policy summary'],
      risks: [],
    },
  ],
}

const versions: DocumentVersion[] = [
  {
    id: 'version-1',
    version_number: 1,
    source: 'user_edit',
    created_at: '2026-09-01T08:00:00.000Z',
    display_name: 'Version 1',
  },
  {
    id: 'version-2',
    version_number: 2,
    source: 'assistant_edit',
    created_at: '2026-09-02T08:00:00.000Z',
    display_name: 'Version 2',
  },
]

const comparisons: VersionComparisonRow[] = versions.map((version, index) => ({
  version,
  added: index + 1,
  removed: index,
  changed: 1,
  previousLineCount: 4,
  currentLineCount: 5,
  samples: [
    {
      type: 'modified',
      lineNumber: 2,
      before: 'Old clause',
      after: `New clause ${index + 1}`,
    },
  ],
}))

async function tabTo(user: ReturnType<typeof userEvent.setup>, target: HTMLElement, limit = 50) {
  for (let index = 0; index < limit && document.activeElement !== target; index += 1) {
    await user.tab()
  }
  expect(target).toHaveFocus()
}

function AuditHarness() {
  const [selected, setSelected] = useState<DocumentActivity | null>(null)
  const model = {
    activity: [activity],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
    selected,
    select: setSelected,
  } satisfies DocumentAuditModel
  return <AuditPanel active model={model} />
}

function ContextFilesHarness() {
  const [open, setOpen] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const preview = vi.fn()
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open context files
      </button>
      <ContextFilesPanel
        attachedFiles={[
          {
            id: 'file-1',
            name: 'Policy.pdf',
            type: 'pdf',
            date: 'Today',
            extension: 'pdf',
          },
        ]}
        isOpen={open}
        isUploading={false}
        onClose={() => setOpen(false)}
        onOpenBrowse={vi.fn()}
        onRemove={() => Promise.resolve()}
        onUpload={() => Promise.resolve()}
        setPreviewFile={preview}
        uploadInputRef={uploadInputRef}
      />
    </>
  )
}

function HeaderHarness({
  exportError = null,
  onExportPdf,
}: {
  exportError?: string | null
  onExportPdf: () => Promise<boolean>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <DocumentHeader
        canEditDocument
        canManageDocumentSharing
        canOwnerReviewApproval={false}
        canSendForApproval={false}
        displayedCollaborators={[
          { active: true, color: '#284679', initials: 'AM', name: 'Alex Morgan' },
        ]}
        docName="Agreement.docx"
        exportDisabled={false}
        exportError={exportError}
        handleExportDocx={vi.fn().mockResolvedValue(true)}
        handleExportPdf={onExportPdf}
        handleSaveVersion={vi.fn()}
        isEditorFocused={false}
        isExporting={false}
        isSavingVersion={false}
        isSendingForApproval={false}
        moreOptionsDropdownOpen={menuOpen}
        moreOptionsDropdownRef={menuRef}
        setApprovalError={vi.fn()}
        setApprovalModalOpen={vi.fn()}
        setInviteError={vi.fn()}
        setInviteModalOpen={setInviteOpen}
        setInviteNotice={vi.fn()}
        setMoreOptionsDropdownOpen={setMenuOpen}
        setOwnerApprovalError={vi.fn()}
        setOwnerApproveModalOpen={vi.fn()}
        setOwnerRejectAnchor={vi.fn()}
        setOwnerRejectModalOpen={vi.fn()}
        setOwnerRejectNote={vi.fn()}
        setOwnerRejectPage={vi.fn()}
        setOwnerRejectSection={vi.fn()}
        statusConfig={{ bg: '#EAF6EC', color: '#2F7D32', label: 'Draft' }}
        updatedTimeDisplay="Updated now"
        versionSaveDisabled={false}
        versionSaveMessage="Saved"
      />
      <output aria-label="Invite dialog open">{String(inviteOpen)}</output>
    </>
  )
}

function VersionTableHarness() {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>('version-1')
  return (
    <VersionComparisonTable
      currentVersion={versions[1]}
      comparisons={comparisons}
      loading={false}
      error=""
      selectedVersionId={selectedVersionId}
      previousVersionCount={2}
      onSelectVersion={setSelectedVersionId}
      onRefresh={vi.fn()}
    />
  )
}

function CommentsHarness({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  const model = {
    add: async () => {
      onAdd(text)
      setText('')
    },
    addText: vi.fn(),
    comments: [],
    error: '',
    isCreating: false,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
    setText,
    text,
    toggleResolved: vi.fn(),
  } satisfies DocumentCommentsModel

  return <CommentsPanel active canComment canResolve documentId="document-1" model={model} />
}

describe('document editor accessibility', () => {
  it('submits comments through one native button without a fake attachment control', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const { container } = render(<CommentsHarness onAdd={onAdd} />)
    const send = screen.getByRole('button', { name: 'Add comment' })

    expect(send).toBeDisabled()
    expect(container.querySelector('img[src*="attachment-icon"]')).toBeNull()

    await user.type(screen.getByRole('textbox', { name: 'Comment' }), 'Review this clause')
    expect(send).toBeEnabled()
    send.focus()
    await user.keyboard('{Enter}')

    expect(onAdd).toHaveBeenCalledWith('Review this clause')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('exposes insight sections as keyboard disclosures', async () => {
    const user = userEvent.setup()
    const model = {
      data: insights,
      error: undefined,
      isLoading: false,
      refresh: vi.fn(),
      removeRisk: vi.fn(),
    } satisfies DocumentInsightsModel
    const { container } = render(
      <InsightsPanel
        active
        documentId="document-1"
        model={model}
        onAskPrism={vi.fn()}
        onFixRisk={vi.fn()}
      />,
    )

    const mainDocument = screen.getByRole('button', { name: /Agreement\.docx/ })
    expect(mainDocument).toHaveAttribute('aria-expanded', 'true')
    await tabTo(user, mainDocument)
    await user.keyboard('{Enter}')
    expect(mainDocument).toHaveAttribute('aria-expanded', 'false')

    const contextFile = screen.getByRole('button', { name: /Policy\.pdf/ })
    await tabTo(user, contextFile)
    await user.keyboard(' ')
    expect(contextFile).toHaveAttribute('aria-expanded', 'true')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('opens audit details from the keyboard', async () => {
    const user = userEvent.setup()
    const { container } = render(<AuditHarness />)
    const disclosure = screen.getByRole('button', { name: /Document Edited/ })

    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    await tabTo(user, disclosure)
    await user.keyboard('{Enter}')

    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: /Document Edited/ })).toHaveTextContent('New text')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('moves focus into and back out of the context files panel', async () => {
    const user = userEvent.setup()
    const { container } = render(<ContextFilesHarness />)
    const trigger = screen.getByRole('button', { name: 'Open context files' })

    await tabTo(user, trigger)
    await user.keyboard('{Enter}')
    expect(screen.getByRole('complementary', { name: 'Context files' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close context files' })).toHaveFocus()

    const preview = screen.getByRole('button', { name: 'Preview Policy.pdf' })
    await tabTo(user, preview)
    await user.keyboard('{Enter}')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('complementary', { name: 'Context files' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('provides a named document header and keyboard menu', async () => {
    const user = userEvent.setup()
    const onExportPdf = vi.fn().mockResolvedValue(true)
    const { container } = render(<HeaderHarness onExportPdf={onExportPdf} />)

    expect(screen.getByRole('banner', { name: 'Document header' })).toBeInTheDocument()
    const collaborators = screen.getByRole('button', { name: /Alex Morgan/ })
    await tabTo(user, collaborators)
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Invite dialog open')).toHaveTextContent('true')

    const menuTrigger = screen.getByRole('button', { name: 'More document actions' })
    await tabTo(user, menuTrigger)
    await user.keyboard('{Enter}')
    expect(menuTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Save as a Version' })).toHaveFocus(),
    )

    await user.keyboard('{ArrowDown}{Enter}')
    expect(onExportPdf).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(menuTrigger).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('keeps the export menu open and reports a failed download', async () => {
    const user = userEvent.setup()
    const onExportPdf = vi.fn().mockResolvedValue(false)
    render(<HeaderHarness exportError="PDF export was rejected." onExportPdf={onExportPdf} />)

    await user.click(screen.getByRole('button', { name: 'More document actions' }))
    await user.click(screen.getByRole('menuitem', { name: /Export as PDF/ }))

    expect(onExportPdf).toHaveBeenCalledOnce()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('PDF export was rejected.')
  })

  it('offers keyboard-selectable rows in the version table', async () => {
    const user = userEvent.setup()
    const { container } = render(<VersionTableHarness />)
    const table = screen.getByRole('table', { name: 'Saved version comparison' })
    const versionTwo = screen.getByRole('button', { name: 'Compare Version 2' })

    expect(table).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Compare Version 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const versionTwoRow = versionTwo.closest('tr')
    expect(versionTwoRow).not.toBeNull()
    expect(versionTwoRow).not.toHaveAttribute('tabindex')
    await user.click(within(versionTwoRow!).getAllByRole('cell')[1])
    expect(versionTwo).toHaveAttribute('aria-pressed', 'false')

    await tabTo(user, versionTwo)
    await user.keyboard('{Enter}')

    expect(versionTwo).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Highlights from Version 2' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})
