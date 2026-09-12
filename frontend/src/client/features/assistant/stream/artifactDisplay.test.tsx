import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatFieldLabel,
  formatRelativeTime,
  formatValue,
  getFileTypeConfig,
} from './artifactDisplay'

describe('assistant artifact presentation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-02T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps document extensions and relative timestamps', () => {
    expect(getFileTypeConfig('contract.pdf')).toMatchObject({
      label: 'PDF Document',
      shortLabel: 'PDF',
    })
    expect(getFileTypeConfig('terms.docx')).toMatchObject({
      label: 'Word Document',
      shortLabel: 'DOC',
    })
    expect(formatRelativeTime('2026-09-01T12:00:00.000Z')).toBe('Yesterday')
  })

  it('formats tool payload fields for compact display', () => {
    expect(formatFieldLabel('page_number')).toBe('Page')
    expect(formatFieldLabel('customValue')).toBe('Custom Value')
    expect(formatValue(true)).toBe('Yes')
    expect(formatValue(['one', 'two'])).toBe('one, two')
    expect(formatValue({ first: 1, second: 2 })).toBe('2 fields')
  })
})
