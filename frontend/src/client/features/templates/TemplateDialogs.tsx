import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button, IconButton } from '../../components/ui/Button'
import { templateFontFamily } from './templateLibraryModel'
import type { TemplateLibrarySession } from './useTemplateLibrary'

export function TemplateDialogs({ session }: { session: TemplateLibrarySession }) {
  if (!session.viewingTemplate) return null

  return (
    <AccessibleDialog
      open={session.viewModalOpen}
      onClose={() => session.actions.setViewModalOpen(false)}
      labelledBy="template-preview-title"
      contentStyle={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        width: '900px',
        height: '700px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #EDEDED',
        }}
      >
        <h3
          id="template-preview-title"
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 510,
            color: '#272727',
            fontFamily: templateFontFamily,
          }}
        >
          {session.viewingTemplate.name}
        </h3>
        <IconButton
          label="Close template preview"
          onClick={() => session.actions.setViewModalOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            color: '#999',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ×
        </IconButton>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#F5F5F5',
        }}
      >
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><style>
            html, body { margin: 0; width: 100%; min-height: 100%; box-sizing: border-box; }
            body { padding: 32px; font-family: system-ui, sans-serif; background: #fff; color: #272727; line-height: 1.6; font-size: 14px; }
            h1, h2, h3, h4, h5, h6 { margin-top: 0; }
            p { margin: 0 0 12px; }
            ul, ol { margin: 0 0 12px; padding-left: 24px; }
          </style></head><body>${session.viewContent}</body></html>`}
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #EDEDED',
            backgroundColor: '#FFFFFF',
          }}
          title="Template Preview"
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '16px 20px',
          borderTop: '1px solid #EDEDED',
        }}
      >
        <Button
          onClick={() => session.actions.setViewModalOpen(false)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#272727',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 510,
            color: '#FFFFFF',
            fontFamily: templateFontFamily,
          }}
        >
          Close
        </Button>
      </div>
    </AccessibleDialog>
  )
}
