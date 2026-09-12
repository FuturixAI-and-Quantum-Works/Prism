import { describe, expect, it } from 'vitest'

const composerSources = import.meta.glob(
  [
    './ChatComposer.tsx',
    './ChatComposerPresentation.tsx',
    './ChatComposerToolbar.tsx',
    './chatComposerModel.ts',
    './DocumentEditorRightPanel.tsx',
    './DocumentEditorWorkspace.tsx',
    './useDocumentChat.ts',
    './useWorkspaceUi.ts',
    './workspaceOptions.ts',
  ],
  { eager: true, import: 'default', query: '?raw' },
) as Record<string, string>

const gatedSources = import.meta.glob(
  [
    '../assistant/conversation/ConversationScreen.tsx',
    '../assistant/conversation/useConversationController.ts',
    '../assistant/conversation/conversationModel.ts',
    '../review/ReviewDetailHeader.tsx',
    '../review/ReviewDetailScreen.tsx',
  ],
  { eager: true, import: 'default', query: '?raw' },
) as Record<string, string>

describe('editor prototype cleanup', () => {
  it('keeps model selection in settings instead of the editor composer', () => {
    const source = Object.values(composerSources).join('\n')

    expect(source).not.toMatch(/AIModel|aiModels|selectedModel|modelDropdown|AI model:/)
    expect(composerSources['./useDocumentChat.ts']).not.toMatch(/\bmodel\s*:/)
  })

  it('does not expose local attachment controls that cannot reach chat requests', () => {
    const source = Object.values(composerSources).join('\n')

    expect(source).not.toMatch(
      /ChatComposerAttachmentPicker|Add files or sources|isAddDropdownOpen|addDropdownRef|handleFileUpload/,
    )
  })

  it('does not expose search modes that never reach chat requests', () => {
    const source = Object.values(composerSources).join('\n')

    expect(source).not.toMatch(
      /ChatComposerModeControls|Search mode:|searchOptions|selectedSearch|isSearchDropdownOpen/,
    )
  })

  it('does not retain dead popup or review feature gates', () => {
    const source = Object.values(gatedSources).join('\n')

    expect(source).not.toMatch(/SHOW_[A-Z0-9_]+/)
    expect(source).not.toMatch(/selectionPopup|ReviewChatPanel/)
    expect(source).not.toMatch(/console\.log/)
  })

  it('composes chat and placeholder workflows without a mutable callback bridge', () => {
    const source = composerSources['./DocumentEditorWorkspace.tsx']

    expect(source).not.toMatch(/chatActionsRef/)
    expect(source).not.toMatch(/append\?:/)
    expect(source).not.toMatch(/streamLocal\?:/)
    expect(source).toMatch(/placeholder\.submit/)
    expect(source).toMatch(/chat\.streamLocal/)
  })
})
