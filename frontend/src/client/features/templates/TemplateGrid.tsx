import { Button } from '../../components/ui/Button'
import { TemplateCard } from './TemplateCard'
import type { TemplateLibrarySession } from './useTemplateLibrary'

export function TemplateGrid({ session }: { session: TemplateLibrarySession }) {
  return (
    <div
      style={{
        flex: 1,
        padding: '24px',
        overflow: 'auto',
        backgroundColor: '#F5F5F5',
      }}
    >
      {session.isLoading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
          }}
        >
          <span style={{ fontSize: '14px', color: '#666' }}>Loading templates...</span>
        </div>
      ) : session.isError ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            height: '220px',
          }}
        >
          <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
            Templates could not be loaded.
          </p>
          <Button
            onClick={() => session.actions.retry()}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#272727',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            Retry
          </Button>
        </div>
      ) : session.templates.length === 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '220px',
          }}
        >
          <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
            {session.categories.length === 0
              ? 'No templates available.'
              : 'No templates match your filters.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: session.isMobile
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fill, minmax(197px, 220px))',
            rowGap: '30px',
            columnGap: session.isMobile ? '12px' : '4px',
          }}
        >
          {session.templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              apiTemplate={template.apiTemplate}
              onClick={() => session.actions.openView(template.apiTemplate)}
              onContextMenu={(event) => session.actions.openPointerContextMenu(event, template)}
              onContextMenuKeyDown={(event) =>
                session.actions.openKeyboardContextMenu(event, template)
              }
              onPreview={() => session.actions.previewRoute(template.apiTemplate)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
