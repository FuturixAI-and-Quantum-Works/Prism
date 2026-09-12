import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { Template } from '../templates/templatesApi'
import { TemplatePickerDialog } from './TemplatePickerDialog'

const template: Template = {
  id: 'template-1',
  userId: null,
  name: 'Service agreement',
  category: 'Legal',
  description: 'A standard agreement',
  contentHtml: '<p>Safe</p><script>alert(1)</script>',
  fields: null,
  sourceFilename: null,
  sourceStoragePath: null,
  sourceMimeType: null,
  sourceChecksum: null,
  sourceMetadata: null,
  isCreatedByUser: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
}

function Harness() {
  const [open, setOpen] = useState(true)
  const [content, setContent] = useState('')
  const [, setSelected] = useState<Template | null>(null)
  const [query, setQuery] = useState('')
  return (
    <>
      <output aria-label="Selected HTML">{content}</output>
      <TemplatePickerDialog
        displayedTemplates={[template]}
        isTemplateModalOpen={open}
        setEditorContent={setContent}
        setIsTemplateModalOpen={setOpen}
        setSelectedTemplate={setSelected}
        setTemplateSearchQuery={setQuery}
        templateSearchQuery={query}
      />
    </>
  )
}

describe('TemplatePickerDialog accessibility', () => {
  it('is keyboard operable, sanitized, and free of automated violations', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)

    expect(await axe(container)).toHaveNoViolations()
    screen.getByRole('button', { name: /Service agreement/ }).focus()
    await user.keyboard('{Enter}')

    expect(screen.getByLabelText('Selected HTML')).toHaveTextContent('<p>Safe</p>')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
