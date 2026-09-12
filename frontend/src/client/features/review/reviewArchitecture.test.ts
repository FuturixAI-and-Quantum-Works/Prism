import { describe, expect, it } from 'vitest'
import reviewPageSource from '../../components/pages/ReviewPage.tsx?raw'

const productionModules = import.meta.glob<string>('./*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
})

function lineCount(source: string) {
  return source.split('\n').length
}

describe('review feature boundaries', () => {
  it('keeps the route entry point below 400 lines', () => {
    expect(lineCount(reviewPageSource)).toBeLessThan(400)
  })

  it('keeps every production review module below 700 lines', () => {
    for (const [filename, source] of Object.entries(productionModules)) {
      if (filename.endsWith('.test.ts') || filename.endsWith('.test.tsx')) continue
      expect(lineCount(source), filename).toBeLessThan(700)
    }
  })
})
