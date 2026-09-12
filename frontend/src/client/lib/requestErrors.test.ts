import { describe, expect, it } from 'vitest'
import { getRequestErrorMessage } from './requestErrors'

describe('getRequestErrorMessage', () => {
  it('prefers structured API details', () => {
    expect(
      getRequestErrorMessage(
        { data: { detail: 'Already invited', message: 'Request failed' } },
        'Fallback',
      ),
    ).toBe('Already invited')
  })

  it('supports ordinary errors and fallback values', () => {
    expect(getRequestErrorMessage(new Error('Network failed'), 'Fallback')).toBe('Network failed')
    expect(getRequestErrorMessage(null, 'Fallback')).toBe('Fallback')
  })
})
