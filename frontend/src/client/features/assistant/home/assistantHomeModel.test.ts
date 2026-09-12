import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Template } from '../../templates/templatesApi'
import { createInitialCompareDocuments, mapAssistantTemplates } from './assistantHomeModel'

const template: Template = {
  id: 'template-1',
  userId: null,
  name: 'Mutual NDA',
  category: 'NDA',
  description: 'Protect confidential information',
  contentHtml: '<p>NDA</p>',
  fields: null,
  sourceFilename: null,
  sourceStoragePath: null,
  sourceMimeType: null,
  sourceChecksum: null,
  sourceMetadata: null,
  isCreatedByUser: false,
  createdAt: '2026-08-31T12:00:00.000Z',
  updatedAt: '2026-08-31T12:00:00.000Z',
}

describe('assistant home model', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-02T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('projects API templates into the existing card contract', () => {
    expect(mapAssistantTemplates([template])).toEqual([
      {
        id: 'template-1',
        title: 'Mutual NDA',
        category: {
          id: 'nda',
          label: 'NDA',
          bgColor: '#E8DEF9',
          borderColor: '#B4A6D7',
          textColor: '#7960B1',
        },
        description: 'Protect confidential information',
        createdAt: '2 days ago',
        createdAtDate: new Date('2026-08-31T12:00:00.000Z'),
        apiTemplate: template,
      },
    ])
  })

  it('creates independent empty comparison slots', () => {
    const first = createInitialCompareDocuments()
    const second = createInitialCompareDocuments()

    expect(first).toEqual([
      { id: '1', file: null, previewUrl: null },
      { id: '2', file: null, previewUrl: null },
    ])
    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(second[0])
  })
})
