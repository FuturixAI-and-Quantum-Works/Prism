import { describe, expect, it } from 'vitest'

const assistantSources = import.meta.glob<string>('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
})

function lineCount(source: string) {
  return source.split(/\r?\n/).length
}

describe('assistant module boundaries', () => {
  it('keeps assistant production modules reviewable', () => {
    const oversized = Object.entries(assistantSources)
      .filter(([path]) => !path.includes('.test.'))
      .map(([path, source]) => ({ path, lines: lineCount(source) }))
      .filter(({ lines }) => lines > 700)

    expect(oversized).toEqual([])
  })
})
