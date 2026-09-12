import { describe, expect, it } from 'vitest'
import { sanitizeEditorHtml } from './sanitizeHtml'

describe('sanitizeEditorHtml', () => {
  it('preserves supported editor formatting', () => {
    const html =
      '<h2 style="text-align: center">Terms</h2><table><tbody><tr><td colspan="2">Value</td></tr></tbody></table>'

    expect(sanitizeEditorHtml(html)).toBe(html)
  })

  it('removes executable and interactive content', () => {
    const html =
      '<p onclick="alert(1)">Safe</p><script>alert(1)</script><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)">Link</a>'
    const result = sanitizeEditorHtml(html)

    expect(result).toBe('<p>Safe</p><a>Link</a>')
  })

  it('keeps explicit editor metadata and removes arbitrary data attributes', () => {
    const html =
      '<span data-placeholder-id="party" data-secret="leak" class="placeholder">Party</span>'

    expect(sanitizeEditorHtml(html)).toBe(
      '<span data-placeholder-id="party" class="placeholder">Party</span>',
    )
  })
})
