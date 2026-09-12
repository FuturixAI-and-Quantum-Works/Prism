import {
  useEffect,
  useRef,
  type ChangeEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import type { BrowseFile } from '../files/fileBrowserTypes'
import type { FilePreviewFile } from '../../components/FilePreviewModal'
import filesPanelUploadIcon from '../../assets/files-panel/upload-icon.svg'
import filesPanelEmptyWave from '../../assets/files-panel/empty-docs-wave.svg'
import filesPanelQuestionMark from '../../assets/files-panel/question-mark.svg'
import folderFileIcon from '../../assets/folder-file-icon.svg'
import pdfFileIcon from '../../assets/pdf-file-icon.svg'
import wordFileIcon from '../../assets/word-file-icon.svg'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface ContextFilesPanelProps {
  attachedFiles: BrowseFile[]
  error?: string | null
  isOpen: boolean
  isUploading: boolean
  onClose: () => void
  onOpenBrowse: () => void
  onRemove: (fileId: string) => Promise<void>
  onUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  setPreviewFile: Dispatch<SetStateAction<FilePreviewFile | null>>
  uploadInputRef: RefObject<HTMLInputElement | null>
}

export function ContextFilesPanel({
  attachedFiles: attachedFilesForPanel,
  error,
  isOpen: filesPanelOpen,
  isUploading: isUploadingFile,
  onClose,
  onOpenBrowse,
  onRemove: handleRemoveContextFile,
  onUpload: handleSidebarFileUpload,
  setPreviewFile,
  uploadInputRef: sidebarFileInputRef,
}: ContextFilesPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!filesPanelOpen) return
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()
    return () => previouslyFocused?.focus()
  }, [filesPanelOpen])

  return (
    <>
      <aside
        aria-label="Context files"
        aria-hidden={filesPanelOpen ? undefined : true}
        inert={filesPanelOpen ? undefined : true}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }}
        style={{
          position: 'absolute',
          left: '175px',
          top: 0,
          bottom: 0,
          width: filesPanelOpen ? '332px' : '0px',
          backgroundColor: '#FFFFFF',
          borderRight: filesPanelOpen ? '0.5px solid #EDEDED' : 'none',
          boxShadow: filesPanelOpen ? '8px 0 16px rgba(0, 0, 0, 0.08)' : 'none',
          zIndex: 50,
          overflow: 'hidden',
          transition: 'width 0.25s ease-out, box-shadow 0.25s ease-out',
        }}
      >
        <div
          style={{
            width: '332px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 20px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8.8px',
                background: 'linear-gradient(180deg, #0094FA 0%, #005894 100%)',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '4.4px',
                  left: '4.4px',
                  width: '30px',
                  height: '30px',
                  backgroundColor: '#F8F8F8',
                  borderRadius: '3.8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '3.4px',
                    left: '3.4px',
                    width: '22.7px',
                    height: '1.5px',
                    backgroundColor: '#DFDFDF',
                    borderRadius: '1.4px',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '8.5px',
                    left: '3.4px',
                    width: '22.7px',
                    height: '2.9px',
                    backgroundColor: '#DFDFDF',
                    borderRadius: '1.4px',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '14.4px',
                    left: '3.4px',
                    width: '22.7px',
                    height: '2.9px',
                    backgroundColor: '#FAFEFF',
                    borderRadius: '1.4px',
                  }}
                />
              </div>
              <img
                src={filesPanelEmptyWave}
                alt=""
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '38px',
                  height: '28px',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.9px',
                  lineHeight: '21px',
                  fontFamily,
                  margin: 0,
                }}
              >
                Files / Documents
              </h2>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#999999',
                  letterSpacing: '-0.28px',
                  lineHeight: '18px',
                  fontFamily,
                }}
              >
                All files related to this matter
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close context files"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#999',
                fontSize: '18px',
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              width: '100%',
              height: '1px',
              backgroundColor: '#EDEDED',
              margin: '16px 0',
            }}
          />

          <input
            type="file"
            ref={sidebarFileInputRef}
            onChange={handleSidebarFileUpload}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.bmp"
            style={{ display: 'none' }}
          />
          {error && (
            <p
              role="alert"
              style={{
                margin: '0 0 12px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#B42318',
                fontSize: '13px',
                lineHeight: '18px',
              }}
            >
              {error}
            </p>
          )}

          {attachedFilesForPanel.length > 0 ? (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ flex: 1 }}>
                {attachedFilesForPanel.map((file) => {
                  const fileIcon =
                    file.type === 'folder'
                      ? folderFileIcon
                      : file.type === 'pdf'
                        ? pdfFileIcon
                        : wordFileIcon
                  return (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F7F7F7')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <button
                        type="button"
                        aria-label={`Preview ${file.name}`}
                        onClick={() =>
                          setPreviewFile({
                            sourceType: 'document',
                            id: file.id,
                            filename: file.name,
                            fileType: file.extension || file.type,
                            extension: file.extension,
                            mimeType: file.mimeType,
                            createdAt: file.createdAt ? file.createdAt.toISOString() : null,
                          })
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 8px',
                          flex: 1,
                          minWidth: 0,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <img src={fileIcon} alt="" style={{ width: '40px', height: '40px' }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 510,
                              color: '#454545',
                              letterSpacing: '-0.7px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontFamily,
                              display: 'block',
                            }}
                          >
                            {file.name}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#999999',
                              fontFamily,
                              display: 'block',
                            }}
                          >
                            {file.date}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={async (e) => {
                          e.stopPropagation()
                          await handleRemoveContextFile(file.id)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#999',
                          fontSize: '14px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
              <div
                style={{
                  padding: '12px 0',
                  borderTop: '1px solid #EDEDED',
                  marginTop: '8px',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => sidebarFileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  aria-busy={isUploadingFile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    flex: 1,
                    height: '40px',
                    backgroundColor: '#272727',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: isUploadingFile ? 'not-allowed' : 'pointer',
                    fontFamily,
                    opacity: isUploadingFile ? 0.7 : 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#FFFFFF',
                      letterSpacing: '-0.7px',
                    }}
                  >
                    {isUploadingFile ? 'Uploading...' : 'Upload'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onOpenBrowse}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    flex: 1,
                    height: '40px',
                    backgroundColor: '#F7F7F7',
                    border: '1px solid #EDEDED',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.7px',
                    }}
                  >
                    Browse
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                padding: '0 18px',
              }}
            >
              <div style={{ position: 'relative', width: '88px', height: '95px' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: '18px',
                    left: 0,
                    width: '57px',
                    height: '59px',
                    borderRadius: '3px',
                    background: 'linear-gradient(180deg, #C4C4C4 0%, #4B4B4B 65.55%)',
                    overflow: 'visible',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '9px',
                      width: '46.5px',
                      height: '46.5px',
                      backgroundColor: '#DFDFDF',
                      borderRadius: '5.8px',
                      transform: 'rotate(24.83deg)',
                      boxShadow: '0px 4px 5px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '5.25px',
                        left: '5.31px',
                        width: '35px',
                        height: '2.3px',
                        backgroundColor: '#F9F9F9',
                        borderRadius: '2px',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '13.19px',
                        left: '5.31px',
                        width: '35px',
                        height: '4.5px',
                        backgroundColor: '#F9F9F9',
                        borderRadius: '2px',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '22.27px',
                        left: '5.31px',
                        width: '35px',
                        height: '4.5px',
                        backgroundColor: '#FAFEFF',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '-9px',
                      width: '46.5px',
                      height: '46.5px',
                      background: 'linear-gradient(37deg, #F8F8F8 5.37%, #F6F6F6 94.63%)',
                      borderRadius: '5.8px',
                      transform: 'rotate(-15.97deg)',
                      boxShadow: '0px 4px 5px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '5.25px',
                        left: '5.31px',
                        width: '35px',
                        height: '2.3px',
                        backgroundColor: '#DFDFDF',
                        borderRadius: '2px',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '13.19px',
                        left: '5.31px',
                        width: '35px',
                        height: '4.5px',
                        backgroundColor: '#DFDFDF',
                        borderRadius: '2px',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '22.27px',
                        left: '5.31px',
                        width: '35px',
                        height: '4.5px',
                        backgroundColor: '#E2E2E2',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <img
                    src={filesPanelEmptyWave}
                    alt=""
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '-1px',
                      width: '59px',
                      height: '43px',
                    }}
                  />
                </div>
                <img
                  src={filesPanelQuestionMark}
                  alt=""
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '56px',
                    width: '15px',
                    height: '27px',
                  }}
                />
                <img
                  src={filesPanelQuestionMark}
                  alt=""
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '73px',
                    width: '15px',
                    height: '27px',
                  }}
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.9px',
                    lineHeight: '21px',
                    fontFamily,
                  }}
                >
                  No documents yet
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#999999',
                    letterSpacing: '-0.8px',
                    lineHeight: '21px',
                    width: '248px',
                    marginTop: '8px',
                    fontFamily,
                  }}
                >
                  Upload a contract or create a draft to start analyzing this matter
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '7px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => sidebarFileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  aria-busy={isUploadingFile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '40px',
                    padding: '10px 15px',
                    backgroundColor: '#272727',
                    border: '1px solid #EDEDED',
                    borderRadius: '12px',
                    cursor: isUploadingFile ? 'not-allowed' : 'pointer',
                    fontFamily,
                    opacity: isUploadingFile ? 0.7 : 1,
                  }}
                >
                  <img
                    src={filesPanelUploadIcon}
                    alt=""
                    style={{
                      width: '16px',
                      height: '16px',
                      filter: 'brightness(0) invert(1)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#FFFFFF',
                      letterSpacing: '-0.7px',
                      lineHeight: '16px',
                    }}
                  >
                    {isUploadingFile ? 'Uploading...' : 'Upload'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onOpenBrowse}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '40px',
                    padding: '10px 15px',
                    backgroundColor: '#EDEDED',
                    border: '1px solid #EDEDED',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.7px',
                      lineHeight: '16px',
                    }}
                  >
                    Import Existing
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
