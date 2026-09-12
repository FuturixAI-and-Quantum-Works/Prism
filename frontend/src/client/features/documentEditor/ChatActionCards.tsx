import type { DocumentEditAnnotation } from '../documents/documentsApi'
import type {
  CompareDocumentsToolState,
  ExtractClausesToolState,
  SuggestEditToolState,
} from './chatToolEvents'
import type { PlaceholderToolState } from './placeholderModel'
import { getPlaceholderInputHint } from './placeholderModel'
import { CompareDocumentsCard } from './CompareDocumentsCard'
import { ExtractClausesCard } from './ExtractClausesCard'
import { SuggestEditCard } from './SuggestEditCard'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface PlaceholderCardProps {
  canFill: boolean
  documentId: string | undefined
  onChange: (key: string, value: string) => void
  onSave: () => Promise<void>
  tool: PlaceholderToolState | null
  values: Record<string, string>
}

function PlaceholderCard({
  canFill,
  documentId,
  onChange,
  onSave,
  tool,
  values,
}: PlaceholderCardProps) {
  if (!tool) return null

  const isIncomplete = tool.fields.some((field) => !values[field.key]?.trim())
  const saveDisabled = !canFill || tool.status === 'saving' || isIncomplete
  const fieldsDisabled =
    (!!documentId && !canFill) || tool.status === 'saving' || tool.status === 'applied'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '14px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDEDED',
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 590,
                color: '#272727',
                letterSpacing: '-0.5px',
              }}
            >
              Fill document details
            </div>
            <div style={{ fontSize: '12px', color: '#797979', marginTop: '3px' }}>
              {tool.fields.length} placeholder{tool.fields.length === 1 ? '' : 's'} found in this
              document
            </div>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 590,
              color:
                tool.status === 'applied'
                  ? '#2F7D32'
                  : tool.status === 'error'
                    ? '#C83A2D'
                    : '#454545',
              backgroundColor:
                tool.status === 'applied'
                  ? '#EAF6EC'
                  : tool.status === 'error'
                    ? '#FDECEA'
                    : '#F7F7F7',
              borderRadius: '999px',
              padding: '5px 8px',
            }}
          >
            {tool.status === 'saving'
              ? 'Applying'
              : tool.status === 'applied'
                ? 'Applied'
                : tool.status === 'error'
                  ? 'Needs attention'
                  : 'Ready'}
          </span>
        </div>

        {tool.message && (
          <div
            style={{
              fontSize: '12px',
              lineHeight: '17px',
              color: tool.status === 'error' ? '#C83A2D' : '#666666',
            }}
          >
            {tool.message}
          </div>
        )}

        {tool.fields.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tool.fields.map((field) => (
              <label
                key={field.key}
                style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 590,
                    color: '#454545',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {field.label}
                  <span style={{ color: '#999999', fontWeight: 400 }}> · {field.occurrences}x</span>
                </span>
                {field.type === 'textarea' ? (
                  <textarea
                    value={values[field.key] ?? ''}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    disabled={fieldsDisabled}
                    placeholder={getPlaceholderInputHint(field)}
                    rows={3}
                    style={{
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      padding: '9px 10px',
                      resize: 'vertical',
                      minHeight: '72px',
                      fontFamily,
                      fontSize: '13px',
                      color: '#272727',
                    }}
                  />
                ) : (
                  <input
                    type={
                      field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
                    }
                    value={values[field.key] ?? ''}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    disabled={fieldsDisabled}
                    placeholder={getPlaceholderInputHint(field)}
                    style={{
                      height: '38px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      padding: '0 10px',
                      fontFamily,
                      fontSize: '13px',
                      color: '#272727',
                    }}
                  />
                )}
              </label>
            ))}
          </div>
        )}

        {tool.fields.length > 0 && tool.status !== 'applied' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {tool.fields.length >= 2 && (
              <button
                onClick={onSave}
                disabled={saveDisabled}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  border: '1px solid #E0E0E0',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  color: '#454545',
                  fontFamily,
                  fontSize: '13px',
                  fontWeight: 590,
                  cursor: !canFill || tool.status === 'saving' ? 'not-allowed' : 'pointer',
                  opacity: saveDisabled ? 0.55 : 1,
                }}
              >
                Accept all
              </button>
            )}
            <button
              onClick={onSave}
              disabled={saveDisabled}
              style={{
                height: '40px',
                flex: 1,
                border: 'none',
                borderRadius: '10px',
                backgroundColor: '#272727',
                color: '#FFFFFF',
                fontFamily,
                fontSize: '13px',
                fontWeight: 590,
                cursor: !canFill || tool.status === 'saving' ? 'not-allowed' : 'pointer',
                opacity: saveDisabled ? 0.55 : 1,
              }}
            >
              {!canFill
                ? 'Drafter access required'
                : tool.status === 'saving'
                  ? 'Saving details...'
                  : 'Save details and apply tracked changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface PendingEditsProps {
  actionId: string | null
  canEdit: boolean
  edits: DocumentEditAnnotation[]
  onResolve: (edit: DocumentEditAnnotation, mode: 'accept' | 'reject') => Promise<void>
}

function PendingEdits({ actionId, canEdit, edits, onResolve }: PendingEditsProps) {
  if (edits.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 590,
          color: '#797979',
          letterSpacing: '-0.3px',
        }}
      >
        Pending tracked changes
      </div>
      {edits.map((edit) => (
        <div
          key={edit.edit_id}
          style={{
            border: '1px solid #EDEDED',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 590, color: '#454545' }}>
            {edit.reason || 'Suggested change'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div
              style={{
                fontSize: '12px',
                color: '#A33A2A',
                textDecoration: 'line-through',
                wordBreak: 'break-word',
              }}
            >
              {edit.deleted_text || 'Insert text'}
            </div>
            <div style={{ fontSize: '12px', color: '#2F7D32', wordBreak: 'break-word' }}>
              {edit.inserted_text || 'Delete text'}
            </div>
          </div>
          {canEdit && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onResolve(edit, 'accept')}
                disabled={actionId === edit.edit_id}
                style={{
                  flex: 1,
                  height: '34px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#272727',
                  color: '#FFFFFF',
                  cursor: actionId === edit.edit_id ? 'not-allowed' : 'pointer',
                  fontFamily,
                  fontSize: '12px',
                  fontWeight: 590,
                }}
              >
                Accept
              </button>
              <button
                onClick={() => onResolve(edit, 'reject')}
                disabled={actionId === edit.edit_id}
                style={{
                  flex: 1,
                  height: '34px',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#454545',
                  cursor: actionId === edit.edit_id ? 'not-allowed' : 'pointer',
                  fontFamily,
                  fontSize: '12px',
                  fontWeight: 590,
                }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

interface ChatActionCardsProps {
  actionId: string | null
  canEdit: boolean
  canFill: boolean
  compareTool: CompareDocumentsToolState | null
  documentId: string | undefined
  edits: DocumentEditAnnotation[]
  extractTool: ExtractClausesToolState | null
  onChangePlaceholder: (key: string, value: string) => void
  onDismissClauses: () => void
  onDismissCompare: () => void
  onDismissSuggestions: () => void
  onResolveEdit: (edit: DocumentEditAnnotation, mode: 'accept' | 'reject') => Promise<void>
  onSavePlaceholders: () => Promise<void>
  placeholderTool: PlaceholderToolState | null
  placeholderValues: Record<string, string>
  suggestTool: SuggestEditToolState | null
}

export function ChatActionCards(props: ChatActionCardsProps) {
  return (
    <>
      <PlaceholderCard
        canFill={props.canFill}
        documentId={props.documentId}
        onChange={props.onChangePlaceholder}
        onSave={props.onSavePlaceholders}
        tool={props.placeholderTool}
        values={props.placeholderValues}
      />
      <CompareDocumentsCard model={props.compareTool} onDismiss={props.onDismissCompare} />
      <ExtractClausesCard model={props.extractTool} onDismiss={props.onDismissClauses} />
      <SuggestEditCard model={props.suggestTool} onDismiss={props.onDismissSuggestions} />
      <PendingEdits
        actionId={props.actionId}
        canEdit={props.canEdit}
        edits={props.edits}
        onResolve={props.onResolveEdit}
      />
    </>
  )
}
