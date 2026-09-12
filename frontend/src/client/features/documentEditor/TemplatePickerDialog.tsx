import type { Dispatch, SetStateAction } from 'react'
import closeIcon from '../../assets/document-editor/close-icon.svg'
import searchElementsIcon from '../../assets/document-editor/search-elements.svg'
import templateFileIcon from '../../assets/document-editor/template-file-icon.svg'
import templateFileCornerIcon from '../../assets/document-editor/template-file-corner.svg'
import { sanitizeEditorHtml } from '../../lib/sanitizeHtml'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { IconButton } from '../../components/ui/Button'
import type { Template } from '../templates/templatesApi'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface TemplatePickerDialogProps {
  displayedTemplates: Template[]
  isTemplateModalOpen: boolean
  setEditorContent: Dispatch<SetStateAction<string>>
  setIsTemplateModalOpen: Dispatch<SetStateAction<boolean>>
  setSelectedTemplate: Dispatch<SetStateAction<Template | null>>
  setTemplateSearchQuery: Dispatch<SetStateAction<string>>
  templateSearchQuery: string
}

export function TemplatePickerDialog({
  displayedTemplates,
  isTemplateModalOpen,
  setEditorContent,
  setIsTemplateModalOpen,
  setSelectedTemplate,
  setTemplateSearchQuery,
  templateSearchQuery,
}: TemplatePickerDialogProps) {
  return (
    <AccessibleDialog
      open={isTemplateModalOpen}
      onClose={() => setIsTemplateModalOpen(false)}
      labelledBy="template-picker-title"
      contentStyle={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        width: '680px',
        maxWidth: '90vw',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '232px' }}>
          <h2
            id="template-picker-title"
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 510,
              color: '#272727',
              letterSpacing: '-0.9px',
              lineHeight: '21px',
              fontFamily,
            }}
          >
            Create Document
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
              fontFamily,
            }}
          >
            Choose a template
          </p>
        </div>
        <IconButton
          label="Close template picker"
          onClick={() => setIsTemplateModalOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src={closeIcon} alt="" style={{ width: '24px', height: '24px' }} />
        </IconButton>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '44px',
          padding: '8px 10px',
          backgroundColor: '#F7F7F7',
          border: '1px solid #EDEDED',
          borderRadius: '12px',
        }}
      >
        <div
          style={{
            width: '17px',
            height: '17px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={searchElementsIcon}
            alt=""
            style={{ width: '14px', height: '14px', transform: 'scaleX(-1)' }}
          />
        </div>
        <input
          aria-label="Search templates"
          type="text"
          value={templateSearchQuery}
          onChange={(e) => setTemplateSearchQuery(e.target.value)}
          placeholder="Search templates…"
          style={{
            flex: 1,
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            outline: 'none',
            fontFamily,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {displayedTemplates.length > 0 ? (
          displayedTemplates.map((template) => {
            const categoryColors: Record<string, string> = {
              Legal: '#8B5CF6',
              Contract: '#454545',
              HR: '#10B981',
              Finance: '#F59E0B',
              Sales: '#EF4444',
              Default: '#6B7280',
            }
            const color = categoryColors[template.category] || categoryColors['Default']
            const label = template.category.slice(0, 3).toUpperCase()
            const timeAgo = (() => {
              const diff = Date.now() - new Date(template.createdAt).getTime()
              const days = Math.floor(diff / (1000 * 60 * 60 * 24))
              if (days === 0) return 'Today'
              if (days === 1) return '1 day ago'
              return `${days} days ago`
            })()

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setIsTemplateModalOpen(false)
                  setSelectedTemplate(template)
                  setEditorContent(sanitizeEditorHtml(template.contentHtml || ''))
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '11px',
                  padding: '10px 11px',
                  width: '197px',
                  height: '178px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid #EDEDED',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.1)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: '39px',
                      height: '39px',
                      backgroundColor: '#EDEDED',
                      borderRadius: '31.778px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'relative', width: '21px', height: '21px' }}>
                      <img
                        src={templateFileIcon}
                        alt=""
                        style={{
                          width: '16px',
                          height: '21px',
                          position: 'absolute',
                          left: '2.6px',
                          top: '0',
                        }}
                      />
                      <img
                        src={templateFileCornerIcon}
                        alt=""
                        style={{
                          width: '5px',
                          height: '4px',
                          position: 'absolute',
                          left: '9.7px',
                          top: '0',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: '1.35px',
                          top: '5.67px',
                          width: '15.583px',
                          backgroundColor: color,
                          borderRadius: '2px',
                          padding: '1.5px 1px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '4.68px',
                            fontWeight: 700,
                            color: '#FFFFFF',
                            fontFamily: 'Poppins, sans-serif',
                            textAlign: 'center',
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    width: '100%',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#272727',
                      letterSpacing: '-0.7px',
                      lineHeight: '16px',
                      fontFamily,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {template.name}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#999898',
                      letterSpacing: '-0.392px',
                      lineHeight: '1.2',
                      fontFamily: 'DM Sans, sans-serif',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                    }}
                  >
                    {template.description || 'No description'}
                  </p>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 510,
                    color: '#999898',
                    letterSpacing: '-0.7px',
                    lineHeight: '16px',
                    fontFamily,
                  }}
                >
                  {timeAgo}
                </p>
              </button>
            )
          })
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              gap: '12px',
              width: '100%',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.8px',
                fontFamily,
              }}
            >
              {templateSearchQuery ? 'No templates found' : 'No templates available'}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 400,
                color: '#999999',
                letterSpacing: '-0.7px',
                fontFamily,
                textAlign: 'center',
              }}
            >
              {templateSearchQuery
                ? 'Try a different search term'
                : 'Create your first template to get started'}
            </p>
          </div>
        )}
      </div>
    </AccessibleDialog>
  )
}
