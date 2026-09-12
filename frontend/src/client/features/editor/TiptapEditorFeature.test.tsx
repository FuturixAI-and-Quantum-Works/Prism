import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TiptapEditorFeature from './TiptapEditorFeature'

const tiptap = vi.hoisted(() => ({
  useEditor: vi.fn(),
}))

vi.mock('@tiptap/react', () => ({
  useEditor: tiptap.useEditor,
  EditorContent: ({ 'aria-label': ariaLabel }: { 'aria-label'?: string }) => (
    <div aria-label={ariaLabel} contentEditable />
  ),
}))

function createEditor(html: string) {
  return {
    can: () => ({ redo: () => true, undo: () => true }),
    chain: vi.fn(),
    commands: { setContent: vi.fn() },
    getAttributes: () => ({ href: '' }),
    getHTML: () => html,
    isActive: () => false,
    setEditable: vi.fn(),
  }
}

describe('TiptapEditorFeature behavior', () => {
  it('sanitizes initial and replacement content before it reaches the editor', () => {
    const editor = createEditor('<p>Safe</p>')
    let initialContent = ''
    let extensionNames: string[] = []
    tiptap.useEditor.mockImplementation((options: unknown) => {
      const editorOptions = options as {
        content: string
        extensions: Array<{ name: string }>
      }
      initialContent = editorOptions.content
      extensionNames = editorOptions.extensions.map((extension) => extension.name)
      return editor
    })

    const { rerender } = render(
      <TiptapEditorFeature content="<p>Safe</p><script>alert('unsafe')</script>" />,
    )
    expect(initialContent).toBe('<p>Safe</p>')
    expect(extensionNames).toEqual([
      'starterKit',
      'underline',
      'placeholder',
      'textAlign',
      'highlight',
      'link',
      'table',
      'tableRow',
      'tableHeader',
      'tableCell',
      'preservedDocxStyles',
      'styledSpan',
      'bottleneckHighlight',
    ])

    rerender(<TiptapEditorFeature content="<p>Updated</p><iframe src='unsafe'></iframe>" />)
    expect(editor.commands.setContent).toHaveBeenLastCalledWith('<p>Updated</p>')
  })

  it('preserves toolbar labels, zoom bounds, and editor lifecycle callbacks', async () => {
    const editor = createEditor('<p>Safe</p>')
    const onEditorReady = vi.fn()
    const onZoomChange = vi.fn()
    tiptap.useEditor.mockReturnValue(editor)
    const user = userEvent.setup()

    const { rerender, unmount } = render(
      <TiptapEditorFeature
        content="<p>Safe</p>"
        zoom={25}
        onZoomChange={onZoomChange}
        onEditorReady={onEditorReady}
      />,
    )

    expect(screen.getByRole('toolbar', { name: 'Document formatting' })).toBeInTheDocument()
    expect(screen.getByLabelText('Document editor')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zoom Out' }))
    expect(onZoomChange).toHaveBeenLastCalledWith(25)

    rerender(
      <TiptapEditorFeature
        content="<p>Safe</p>"
        zoom={300}
        onZoomChange={onZoomChange}
        onEditorReady={onEditorReady}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Zoom In' }))
    expect(onZoomChange).toHaveBeenLastCalledWith(300)
    expect(onEditorReady).toHaveBeenCalledWith(editor)

    unmount()
    expect(onEditorReady).toHaveBeenLastCalledWith(null)
  })
})
