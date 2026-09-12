import { describe, expect, it } from 'vitest'
import complianceListSource from './ComplianceListFeature.tsx?raw'
import complianceReviewSource from './ComplianceReviewFeature.tsx?raw'

const productionModules = import.meta.glob<string>('./*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
})

function lineCount(source: string) {
  return source.split('\n').length
}

describe('compliance module boundaries', () => {
  it.each([
    ['ComplianceListFeature.tsx', complianceListSource],
    ['ComplianceReviewFeature.tsx', complianceReviewSource],
  ])('keeps %s as a focused feature entrypoint', (_filename, source) => {
    expect(lineCount(source)).toBeLessThanOrEqual(400)
  })

  it('keeps production feature modules focused', () => {
    for (const [filename, source] of Object.entries(productionModules)) {
      if (filename.endsWith('.test.ts') || filename.endsWith('.test.tsx')) continue
      expect(lineCount(source), filename).toBeLessThanOrEqual(700)
    }
  })
})
