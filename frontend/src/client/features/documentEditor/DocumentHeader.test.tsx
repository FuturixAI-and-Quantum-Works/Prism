import { createRef } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DocumentHeader } from './DocumentHeader'

function renderHeader(handleSaveVersion: () => Promise<boolean>) {
  const setMoreOptionsDropdownOpen = vi.fn()
  render(
    <DocumentHeader
      canEditDocument
      canManageDocumentSharing={false}
      canOwnerReviewApproval={false}
      canSendForApproval={false}
      displayedCollaborators={[]}
      docName="Agreement"
      exportDisabled={false}
      exportError={null}
      handleExportDocx={vi.fn().mockResolvedValue(true)}
      handleExportPdf={vi.fn().mockResolvedValue(true)}
      handleSaveVersion={handleSaveVersion}
      isEditorFocused={false}
      isExporting={false}
      isSavingVersion={false}
      isSendingForApproval={false}
      moreOptionsDropdownOpen
      moreOptionsDropdownRef={createRef<HTMLDivElement>()}
      setApprovalError={vi.fn()}
      setApprovalModalOpen={vi.fn()}
      setInviteError={vi.fn()}
      setInviteModalOpen={vi.fn()}
      setInviteNotice={vi.fn()}
      setMoreOptionsDropdownOpen={setMoreOptionsDropdownOpen}
      setOwnerApprovalError={vi.fn()}
      setOwnerApproveModalOpen={vi.fn()}
      setOwnerRejectAnchor={vi.fn()}
      setOwnerRejectModalOpen={vi.fn()}
      setOwnerRejectNote={vi.fn()}
      setOwnerRejectPage={vi.fn()}
      setOwnerRejectSection={vi.fn()}
      statusConfig={{ bg: '#FFFFFF', color: '#272727', label: 'Draft' }}
      updatedTimeDisplay="Now"
      versionSaveDisabled={false}
      versionSaveMessage=""
    />,
  )
  return setMoreOptionsDropdownOpen
}

describe('DocumentHeader save menu', () => {
  it('keeps the menu open when saving fails', async () => {
    const setOpen = renderHeader(vi.fn().mockResolvedValue(false))

    await userEvent.click(screen.getByRole('menuitem', { name: 'Save as a Version' }))

    expect(setOpen).not.toHaveBeenCalledWith(false)
  })

  it('closes the menu only after saving succeeds', async () => {
    const setOpen = renderHeader(vi.fn().mockResolvedValue(true))

    await userEvent.click(screen.getByRole('menuitem', { name: 'Save as a Version' }))

    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false))
  })
})
