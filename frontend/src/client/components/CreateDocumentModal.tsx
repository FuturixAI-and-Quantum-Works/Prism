import { useEffect, useId, useRef, useState } from 'react'
import createDocIcon from '../assets/create.svg'
import { AccessibleDialog } from './ui/AccessibleDialog'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface CreateDocumentModalProps {
  open: boolean
  onClose: () => void
  onCreateDocument: (document: {
    name: string
    description: string
  }) => Promise<{ id: string }> | { id: string }
  onContinue?: (documentId: string) => void
}

type CreationState =
  | { kind: 'editing'; error?: string }
  | { kind: 'creating' }
  | { kind: 'created'; documentId: string }

export default function CreateDocumentModal({
  open,
  onClose,
  onCreateDocument,
  onContinue,
}: CreateDocumentModalProps) {
  const [documentName, setDocumentName] = useState('')
  const [description, setDescription] = useState('')
  const [creation, setCreation] = useState<CreationState>({ kind: 'editing' })
  const requestSequence = useRef(0)
  const activeRequest = useRef<number | null>(null)
  const documentNameId = useId()
  const descriptionId = useId()
  const documentNameRef = useRef<HTMLInputElement>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)
  const showSuccess = creation.kind === 'created'
  const isCreating = creation.kind === 'creating'
  const error = creation.kind === 'editing' ? creation.error : undefined

  useEffect(() => {
    if (showSuccess) continueButtonRef.current?.focus()
  }, [showSuccess])

  const handleClose = () => {
    activeRequest.current = null
    setDocumentName('')
    setDescription('')
    setCreation({ kind: 'editing' })
    onClose()
  }

  const handleCreate = async () => {
    if (activeRequest.current !== null) return
    const requestId = ++requestSequence.current
    activeRequest.current = requestId
    setCreation({ kind: 'creating' })
    try {
      const payload = {
        name: documentName || 'Untitled Document',
        description,
      }
      const result = await onCreateDocument(payload)
      if (activeRequest.current !== requestId) return
      const documentId = result?.id?.trim()
      if (!documentId) throw new Error('Failed to create document')
      setCreation({ kind: 'created', documentId })
    } catch (err) {
      if (activeRequest.current !== requestId) return
      setCreation({
        kind: 'editing',
        error: err instanceof Error ? err.message : 'Failed to create document',
      })
    } finally {
      if (activeRequest.current === requestId) activeRequest.current = null
    }
  }

  const handleContinue = () => {
    if (creation.kind === 'created' && onContinue) {
      onContinue(creation.documentId)
    }
    handleClose()
  }

  return (
    <AccessibleDialog
      open={open}
      onClose={handleClose}
      label={showSuccess ? 'Document created' : 'Create document'}
      initialFocusRef={documentNameRef}
      overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      contentStyle={{
        width: '452px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0px 0px 44px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        fontFamily,
      }}
    >
      {showSuccess ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#4CAF50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12L10 17L20 7"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'center',
              textAlign: 'center',
              width: '230px',
            }}
          >
            <p
              role="status"
              aria-live="polite"
              style={{
                fontSize: '18px',
                fontWeight: 510,
                color: '#272727',
                letterSpacing: '-0.9px',
                lineHeight: '21px',
                margin: 0,
              }}
            >
              Document created successfully
            </p>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: '#454545',
                letterSpacing: '-0.7px',
                lineHeight: '16px',
                margin: 0,
                width: '212px',
              }}
            >
              Your document is ready. Start drafting your content
            </p>
          </div>

          <button
            ref={continueButtonRef}
            type="button"
            onClick={handleContinue}
            style={{
              width: '230px',
              height: '48px',
              padding: '10px',
              backgroundColor: '#F7F7F7',
              border: '1px solid #EDEDED',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            Continue
          </button>
        </div>
      ) : (
        <>
          <div style={{ padding: '20px 20px 0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <img src={createDocIcon} alt="" style={{ width: '24px', height: '24px' }} />
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 510,
                  color: '#272727',
                  letterSpacing: '0.2px',
                  lineHeight: '21px',
                  margin: 0,
                }}
              >
                Create a Document
              </h2>
            </div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: '#454545',
                letterSpacing: '-0.28px',
                lineHeight: '18px',
                margin: 0,
              }}
            >
              Start drafting a new document with AI assistance
            </p>
          </div>

          <div style={{ margin: '12px 0', borderTop: '1px solid #EDEDED' }} />

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleCreate()
            }}
            style={{
              padding: '8px 20px 20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                htmlFor={documentNameId}
                style={{
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#272727',
                  letterSpacing: '-0.8px',
                }}
              >
                Document Name
              </label>
              <input
                id={documentNameId}
                ref={documentNameRef}
                type="text"
                placeholder="e.g. Service Agreement"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#F7F7F7',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#272727',
                  outline: 'none',
                  fontFamily,
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                htmlFor={descriptionId}
                style={{
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.8px',
                }}
              >
                Description (optional)
              </label>
              <textarea
                id={descriptionId}
                placeholder="Add a short description about this document"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#F7F7F7',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#272727',
                  outline: 'none',
                  fontFamily,
                  minHeight: '120px',
                  resize: 'none',
                }}
              />
            </div>

            {error && (
              <p
                role="alert"
                style={{ margin: 0, color: '#B42318', fontSize: '13px', lineHeight: '18px' }}
              >
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: '10px',
                  height: '52px',
                  backgroundColor: '#F7F7F7',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#454545',
                  fontSize: '14px',
                  fontWeight: 510,
                  letterSpacing: '0.2px',
                  cursor: 'pointer',
                  fontFamily,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                aria-busy={isCreating}
                style={{
                  flex: 1,
                  padding: '10px',
                  height: '52px',
                  backgroundColor: '#272727',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 510,
                  letterSpacing: '0.2px',
                  cursor: isCreating ? 'default' : 'pointer',
                  opacity: isCreating ? 0.65 : 1,
                  fontFamily,
                }}
              >
                {isCreating ? 'Creating...' : 'Create Document'}
              </button>
            </div>
          </form>
        </>
      )}
    </AccessibleDialog>
  )
}
