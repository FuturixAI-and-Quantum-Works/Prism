import { describe, expect, it } from 'vitest'
import { chooseReviewReconnectOperation } from './useReviewGeneration'

describe('review generation reconnect selection', () => {
  it('prefers regeneration when both durable runs are present', () => {
    expect(
      chooseReviewReconnectOperation({
        hasGenerateRun: true,
        hasRegenerateRun: true,
        hasGeneratingCells: true,
      }),
    ).toBe('regenerate-cell')
  })

  it('reconnects generation from either a durable cursor or generating cells', () => {
    expect(
      chooseReviewReconnectOperation({
        hasGenerateRun: true,
        hasRegenerateRun: false,
        hasGeneratingCells: false,
      }),
    ).toBe('generate')
    expect(
      chooseReviewReconnectOperation({
        hasGenerateRun: false,
        hasRegenerateRun: false,
        hasGeneratingCells: true,
      }),
    ).toBe('generate')
  })

  it('stays idle without durable or server-side run evidence', () => {
    expect(
      chooseReviewReconnectOperation({
        hasGenerateRun: false,
        hasRegenerateRun: false,
        hasGeneratingCells: false,
      }),
    ).toBeNull()
  })
})
