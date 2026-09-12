import { useState } from 'react'
import TiptapEditor from '../editor/TiptapEditorFeature'

export function TemplateWorkspace({
  editorContent,
  onEditorContentChange,
  onEditorFocusChange,
}: {
  editorContent: string
  onEditorContentChange: (content: string) => void
  onEditorFocusChange: (focused: boolean) => void
}) {
  const [zoom, setZoom] = useState(100)

  return (
    <section
      id="template-preview-content"
      role="region"
      aria-label="Template editor"
      style={{
        flex: 1,
        backgroundColor: '#F5F5F5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDEDED',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <TiptapEditor
          content={editorContent}
          onContentChange={onEditorContentChange}
          editable
          placeholder="Template content will appear here..."
          zoom={zoom}
          onZoomChange={setZoom}
          onFocusChange={onEditorFocusChange}
        />
      </div>
    </section>
  )
}
