import pencilEditIcon from '../../assets/pencil-edit-icon.svg'
import trashIcon from '../../assets/trash-icon.svg'
import { formatRulebookDate, rulebookFontFamily, workflowColumnCount } from './rulebookModel'
import { rulebookInputStyle } from './rulebookStyles'
import type { RulebookListSession } from './useRulebookListSession'

export function RulebookList({ session }: { session: RulebookListSession }) {
  const { actions } = session

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid #EDEDED',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 590,
              color: '#454545',
              letterSpacing: '-0.4px',
            }}
          >
            Rulebooks
          </h1>
          <input
            data-global-search
            aria-label="Search rulebooks"
            value={session.searchQuery}
            onChange={(event) => actions.setSearchQuery(event.target.value)}
            placeholder="Search rulebooks"
            style={{
              ...rulebookInputStyle,
              width: '320px',
              height: '32px',
              backgroundColor: '#F7F7F7',
              border: 'none',
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => actions.setRulebookModal({ mode: 'new' })}
          style={{
            height: '34px',
            padding: '0 14px',
            backgroundColor: '#272727',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: rulebookFontFamily,
          }}
        >
          New rulebook
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#F5F5F5' }}>
        {session.isLoading ? (
          <div role="status" aria-live="polite" style={{ padding: '24px', color: '#797979' }}>
            Loading rulebooks...
          </div>
        ) : session.isError ? (
          <div role="alert" style={{ padding: '24px', color: '#C83A2D' }}>
            Could not load rulebooks.
          </div>
        ) : session.workflows.length === 0 ? (
          <div
            style={{
              height: '320px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '12px',
              color: '#797979',
            }}
          >
            <div style={{ fontSize: '17px', fontWeight: 510, color: '#454545' }}>
              No rulebooks yet
            </div>
            <button
              type="button"
              onClick={() => actions.setRulebookModal({ mode: 'new' })}
              style={{
                height: '36px',
                padding: '0 14px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#272727',
                color: '#FFFFFF',
                fontFamily: rulebookFontFamily,
                cursor: 'pointer',
              }}
            >
              Create rulebook
            </button>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid #EDEDED',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            {session.workflows.map((workflow) => (
              <div
                key={workflow.id}
                onContextMenu={(event) => actions.openPointerContextMenu(event, workflow)}
                onKeyDown={(event) => actions.openKeyboardContextMenu(event, workflow)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 170px 110px 120px 240px',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderBottom: '1px solid #F1F1F1',
                  cursor: 'context-menu',
                }}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={session.contextMenu?.workflow.id === workflow.id}
                  aria-controls="rulebook-context-menu"
                  onClick={() => actions.setRulebookModal({ mode: 'edit', workflow })}
                  style={{
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                    fontFamily: rulebookFontFamily,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 590,
                      color: '#272727',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {workflow.title}
                  </div>
                  <div style={{ marginTop: '3px', fontSize: '12px', color: '#797979' }}>
                    {workflow.is_owner === false
                      ? `Shared by ${workflow.shared_by_name ?? 'someone'}`
                      : 'Owned by you'}
                  </div>
                </button>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#454545',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {workflow.practice || 'General'}
                </div>
                <div style={{ fontSize: '13px', color: '#797979' }}>
                  {workflowColumnCount(workflow)} checks
                </div>
                <div style={{ fontSize: '13px', color: '#797979' }}>
                  {formatRulebookDate(workflow.updatedAt)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => actions.setReviewWorkflow(workflow)}
                    style={{
                      height: '30px',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 10px',
                      backgroundColor: '#F7F7F7',
                      cursor: 'pointer',
                      fontFamily: rulebookFontFamily,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 3V13M3 8H13"
                        stroke="#454545"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => actions.setRulebookModal({ mode: 'edit', workflow })}
                    style={{
                      height: '30px',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 10px',
                      backgroundColor: '#F7F7F7',
                      cursor: 'pointer',
                      fontFamily: rulebookFontFamily,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <img src={pencilEditIcon} alt="" style={{ width: '14px', height: '14px' }} />
                    {workflow.allow_edit ? 'Edit' : 'Open'}
                  </button>
                  {workflow.allow_edit && (
                    <button
                      type="button"
                      onClick={() => void actions.removeWorkflow(workflow)}
                      style={{
                        height: '30px',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 10px',
                        backgroundColor: '#FDECEC',
                        color: '#E53935',
                        cursor: 'pointer',
                        fontFamily: rulebookFontFamily,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <img
                        src={trashIcon}
                        alt=""
                        style={{
                          width: '14px',
                          height: '14px',
                          filter:
                            'invert(28%) sepia(93%) saturate(1654%) hue-rotate(342deg) brightness(89%) contrast(97%)',
                        }}
                      />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
