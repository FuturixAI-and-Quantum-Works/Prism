import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import { HomeIcon, LibraryIcon } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { useCreateDocumentMutation } from '../documents/documentsApi'
import {
  useCreateDocumentFromTemplateMutation,
  useGetTemplateQuery,
  type Template,
  type TemplateField,
} from '../templates/templatesApi'
import { TemplateActions } from './TemplateActions'
import { TemplateMetadata } from './TemplateMetadata'
import { TemplateWorkspace } from './TemplateWorkspace'
import {
  buildTemplateCreationPlan,
  findMissingRequiredTemplateField,
  groupTemplateFields,
  initializeTemplatePreview,
  substituteTemplatePreviewText,
  type TemplateFieldValues,
  type TemplateSectionExpansion,
} from './templatePreviewModel'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

const truncateName = (name: string, maxLen = 25) =>
  name.length > maxLen ? name.slice(0, maxLen) + '...' : name

export default function TemplatePreviewFeature() {
  const { templateId } = useParams<{ templateId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const routeStateTemplate = (location.state as { template?: Template } | null)?.template
  const stateTemplate = routeStateTemplate?.id === templateId ? routeStateTemplate : undefined

  const {
    data: fetchedTemplate,
    isLoading,
    isError,
    refetch,
  } = useGetTemplateQuery(templateId || '', {
    skip: !templateId,
  })
  const template = fetchedTemplate || (!isLoading && isError ? stateTemplate : undefined)

  const [createDocument, { isLoading: isCreating }] = useCreateDocumentMutation()
  const [createDocumentFromTemplate, { isLoading: isCreatingFromTemplate }] =
    useCreateDocumentFromTemplateMutation()

  const [templateLiterals, setTemplateLiterals] = useState<TemplateFieldValues>({})
  const [expandedSections, setExpandedSections] = useState<TemplateSectionExpansion>({})
  const [editorContent, setEditorContent] = useState('')
  const [originalHtml, setOriginalHtml] = useState('')
  const [fields, setFields] = useState<TemplateField[]>([])
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const isEditorFocusedRef = useRef(false)
  const hasEditorChangesRef = useRef(false)
  const initializedTemplateIdRef = useRef<string | null>(null)
  const [hasEditorChanges, setHasEditorChanges] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)

  useEffect(() => {
    if (!template) return
    if (hasEditorChangesRef.current && initializedTemplateIdRef.current === template.id) return

    const initialized = initializeTemplatePreview(template)
    initializedTemplateIdRef.current = template.id
    setOriginalHtml(initialized.sourceHtml)
    setEditorContent(initialized.sourceHtml)
    setFields(initialized.fields)
    setTemplateLiterals(initialized.values)
    setExpandedSections(initialized.expandedSections)
    isEditorFocusedRef.current = false
    setIsEditorFocused(false)
    hasEditorChangesRef.current = false
    setHasEditorChanges(false)
    setCreationError(null)
  }, [template])

  useEffect(() => {
    if (!originalHtml || hasEditorChanges) return
    setEditorContent(substituteTemplatePreviewText(originalHtml, fields, templateLiterals))
  }, [fields, hasEditorChanges, originalHtml, templateLiterals])

  const handleEditorContentChange = (content: string) => {
    setEditorContent(content)
    if (isEditorFocusedRef.current) {
      hasEditorChangesRef.current = true
      setHasEditorChanges(true)
    }
  }

  const handleEditorFocusChange = (focused: boolean) => {
    isEditorFocusedRef.current = focused
    setIsEditorFocused(focused)
  }

  const handleInputChange = (key: string, value: string) => {
    setTemplateLiterals((previousValues) => ({
      ...previousValues,
      [key]: value,
    }))
  }

  const toggleSection = (sectionName: string) => {
    setExpandedSections((previousSections) => ({
      ...previousSections,
      [sectionName]: !previousSections[sectionName],
    }))
  }

  const handleCreateDocument = async () => {
    if (!template) return
    setCreationError(null)
    const missingRequiredField = findMissingRequiredTemplateField(fields, templateLiterals)
    if (missingRequiredField) {
      setCreationError(`Complete the required field: ${missingRequiredField.label}.`)
      return
    }

    try {
      const plan = buildTemplateCreationPlan({
        template,
        fields,
        values: templateLiterals,
        editorHtml: editorContent,
        hasEditorChanges,
      })

      if (plan.kind === 'source') {
        await createDocumentFromTemplate(plan.input).unwrap()
      } else {
        await createDocument(plan.input).unwrap()
      }

      navigate('/documents')
    } catch {
      setCreationError('Document could not be created. Try again.')
    }
  }

  const templateName = template?.name || 'Template Preview'
  const breadcrumbs = [
    { label: 'Home', icon: <HomeIcon />, path: '/' },
    { label: 'Templates', icon: <LibraryIcon />, path: '/templates' },
    { label: truncateName(templateName) },
  ]

  if (isLoading) {
    return (
      <Layout activePage="templates" breadcrumbs={breadcrumbs} forceSidebarCollapsed>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontFamily,
          }}
        >
          <span style={{ fontSize: '14px', color: '#666' }}>Loading template...</span>
        </div>
      </Layout>
    )
  }

  if (isError && !template) {
    return (
      <Layout activePage="templates" breadcrumbs={breadcrumbs} forceSidebarCollapsed>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            height: '100%',
            fontFamily,
          }}
        >
          <span role="alert" style={{ fontSize: '14px', color: '#666' }}>
            Template could not be loaded.
          </span>
          <Button
            onClick={() => refetch()}
            style={{
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              backgroundColor: '#272727',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            Retry
          </Button>
        </div>
      </Layout>
    )
  }

  if (!template) {
    return (
      <Layout activePage="templates" breadcrumbs={breadcrumbs} forceSidebarCollapsed>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontFamily,
          }}
        >
          <span style={{ fontSize: '14px', color: '#666' }}>Template not found</span>
        </div>
      </Layout>
    )
  }

  return (
    <Layout activePage="templates" breadcrumbs={breadcrumbs} forceSidebarCollapsed>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', fontFamily }}>
        <TemplateMetadata
          templateName={templateName}
          updatedAt={template.updatedAt}
          isEditorFocused={isEditorFocused}
        />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <TemplateWorkspace
            editorContent={editorContent}
            onEditorContentChange={handleEditorContentChange}
            onEditorFocusChange={handleEditorFocusChange}
          />
          <TemplateActions
            sections={groupTemplateFields(fields)}
            values={templateLiterals}
            expandedSections={expandedSections}
            isCreating={isCreating || isCreatingFromTemplate}
            onInputChange={handleInputChange}
            onToggleSection={toggleSection}
            onCreateDocument={handleCreateDocument}
          />
        </div>
        {creationError && (
          <div
            role="alert"
            style={{
              padding: '10px 16px',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              borderTop: '1px solid #FECACA',
            }}
          >
            {creationError}
          </div>
        )}
      </div>
    </Layout>
  )
}
