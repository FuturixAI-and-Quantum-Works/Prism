import { useState } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { useDialogFocus } from '../../../hooks/useDialogFocus'
import type { CreateTemplateRequest } from '../../templates/templatesApi'

interface NewTemplateModalProps {
  onClose: () => void
  onCreate: (data: CreateTemplateRequest) => void
  isCreating: boolean
  error?: string
}

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export function NewTemplateModal({ onClose, onCreate, isCreating, error }: NewTemplateModalProps) {
  const dialogRef = useDialogFocus(true, onClose)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = () => {
    if (!name.trim() || !category.trim()) return
    onCreate({
      name: name.trim(),
      category: category.trim(),
      description: description.trim() || undefined,
      content_html: '<p></p>',
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-template-dialog-title"
        tabIndex={-1}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '500px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #EDEDED',
          }}
        >
          <h2
            id="new-template-dialog-title"
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 510,
              color: '#272727',
              letterSpacing: '-0.9px',
              fontFamily,
            }}
          >
            Create New Template
          </h2>
          <IconButton
            label="Close create template dialog"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#999999',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </IconButton>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="new-template-name"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                marginBottom: '6px',
                fontFamily,
              }}
            >
              Template Name *
            </label>
            <input
              id="new-template-name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., Service Agreement"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                fontSize: '14px',
                color: '#272727',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                outline: 'none',
                fontFamily,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="new-template-category"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                marginBottom: '6px',
                fontFamily,
              }}
            >
              Category *
            </label>
            <input
              id="new-template-category"
              type="text"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g., Contract, NDA, Agreement"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                fontSize: '14px',
                color: '#272727',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                outline: 'none',
                fontFamily,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="new-template-description"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                marginBottom: '6px',
                fontFamily,
              }}
            >
              Description
            </label>
            <textarea
              id="new-template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Brief description of this template..."
              style={{
                width: '100%',
                height: '80px',
                padding: '10px 12px',
                fontSize: '14px',
                color: '#272727',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                outline: 'none',
                fontFamily,
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {error && (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#B42318',
                fontSize: '13px',
                fontFamily,
              }}
            >
              {error}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid #EDEDED',
          }}
        >
          <Button
            onClick={onClose}
            style={{
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              backgroundColor: '#F7F7F7',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !category.trim() || isCreating}
            aria-busy={isCreating}
            style={{
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#FFFFFF',
              backgroundColor:
                !name.trim() || !category.trim() || isCreating ? '#CCCCCC' : '#272727',
              border: 'none',
              borderRadius: '8px',
              cursor: !name.trim() || !category.trim() || isCreating ? 'not-allowed' : 'pointer',
              fontFamily,
            }}
          >
            {isCreating ? 'Creating...' : 'Create Template'}
          </Button>
        </div>
      </div>
    </div>
  )
}
