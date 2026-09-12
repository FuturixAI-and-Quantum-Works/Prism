import { describe, expect, it } from 'vitest'
import type { Template, TemplateField } from '../templates/templatesApi'
import {
  buildTemplateCreationPlan,
  groupTemplateFields,
  hasUsableDocxSource,
  indexTemplateFields,
  initializeTemplatePreview,
  projectTemplateValues,
  substitutePlainTemplateHtml,
  substituteTemplatePreviewText,
} from './templatePreviewModel'

const field = (id: string, section?: string): TemplateField => ({
  id,
  label: id,
  type: 'text',
  required: true,
  section,
})

const template = (overrides: Partial<Template> = {}): Template => ({
  id: 'template-1',
  userId: null,
  name: 'Agreement',
  category: 'Legal',
  description: null,
  contentHtml: '<p>{{party}}</p>',
  fields: [field('party')],
  sourceFilename: null,
  sourceStoragePath: null,
  sourceMimeType: null,
  sourceChecksum: null,
  sourceMetadata: null,
  isCreatedByUser: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('template preview model', () => {
  it('indexes duplicate fields independently and preserves first-seen section state', () => {
    const fields = [
      field('party', 'Parties'),
      field('party'),
      field('date', 'Dates'),
      field('address', 'Parties'),
    ]

    expect(indexTemplateFields(fields).map(({ key }) => key)).toEqual([
      'party_0',
      'party_1',
      'date_2',
      'address_3',
    ])
    expect(
      groupTemplateFields(fields).map(({ name, fields: sectionFields }) => ({
        name,
        keys: sectionFields.map(({ key }) => key),
      })),
    ).toEqual([
      { name: 'Parties', keys: ['party_0', 'address_3'] },
      { name: 'General', keys: ['party_1'] },
      { name: 'Dates', keys: ['date_2'] },
    ])

    const initialized = initializeTemplatePreview(template({ fields }))
    expect(initialized.values).toEqual({
      party_0: '',
      party_1: '',
      date_2: '',
      address_3: '',
    })
    expect(initialized.expandedSections).toEqual({
      Parties: true,
      General: false,
      Dates: false,
    })
  })

  it('materializes all token syntaxes as plain text', () => {
    const sourceHtml = '<p>{{ name }}|${name}|[name]</p>'

    expect(substitutePlainTemplateHtml(sourceHtml, [field('name')], { name_0: 'Acme' })).toBe(
      '<p>Acme|Acme|Acme</p>',
    )
  })

  it('escapes metacharacters in field IDs', () => {
    const sourceHtml = '<p>{{party.name+$}}|${party.name+$}|[party.name+$]</p>'

    expect(
      substitutePlainTemplateHtml(sourceHtml, [field('party.name+$')], {
        'party.name+$_0': 'Buyer',
      }),
    ).toBe('<p>Buyer|Buyer|Buyer</p>')
  })

  it('removes blank tokens from materialized HTML', () => {
    const sourceHtml = '<p>{{ name }}|${name}|[name]</p>'

    expect(substituteTemplatePreviewText(sourceHtml, [field('name')], { name_0: '   ' })).toBe(
      sourceHtml,
    )
    expect(substitutePlainTemplateHtml(sourceHtml, [field('name')], { name_0: '' })).toBe(
      '<p>||</p>',
    )
    expect(substitutePlainTemplateHtml(sourceHtml, [field('name')], { name_0: '   ' })).toBe(
      '<p>   |   |   </p>',
    )
  })

  it('inserts field values as escaped text instead of replacement syntax or markup', () => {
    const sourceHtml = 'before {{name}} after'
    const replacement = "$$|$&|$`|$'|<script>unsafe()</script>"

    expect(substitutePlainTemplateHtml(sourceHtml, [field('name')], { name_0: replacement })).toBe(
      "before $$|$&amp;|$`|$'|&lt;script&gt;unsafe()&lt;/script&gt; after",
    )
  })

  it('sanitizes the selected source HTML and keeps empty templates empty', () => {
    expect(
      initializeTemplatePreview(
        template({ contentHtml: '<p onclick="run()">Safe</p><script>bad()</script>' }),
      ).sourceHtml,
    ).toBe('<p>Safe</p>')
    expect(initializeTemplatePreview(template({ contentHtml: '' })).sourceHtml).toBe('<p></p>')
  })

  it('materializes current editor HTML without changing unrelated edits', () => {
    const editedHtml =
      '<p>Manual introduction</p><p>{{party}}</p><p><span style="color: red">Keep me</span></p>'

    expect(
      substitutePlainTemplateHtml(editedHtml, [field('party')], { party_0: 'Acme & Co' }),
    ).toBe(
      '<p>Manual introduction</p><p>Acme &amp; Co</p><p><span style="color: red">Keep me</span></p>',
    )
  })

  it('projects duplicate source values with the last occurrence winning', () => {
    expect(
      projectTemplateValues([field('party'), field('party')], {
        party_0: 'First',
        party_1: 'Last',
      }),
    ).toEqual({ party: 'Last' })
  })

  it('selects source-backed creation only for stored DOCX sources', () => {
    const values = { party_0: 'Acme' }

    expect(
      buildTemplateCreationPlan({
        template: template({ sourceFilename: 'agreement.docx' }),
        fields: [field('party')],
        values,
        editorHtml: '<p>{{party}}</p>',
        hasEditorChanges: false,
      }),
    ).toMatchObject({ kind: 'html' })
    const storedTemplate = template({ sourceStoragePath: 'templates/agreement.docx' })
    expect(hasUsableDocxSource(storedTemplate)).toBe(true)
    expect(
      buildTemplateCreationPlan({
        template: storedTemplate,
        fields: [field('party')],
        values,
        editorHtml: '<p>{{party}}</p>',
        hasEditorChanges: false,
      }).kind,
    ).toBe('source')
    expect(
      hasUsableDocxSource(
        template({
          sourceStoragePath: 'templates/source.bin',
          sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ),
    ).toBe(true)
  })

  it('sanitizes substituted HTML creation input', () => {
    expect(
      buildTemplateCreationPlan({
        template: template({ contentHtml: '<p>{{party}} [note]</p>' }),
        fields: [field('party'), field('note')],
        values: { party_0: '<script>unsafe()</script>', note_1: '' },
        editorHtml: '<p>{{party}} [note]</p>',
        hasEditorChanges: false,
      }),
    ).toEqual({
      kind: 'html',
      input: {
        name: 'Agreement',
        filename: 'Agreement.docx',
        content_html: '<p>&lt;script&gt;unsafe()&lt;/script&gt; </p>',
      },
    })
  })

  it('uses edited HTML instead of discarding source-template changes', () => {
    expect(
      buildTemplateCreationPlan({
        template: template({ sourceStoragePath: 'templates/agreement.docx' }),
        fields: [field('party')],
        values: { party_0: 'Acme' },
        editorHtml: '<p>Manually revised terms</p>',
        hasEditorChanges: true,
      }),
    ).toEqual({
      kind: 'html',
      input: {
        name: 'Agreement',
        filename: 'Agreement.docx',
        content_html: '<p>Manually revised terms</p>',
      },
    })
  })
})
