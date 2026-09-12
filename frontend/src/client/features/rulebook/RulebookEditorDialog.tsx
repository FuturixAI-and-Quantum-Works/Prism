import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Tab, TabList, TabPanel, Tabs } from '../../components/ui/Tabs'
import {
  rulebookFontFamily,
  selectedRulebookDocumentLabel,
  type RulebookModalState,
} from './rulebookModel'
import { DocumentChecklist, RulebookSelect } from './RulebookFields'
import { RulebookFaqRow } from './RulebookFaqRow'
import {
  primaryRulebookActionStyle,
  rulebookInputStyle,
  rulebookLabelStyle,
  rulebookTabStyle,
  secondaryRulebookActionStyle,
} from './rulebookStyles'
import { useRulebookEditor } from './useRulebookEditor'

export function RulebookEditorDialog({
  state,
  onClose,
  onCreatedReview,
}: {
  state: RulebookModalState | null
  onClose: () => void
  onCreatedReview: (reviewId: string) => void
}) {
  const session = useRulebookEditor({ state, onClose, onCreatedReview })
  if (!session.open) return null
  const { actions } = session

  return (
    <AccessibleDialog
      open={session.open}
      onClose={onClose}
      labelledBy="rulebook-dialog-title"
      overlayStyle={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      contentStyle={{
        width: '1040px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: '88vh',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 18px 44px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: rulebookFontFamily,
      }}
    >
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid #EDEDED',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div>
          <h2
            id="rulebook-dialog-title"
            style={{ margin: 0, fontSize: '19px', fontWeight: 590, color: '#272727' }}
          >
            {session.editingWorkflow ? session.editingWorkflow.title : 'New rulebook'}
          </h2>
          <div
            role="status"
            aria-live="polite"
            style={{ marginTop: '4px', fontSize: '12px', color: '#797979' }}
          >
            {session.draftFaqs.length} checks
          </div>
        </div>
        <button
          type="button"
          aria-label="Close rulebook"
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#F7F7F7',
            cursor: 'pointer',
            fontFamily: rulebookFontFamily,
          }}
        >
          x
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr', minHeight: 0, flex: 1 }}>
        <form
          onSubmit={actions.generate}
          style={{
            borderRight: '1px solid #EDEDED',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflow: 'auto',
          }}
        >
          <label htmlFor="rulebook-document-type" style={rulebookLabelStyle}>
            Document type
          </label>
          <input
            id="rulebook-document-type"
            disabled={session.isReadOnly}
            value={session.documentType}
            onChange={(event) => actions.setDocumentType(event.target.value)}
            placeholder="e.g. NDA, Lease Deed"
            style={rulebookInputStyle}
          />

          <label style={rulebookLabelStyle}>Sample document</label>
          <RulebookSelect
            label="Sample document"
            value={session.sampleDocumentId}
            options={[
              { value: '', label: 'None' },
              ...session.documents.map((document) => ({
                value: document.id,
                label: document.filename,
              })),
            ]}
            onChange={actions.setSampleDocumentId}
            disabled={session.isReadOnly || session.docsLoading}
            placeholder={session.docsLoading ? 'Loading...' : 'None'}
          />

          <div style={rulebookLabelStyle}>Target documents</div>
          <DocumentChecklist
            documents={session.documents}
            selectedIds={session.targetDocIds}
            onChange={actions.setTargetDocIds}
            loading={session.docsLoading}
            compact
            label="Target documents"
          />
          <div style={{ fontSize: '12px', color: '#797979' }}>
            {selectedRulebookDocumentLabel(session.documents, session.targetDocIds)}
          </div>

          <label htmlFor="rulebook-extra-instructions" style={rulebookLabelStyle}>
            Extra instructions
          </label>
          <textarea
            id="rulebook-extra-instructions"
            disabled={session.isReadOnly}
            value={session.extraRequirements}
            onChange={(event) => actions.setExtraRequirements(event.target.value)}
            placeholder="Jurisdiction, policy thresholds, deal-specific risks"
            style={{
              ...rulebookInputStyle,
              height: '88px',
              padding: '9px 10px',
              resize: 'vertical',
              lineHeight: 1.4,
            }}
          />

          <label htmlFor="rulebook-query-count" style={rulebookLabelStyle}>
            Number of questions
          </label>
          <input
            id="rulebook-query-count"
            disabled={session.isReadOnly}
            type="number"
            min={4}
            max={30}
            value={session.queryCount}
            onChange={(event) => actions.setQueryCount(Number(event.target.value))}
            style={rulebookInputStyle}
          />

          <button
            type="submit"
            aria-busy={session.isGenerating}
            disabled={session.isReadOnly || session.isGenerating}
            style={{
              height: '38px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#272727',
              color: '#FFFFFF',
              cursor: session.isReadOnly || session.isGenerating ? 'default' : 'pointer',
              opacity: session.isReadOnly || session.isGenerating ? 0.45 : 1,
              fontFamily: rulebookFontFamily,
            }}
          >
            {session.isGenerating ? 'Generating...' : 'Generate FAQs'}
          </button>
        </form>

        <Tabs
          value={session.activeView}
          onValueChange={(value) => actions.setActiveView(value as 'checklist' | 'columns')}
        >
          <div style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #EDEDED',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <input
                aria-label="Rulebook title"
                disabled={session.isReadOnly}
                value={session.draftTitle}
                onChange={(event) => actions.setDraftTitle(event.target.value)}
                placeholder="Rulebook title"
                style={{ ...rulebookInputStyle, height: '36px', fontWeight: 590 }}
              />
              <TabList
                aria-label="Rulebook editor views"
                style={{
                  display: 'flex',
                  gap: '6px',
                  backgroundColor: '#F7F7F7',
                  borderRadius: '8px',
                  padding: '3px',
                }}
              >
                <Tab value="checklist" style={rulebookTabStyle(session.activeView === 'checklist')}>
                  Checklist
                </Tab>
                <Tab value="columns" style={rulebookTabStyle(session.activeView === 'columns')}>
                  Columns
                </Tab>
              </TabList>
            </div>

            <TabPanel
              value={session.activeView}
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '14px 16px',
                backgroundColor: '#FCFCFC',
              }}
            >
              {session.draftFaqs.length === 0 ? (
                <div
                  style={{
                    height: '240px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#797979',
                    fontSize: '14px',
                  }}
                >
                  Generated questions will appear here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {session.draftFaqs.map((faq, index) => (
                    <RulebookFaqRow
                      key={faq.id}
                      faq={faq}
                      index={index}
                      total={session.draftFaqs.length}
                      view={session.activeView}
                      readOnly={session.isReadOnly}
                      onChange={(patch) => actions.updateFaq(faq.id, patch)}
                      onMove={(direction) => actions.moveFaq(faq.id, direction)}
                      onRemove={() => actions.removeFaq(faq.id)}
                    />
                  ))}
                </div>
              )}
            </TabPanel>

            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #EDEDED',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!session.isReadOnly && (
                  <button
                    type="button"
                    onClick={actions.addFaq}
                    style={{
                      height: '34px',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 12px',
                      backgroundColor: '#F7F7F7',
                      cursor: 'pointer',
                      fontFamily: rulebookFontFamily,
                    }}
                  >
                    Add query
                  </button>
                )}
                {session.error && (
                  <div role="alert" style={{ color: '#C83A2D', fontSize: '12px' }}>
                    {session.error}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    height: '36px',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 14px',
                    backgroundColor: '#F7F7F7',
                    cursor: 'pointer',
                    fontFamily: rulebookFontFamily,
                  }}
                >
                  Cancel
                </button>
                {!session.isReadOnly && (
                  <>
                    <button
                      type="button"
                      aria-busy={session.saving}
                      onClick={() => void actions.save()}
                      disabled={!session.canSave || session.saving}
                      style={secondaryRulebookActionStyle(!session.canSave || session.saving)}
                    >
                      {session.saving ? 'Saving...' : 'Save rulebook'}
                    </button>
                    <button
                      type="button"
                      aria-busy={session.saving}
                      onClick={() => void actions.saveAndCreateReview()}
                      disabled={
                        !session.canSave || session.saving || session.targetDocIds.length === 0
                      }
                      style={primaryRulebookActionStyle(
                        !session.canSave || session.saving || session.targetDocIds.length === 0,
                      )}
                    >
                      Save + Create review
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </AccessibleDialog>
  )
}
