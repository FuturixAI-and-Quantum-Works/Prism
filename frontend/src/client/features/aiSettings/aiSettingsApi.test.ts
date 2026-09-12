import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AiSettingsError,
  createConnection,
  loadAiSettings,
  testConnection,
  updateConnection,
} from './aiSettingsApi'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('AI settings API boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('includes cookie credentials and strips unknown secret fields from responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 'connection-1',
            provider: 'openai',
            name: 'Personal OpenAI',
            source: 'user',
            baseUrl: null,
            enabled: true,
            hasCredential: true,
            models: [],
            credential: 'must-not-cross-the-boundary',
          },
        ]),
      )
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    const snapshot = await loadAiSettings()

    expect(snapshot.connections[0]).not.toHaveProperty('credential')
    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toEqual(expect.objectContaining({ credentials: 'include' }))
    }
  })

  it('sends credentials only in the connection request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await createConnection({
      provider: 'anthropic',
      name: 'Personal Claude',
      credential: 'submitted-secret',
      enabled: true,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).not.toContain('submitted-secret')
    expect(init).toEqual(
      expect.objectContaining({
        credentials: 'include',
        body: expect.stringContaining('submitted-secret'),
      }),
    )
  })

  it('omits credentials when an edit keeps the stored key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await updateConnection('connection-1', {
      provider: 'openai',
      name: 'Renamed connection',
      enabled: true,
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(String(init?.body))).toEqual({
      provider: 'openai',
      name: 'Renamed connection',
      enabled: true,
    })
  })

  it('maps provider failures without reading or exposing their payload', async () => {
    const response = jsonResponse({ detail: 'upstream raw secret response' }, 502)
    const jsonSpy = vi.spyOn(response, 'json')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(testConnection('connection-1')).rejects.toEqual(
      expect.objectContaining<Partial<AiSettingsError>>({
        message: 'Provider connection test failed. Check its credentials and settings.',
        operation: 'test',
        status: 502,
      }),
    )
    expect(jsonSpy).not.toHaveBeenCalled()
  })
})
