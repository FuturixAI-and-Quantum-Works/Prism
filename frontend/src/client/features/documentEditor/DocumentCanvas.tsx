import type { Dispatch, SetStateAction } from 'react'
import type { Editor } from '@tiptap/core'
import TiptapEditor from '../editor/TiptapEditorFeature'
import documentIcon from '../../assets/icons/choose.png'
import templateFolderIcon from '../../assets/document-editor/template-folder.svg'
import uploadDocIcon from '../../assets/document-editor/upload-doc.svg'
import type { DocumentVersion } from '../documents/documentsApi'
import type { VersionComparisonRow } from './versionComparison'
import { VersionComparisonTable } from './VersionComparisonTable'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface DocumentCanvasProps {
  activeTab: 'canvas' | 'tabular'
  canEditDocument: boolean
  currentVersion: DocumentVersion | null
  documentContentReady: boolean
  documentFilename?: string
  editorContent: string
  htmlError: boolean
  lifecycleState: string | null
  loadPreviewUrlFallback: (force?: boolean) => Promise<void>
  previewError: string
  previewLoading: boolean
  previewUrl: string | null
  previousVersionCount: number
  refreshVersionComparison: () => void
  selectedComparisonVersionId: string | null
  setBrowseFilesModalOpen: Dispatch<SetStateAction<boolean>>
  setEditorContent: Dispatch<SetStateAction<string>>
  setIsEditorFocused: Dispatch<SetStateAction<boolean>>
  setIsTemplateModalOpen: Dispatch<SetStateAction<boolean>>
  setSelectedComparisonVersionId: Dispatch<SetStateAction<string | null>>
  setTiptapEditor: Dispatch<SetStateAction<Editor | null>>
  setZoom: Dispatch<SetStateAction<number>>
  uuid: string | undefined
  versionComparisonError: string
  versionComparisonLoading: boolean
  versionComparisons: VersionComparisonRow[]
  zoom: number
}

export function DocumentCanvas({
  activeTab,
  canEditDocument,
  currentVersion,
  documentContentReady,
  documentFilename,
  editorContent,
  htmlError,
  lifecycleState,
  loadPreviewUrlFallback,
  previewError,
  previewLoading,
  previewUrl,
  previousVersionCount,
  refreshVersionComparison,
  selectedComparisonVersionId,
  setBrowseFilesModalOpen,
  setEditorContent,
  setIsEditorFocused,
  setIsTemplateModalOpen,
  setSelectedComparisonVersionId,
  setTiptapEditor,
  setZoom,
  uuid,
  versionComparisonError,
  versionComparisonLoading,
  versionComparisons,
  zoom,
}: DocumentCanvasProps) {
  return (
    <>
      <div
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
          borderRadius: '0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {activeTab === 'tabular' ? (
          <VersionComparisonTable
            currentVersion={currentVersion}
            comparisons={versionComparisons}
            loading={versionComparisonLoading}
            error={versionComparisonError}
            selectedVersionId={selectedComparisonVersionId}
            previousVersionCount={previousVersionCount}
            onSelectVersion={setSelectedComparisonVersionId}
            onRefresh={refreshVersionComparison}
          />
        ) : documentContentReady ? (
          <TiptapEditor
            content={editorContent}
            onContentChange={setEditorContent}
            editable={!uuid || canEditDocument}
            placeholder={
              !uuid || canEditDocument
                ? 'Start typing or use AI to generate content...'
                : lifecycleState === 'PENDING_APPROVAL'
                  ? 'This document is pending approval and locked for editing'
                  : 'This document is read-only for your current role'
            }
            zoom={zoom}
            onZoomChange={setZoom}
            onFocusChange={setIsEditorFocused}
            onEditorReady={setTiptapEditor}
          />
        ) : htmlError && previewUrl ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F9FAFB',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 20px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z"
                    stroke="#D97706"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 3V8C13 8.55228 13.4477 9 14 9H19"
                    stroke="#D97706"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3
                style={{
                  fontFamily,
                  fontSize: '18px',
                  fontWeight: 590,
                  color: '#272727',
                  margin: '0 0 8px',
                  letterSpacing: '-0.5px',
                }}
              >
                Document Preview Unavailable
              </h3>
              <p
                style={{
                  fontFamily,
                  fontSize: '14px',
                  color: '#6B7280',
                  margin: '0 0 24px',
                  lineHeight: '1.5',
                }}
              >
                This document format cannot be edited in the browser. You can download the original
                file to view it.
              </p>
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = previewUrl
                  link.download = documentFilename || 'document'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: '#272727',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 510,
                  fontFamily,
                  cursor: 'pointer',
                  letterSpacing: '-0.3px',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M12 3V15M12 15L8 11M12 15L16 11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Download File
              </button>
            </div>
          </div>
        ) : htmlError && previewLoading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center', color: '#666' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  margin: '0 auto 12px',
                  border: '3px solid #EDEDED',
                  borderTopColor: '#454545',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ fontFamily, fontSize: '14px' }}>Loading preview...</p>
            </div>
          </div>
        ) : htmlError ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center', color: '#666', maxWidth: '400px' }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                style={{ margin: '0 auto 16px' }}
              >
                <path
                  d="M24 18V26M24 32V32.02M42 24C42 33.9411 33.9411 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C33.9411 6 42 14.0589 42 24Z"
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3
                style={{
                  fontFamily,
                  fontSize: '16px',
                  fontWeight: 590,
                  color: '#374151',
                  margin: '0 0 8px',
                }}
              >
                Unable to load document
              </h3>
              <p
                style={{
                  fontFamily,
                  fontSize: '14px',
                  color: '#6B7280',
                  margin: 0,
                  lineHeight: '1.5',
                }}
              >
                {previewError ||
                  'This document format is not supported for editing. Please try uploading a different file or contact support.'}
              </p>
              {uuid && (
                <button
                  onClick={() => loadPreviewUrlFallback(true)}
                  disabled={previewLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '20px',
                    padding: '10px 18px',
                    backgroundColor: '#272727',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 510,
                    fontFamily,
                    cursor: previewLoading ? 'not-allowed' : 'pointer',
                    opacity: previewLoading ? 0.65 : 1,
                  }}
                >
                  Retry preview
                </button>
              )}
            </div>
          </div>
        ) : uuid ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center', color: '#666' }}>
              <p style={{ fontFamily, fontSize: '14px' }}>Loading document...</p>
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '32px',
                maxWidth: '498px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '88px',
                    height: '95px',
                    textAlign: 'center',
                  }}
                >
                  <img src={documentIcon} alt="" style={{ width: '66px', height: '75px' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 510,
                      color: '#272727',
                      margin: 0,
                      letterSpacing: '-0.9px',
                    }}
                  >
                    Start Creating
                  </h2>
                  <p
                    style={{
                      fontSize: '16px',
                      fontWeight: 400,
                      color: '#454545',
                      margin: '4px 0 0 0',
                      letterSpacing: '-0.8px',
                      lineHeight: '21px',
                    }}
                  >
                    Create a new document or upload an existing one to begin editing
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '10px',
                    height: '40px',
                    backgroundColor: '#F7F7F7',
                    border: '1px solid #EDEDED',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  <img src={templateFolderIcon} alt="" style={{ width: '20px', height: '20px' }} />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.7px',
                    }}
                  >
                    Use a template
                  </span>
                </button>
                <button
                  onClick={() => setBrowseFilesModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '10px',
                    height: '40px',
                    backgroundColor: '#F7F7F7',
                    border: '1px solid #EDEDED',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  <img src={uploadDocIcon} alt="" style={{ width: '14px', height: '14px' }} />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.7px',
                    }}
                  >
                    Upload a Document
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  )
}
