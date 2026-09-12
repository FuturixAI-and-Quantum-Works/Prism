import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react'
import type { BrowseFile } from '../files/fileBrowserTypes'
import type { FilePreviewFile } from '../../components/FilePreviewModal'
import filesFolderIcon from '../../assets/document-editor/files-folder.svg'
import licenseDraftIcon from '../../assets/document-editor/license-draft.svg'
import chartBarIcon from '../../assets/document-editor/chart-bar.svg'
import historyClockIcon from '../../assets/history/clock-icon.svg'
import historyArrowDownIcon from '../../assets/history/arrow-down-icon.svg'
import versionsHistoryIcon from '../../assets/history/versions-history-icon.svg'
import chatHistoryIcon from '../../assets/history/chat-history-icon.svg'
import versionItemIcon from '../../assets/history/version-item-icon.svg'
import historyMessageIcon from '../../assets/history/message-icon.svg'
import type { DocumentChatMessage, DocumentVersion } from '../documents/documentsApi'
import { formatVersionDateTime } from './editorUtilities'
import { ContextFilesPanel } from './ContextFilesPanel'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface DocumentSidebarProps {
  activeTab: 'canvas' | 'tabular'
  attachedFilesForPanel: BrowseFile[]
  chatHistoryPanelOpen: boolean
  currentVersionId: string | null
  documentChatHistory: DocumentChatMessage[]
  documentFilename?: string
  filesError?: string | null
  filesPanelOpen: boolean
  handleRemoveContextFile: (fileId: string) => Promise<void>
  handleSidebarFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  historyDropdownOpen: boolean
  historyPanelOpen: boolean
  isUploadingFile: boolean
  setActiveStatusTab: Dispatch<SetStateAction<string>>
  setActiveTab: Dispatch<SetStateAction<'canvas' | 'tabular'>>
  setBrowseFilesModalOpen: Dispatch<SetStateAction<boolean>>
  setChatHistoryPanelOpen: Dispatch<SetStateAction<boolean>>
  setFilesPanelOpen: Dispatch<SetStateAction<boolean>>
  setHistoryDropdownOpen: Dispatch<SetStateAction<boolean>>
  setHistoryPanelOpen: Dispatch<SetStateAction<boolean>>
  setPreviewFile: Dispatch<SetStateAction<FilePreviewFile | null>>
  sidebarFileInputRef: RefObject<HTMLInputElement | null>
  versionHistory: DocumentVersion[]
}

export function DocumentSidebar({
  activeTab,
  attachedFilesForPanel,
  chatHistoryPanelOpen,
  currentVersionId,
  documentChatHistory,
  documentFilename,
  filesError,
  filesPanelOpen,
  handleRemoveContextFile,
  handleSidebarFileUpload,
  historyDropdownOpen,
  historyPanelOpen,
  isUploadingFile,
  setActiveStatusTab,
  setActiveTab,
  setBrowseFilesModalOpen,
  setChatHistoryPanelOpen,
  setFilesPanelOpen,
  setHistoryDropdownOpen,
  setHistoryPanelOpen,
  setPreviewFile,
  sidebarFileInputRef,
  versionHistory,
}: DocumentSidebarProps) {
  return (
    <>
      {
        <div
          style={{
            width: '175px',
            backgroundColor: '#FFFFFF',
            borderRight: '0.5px solid #EDEDED',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
          }}
        >
          <div style={{ padding: '0 8px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#6B6B6B',
                letterSpacing: '-0.7px',
              }}
            >
              Workspace
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'canvas' as const, icon: licenseDraftIcon, label: 'Canvas' },
              { id: 'tabular' as const, icon: chartBarIcon, label: 'Tabular view' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: activeTab === item.id ? '#F7F7F7' : 'transparent',
                  cursor: 'pointer',
                  border: 'none',
                  width: '100%',
                  fontFamily,
                }}
              >
                <img src={item.icon} alt="" style={{ width: '16px', height: '16px' }} />
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.8px',
                  }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                aria-expanded={historyDropdownOpen}
                onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '32px',
                  padding: '10px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  width: '100%',
                  fontFamily,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <img
                    src={historyClockIcon}
                    alt=""
                    style={{ width: '16px', height: '16px', flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.8px',
                      lineHeight: '21px',
                      whiteSpace: 'nowrap',
                      fontFamily,
                    }}
                  >
                    History
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={historyArrowDownIcon}
                    alt=""
                    style={{
                      width: '16px',
                      height: '16px',
                      transform: historyDropdownOpen ? 'scaleY(-1)' : 'scaleY(1)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </div>
              </button>

              {historyDropdownOpen && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <button
                    type="button"
                    aria-pressed={historyPanelOpen}
                    onClick={() => {
                      setHistoryPanelOpen(true)
                      setChatHistoryPanelOpen(false)
                      setFilesPanelOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '10px 15px',
                      borderRadius: '4px',
                      backgroundColor: historyPanelOpen ? '#F7F7F7' : 'transparent',
                      cursor: 'pointer',
                      border: 'none',
                      width: '100%',
                      fontFamily,
                    }}
                  >
                    <img
                      src={versionsHistoryIcon}
                      alt=""
                      style={{ width: '18px', height: '18px', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 510,
                        color: '#454545',
                        letterSpacing: '-0.7px',
                        lineHeight: '16px',
                        whiteSpace: 'nowrap',
                        fontFamily,
                      }}
                    >
                      Versions History
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={chatHistoryPanelOpen}
                    onClick={() => {
                      setChatHistoryPanelOpen(true)
                      setHistoryPanelOpen(false)
                      setFilesPanelOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '10px 15px',
                      borderRadius: '4px',
                      backgroundColor: chatHistoryPanelOpen ? '#F7F7F7' : 'transparent',
                      cursor: 'pointer',
                      border: 'none',
                      width: '100%',
                      fontFamily,
                    }}
                  >
                    <img
                      src={chatHistoryIcon}
                      alt=""
                      style={{ width: '18px', height: '18px', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 510,
                        color: '#454545',
                        letterSpacing: '-0.7px',
                        lineHeight: '16px',
                        whiteSpace: 'nowrap',
                        fontFamily,
                      }}
                    >
                      Chat history
                    </span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-pressed={filesPanelOpen}
              onClick={() => {
                setFilesPanelOpen(!filesPanelOpen)
                setHistoryPanelOpen(false)
                setChatHistoryPanelOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: filesPanelOpen ? '#F7F7F7' : 'transparent',
                cursor: 'pointer',
                border: 'none',
                width: '100%',
                fontFamily,
              }}
            >
              <img src={filesFolderIcon} alt="" style={{ width: '16px', height: '16px' }} />
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.8px',
                }}
              >
                Attachments
              </span>
            </button>
          </div>

          <div
            style={{
              position: 'absolute',
              left: '175px',
              top: 0,
              bottom: 0,
              width: historyPanelOpen ? '300px' : '0px',
              backgroundColor: '#FFFFFF',
              borderRight: historyPanelOpen ? '0.5px solid #EDEDED' : 'none',
              boxShadow: historyPanelOpen ? '8px 0 16px rgba(0, 0, 0, 0.08)' : 'none',
              zIndex: 50,
              overflow: 'hidden',
              transition: 'width 0.25s ease-out, box-shadow 0.25s ease-out',
            }}
          >
            <div style={{ width: '300px', padding: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 590,
                    color: '#454545',
                    letterSpacing: '-0.7px',
                    fontFamily,
                  }}
                >
                  Versions History
                </span>
                <button
                  onClick={() => setHistoryPanelOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#999',
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {versionHistory.length === 0 ? (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#F7F7F7',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#777',
                      fontFamily,
                    }}
                  >
                    No saved versions yet.
                  </div>
                ) : (
                  versionHistory
                    .slice()
                    .sort((a, b) => b.version_number - a.version_number)
                    .map((version) => {
                      const isCurrent = version.id === currentVersionId
                      const versionName =
                        version.display_name ||
                        documentFilename ||
                        `Version ${version.version_number}`
                      return (
                        <div
                          key={version.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '8px 13px',
                            borderRadius: '4px',
                            backgroundColor: isCurrent ? '#F7F7F7' : 'transparent',
                          }}
                        >
                          <div
                            style={{
                              width: '34px',
                              height: '33px',
                              backgroundColor: '#F7F7F7',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={versionItemIcon}
                              alt=""
                              style={{ width: '18px', height: '20px' }}
                            />
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              padding: '0 8px',
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '16px',
                                  fontWeight: 510,
                                  color: '#272727',
                                  letterSpacing: '-0.8px',
                                  lineHeight: '21px',
                                  fontFamily,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  flex: 1,
                                  minWidth: 0,
                                }}
                                title={versionName}
                              >
                                {versionName}
                              </span>
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 590,
                                    color: '#454545',
                                    backgroundColor: '#F5F5F5',
                                    borderRadius: '999px',
                                    padding: '2px 6px',
                                    flexShrink: 0,
                                  }}
                                >
                                  Current
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: 510,
                                color: '#454545',
                                letterSpacing: '-0.7px',
                                lineHeight: '16px',
                                fontFamily,
                              }}
                            >
                              {formatVersionDateTime(version.created_at)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>
          </div>

          <ContextFilesPanel
            attachedFiles={attachedFilesForPanel}
            error={filesError}
            isOpen={filesPanelOpen}
            isUploading={isUploadingFile}
            onClose={() => setFilesPanelOpen(false)}
            onOpenBrowse={() => setBrowseFilesModalOpen(true)}
            onRemove={handleRemoveContextFile}
            onUpload={handleSidebarFileUpload}
            setPreviewFile={setPreviewFile}
            uploadInputRef={sidebarFileInputRef}
          />

          <div
            style={{
              position: 'absolute',
              left: '175px',
              top: 0,
              bottom: 0,
              width: chatHistoryPanelOpen ? '300px' : '0px',
              backgroundColor: '#FFFFFF',
              borderRight: chatHistoryPanelOpen ? '0.5px solid #EDEDED' : 'none',
              boxShadow: chatHistoryPanelOpen ? '8px 0 16px rgba(0, 0, 0, 0.08)' : 'none',
              zIndex: 50,
              overflow: 'hidden',
              transition: 'width 0.25s ease-out, box-shadow 0.25s ease-out',
            }}
          >
            <div style={{ width: '300px', padding: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 590,
                    color: '#454545',
                    letterSpacing: '-0.7px',
                    fontFamily,
                  }}
                >
                  Chat History
                </span>
                <button
                  onClick={() => setChatHistoryPanelOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#999',
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {documentChatHistory.length === 0 ? (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#F7F7F7',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#777',
                      fontFamily,
                    }}
                  >
                    No chat history yet.
                  </div>
                ) : (
                  documentChatHistory.map((message, index) => (
                    <button
                      key={index}
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: 'none',
                        textAlign: 'left',
                        fontFamily,
                      }}
                      onClick={() => {
                        setActiveStatusTab('prism')
                        setChatHistoryPanelOpen(false)
                      }}
                    >
                      <img
                        src={historyMessageIcon}
                        alt=""
                        style={{ width: '12px', height: '12px', flexShrink: 0 }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontSize: '14px',
                          fontWeight: 510,
                          color: '#454545',
                          letterSpacing: '-0.7px',
                          lineHeight: '16px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily,
                        }}
                      >
                        {message.content}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      }
    </>
  )
}
