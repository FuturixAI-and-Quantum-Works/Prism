import type { Editor } from '@tiptap/core'
import { EditorContent } from '@tiptap/react'

interface EditorSurfaceProps {
  editor: Editor
  editable: boolean
  zoom: number
}

export function EditorSurface({ editor, editable, zoom }: EditorSurfaceProps) {
  const scale = zoom / 100

  return (
    <>
      <div
        className="tiptap-editor-scroll"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '40px',
          backgroundColor: '#F8F9FA',
        }}
      >
        <div
          style={{
            width: `${816 * scale}px`,
            minHeight: `${1056 * scale}px`,
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            borderRadius: '2px',
            padding: `${72 * scale}px`,
            transformOrigin: 'top center',
            transition: 'all 0.2s ease',
          }}
        >
          <EditorContent
            editor={editor}
            aria-label={editable ? 'Document editor' : 'Document content'}
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: `${12 * scale}pt`,
              lineHeight: '1.6',
              color: '#333333',
            }}
          />
        </div>
      </div>

      <style>{`
        .tiptap-editor-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .tiptap-editor-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .tiptap-editor-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 10px;
        }
        .tiptap-editor-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.25);
        }
        .tiptap-editor-scroll::-webkit-scrollbar-button {
          display: none;
          width: 0;
          height: 0;
        }
        .tiptap-editor-scroll::-webkit-scrollbar-corner {
          background: transparent;
        }
        .tiptap-editor-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
        }

        .tiptap {
          outline: none;
          min-height: 400px;
        }
        .tiptap p {
          margin: 0 0 1em 0;
        }
        .tiptap .tableWrapper {
          overflow-x: auto;
          margin: 8pt 0;
        }
        .tiptap table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 8pt 0;
        }
        .tiptap td,
        .tiptap th {
          border: 1px solid #444;
          box-sizing: border-box;
          min-width: 1em;
          padding: 4pt 6pt;
          position: relative;
          vertical-align: top;
        }
        .tiptap th {
          background-color: #F8F9FA;
          font-weight: 700;
        }
        .tiptap td > p,
        .tiptap th > p {
          margin: 0 0 6pt 0;
        }
        .tiptap td > p:last-child,
        .tiptap th > p:last-child {
          margin-bottom: 0;
        }
        .tiptap .column-resize-handle {
          background-color: #454545;
          bottom: -2px;
          pointer-events: none;
          position: absolute;
          right: -2px;
          top: 0;
          width: 4px;
        }
        .tiptap.resize-cursor {
          cursor: ew-resize;
          cursor: col-resize;
        }
        .tiptap h1 {
          font-size: ${24 * scale}pt;
          font-weight: bold;
          margin: 0 0 0.5em 0;
          color: #1a1a1a;
        }
        .tiptap h2 {
          font-size: ${18 * scale}pt;
          font-weight: bold;
          margin: 1em 0 0.5em 0;
          color: #1a1a1a;
        }
        .tiptap h3 {
          font-size: ${14 * scale}pt;
          font-weight: bold;
          margin: 1em 0 0.5em 0;
          color: #1a1a1a;
        }
        .tiptap ul, .tiptap ol {
          padding-left: 1.5em;
          margin: 0 0 1em 0;
        }
        .tiptap li {
          margin: 0.25em 0;
        }
        .tiptap a {
          color: #272727;
          text-decoration: underline;
        }
        .tiptap mark {
          background-color: #FEF08A;
          padding: 0 2px;
          border-radius: 2px;
        }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9CA3AF;
          pointer-events: none;
          height: 0;
        }
        .tiptap blockquote {
          border-left: 4px solid #E5E7EB;
          padding-left: 1em;
          margin-left: 0;
          font-style: italic;
          color: #6B7280;
        }
        .tiptap hr {
          border: none;
          border-top: 1px solid #E5E7EB;
          margin: 2em 0;
        }
        .tiptap code {
          background-color: #F3F4F6;
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.9em;
          color: #EF4444;
        }
        .tiptap pre {
          background-color: #1F2937;
          color: #F9FAFB;
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
        }
        .tiptap pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        .bottleneck-highlight {
          background: rgba(251, 191, 36, 0.35);
          border-bottom: 2px solid #F59E0B;
          border-radius: 2px;
          transition: background 0.5s ease-out;
        }
      `}</style>
    </>
  )
}
