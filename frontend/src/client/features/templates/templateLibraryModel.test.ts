import { describe, expect, it } from 'vitest'
import type { Template } from './templatesApi'
import {
  selectTemplateCards,
  selectTemplateCategories,
  templateCategory,
  toTemplateCard,
} from './templateLibraryModel'

function template(id: string, name: string, category: string, createdAt: string): Template {
  return {
    id,
    userId: null,
    name,
    category,
    description: `${name} description`,
    contentHtml: '<p>Template</p>',
    fields: [],
    sourceFilename: null,
    sourceStoragePath: null,
    sourceMimeType: null,
    sourceChecksum: null,
    sourceMetadata: null,
    isCreatedByUser: false,
    createdAt,
    updatedAt: createdAt,
  }
}

describe('template library model', () => {
  it('normalizes categories while preserving their display label', () => {
    expect(templateCategory('Service Agreement')).toMatchObject({
      id: 'serviceagreement',
      label: 'SERVICE AGREEMENT',
      textColor: '#6080B1',
    })
  })

  it('filters and sorts cards without mutating the source', () => {
    const cards = [
      toTemplateCard(template('1', 'NDA Template', 'NDA', '2026-01-01T00:00:00.000Z')),
      toTemplateCard(template('2', 'Service Agreement', 'Service', '2026-02-01T00:00:00.000Z')),
    ]

    expect(selectTemplateCards(cards, '', [], 'name-asc').map((card) => card.title)).toEqual([
      'NDA Template',
      'Service Agreement',
    ])
    expect(selectTemplateCards(cards, '', ['nda'], 'newest').map((card) => card.id)).toEqual(['1'])
    expect(cards.map((card) => card.id)).toEqual(['1', '2'])
  })

  it('deduplicates categories by normalized identity', () => {
    const cards = [
      toTemplateCard(template('1', 'One', 'NDA', '2026-01-01T00:00:00.000Z')),
      toTemplateCard(template('2', 'Two', 'NDA', '2026-02-01T00:00:00.000Z')),
    ]

    expect(selectTemplateCategories(cards).map((category) => category.id)).toEqual(['nda'])
  })

  it('does not invent categories when the API returns no templates', () => {
    expect(selectTemplateCategories([])).toEqual([])
  })
})
