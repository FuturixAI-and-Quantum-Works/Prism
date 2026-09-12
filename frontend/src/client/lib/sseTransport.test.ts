import { describe, expect, it, vi } from 'vitest'
import type { StreamEvent } from '@prism/protocol'
import {
  cancelDurableRun,
  consumeEventStream,
  streamDurableSSE,
  streamSSE,
  StreamHttpError,
  StreamProtocolError,
  StreamServerError,
} from './sseTransport'
import { durableRunStoragePrefix } from './apiTransport'

function body(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

function bytes(value: string) {
  return new TextEncoder().encode(value)
}

function installMemoryStorage() {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  })
  return storage
}

describe('SSE transport', () => {
  it('parses comments, CRLF, optional spaces, multiline data, and final buffered events', async () => {
    const source =
      ': keepalive\r\ndata:{"type":\r\ndata: "content_delta","text":"hello"}\r\n\r\ndata: {"type":"done"}'
    const encoded = bytes(source)
    const events: StreamEvent[] = []
    const terminal = await consumeEventStream(
      body([encoded.slice(0, 1), encoded.slice(1, 17), encoded.slice(17, 38), encoded.slice(38)]),
      (event) => events.push(event),
    )

    expect(events).toEqual([{ type: 'content_delta', text: 'hello' }, { type: 'done' }])
    expect(terminal).toEqual({ type: 'done' })
  })

  it('preserves UTF-8 characters split across chunks', async () => {
    const encoded = bytes('data: {"type":"content_delta","text":"🙂"}\n\ndata: {"type":"done"}\n\n')
    const events: StreamEvent[] = []

    await consumeEventStream(body([encoded.slice(0, 43), encoded.slice(43)]), (event) =>
      events.push(event),
    )

    expect(events).toEqual([{ type: 'content_delta', text: '🙂' }, { type: 'done' }])
  })

  it('emits completion once when duplicate markers arrive', async () => {
    const events: StreamEvent[] = []
    const terminal = await consumeEventStream(
      body([bytes('data: {"type":"done"}\n\ndata: {"type":"done"}\n\ndata: {"type":"done"}\n\n')]),
      (event) => events.push(event),
    )

    expect(events).toEqual([{ type: 'done' }])
    expect(terminal).toEqual({ type: 'done' })
  })

  it('reports malformed and incomplete streams as typed protocol errors', async () => {
    await expect(
      consumeEventStream(body([bytes('data: nope\n\n')]), vi.fn()),
    ).rejects.toBeInstanceOf(StreamProtocolError)
    await expect(
      consumeEventStream(body([bytes('data: {"type":"content_delta","text":"x"}\n\n')]), vi.fn()),
    ).rejects.toThrow('Stream ended before a completion event')
  })

  it('returns a protocol outcome for malformed events', async () => {
    const originalFetch = globalThis.fetch
    const onError = vi.fn()
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('data: {"type":"content_delta","text":5}\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    )

    try {
      const outcome = await streamSSE(
        '/stream',
        {},
        {
          accepts: (event): event is StreamEvent => Boolean(event),
          onEvent: vi.fn(),
          onError,
        },
      )

      expect(outcome).toEqual({ kind: 'protocol-error', error: expect.any(StreamProtocolError) })
      expect(onError).toHaveBeenCalledOnce()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('returns typed HTTP, unauthorized, and aborted outcomes', async () => {
    const originalFetch = globalThis.fetch
    const onError = vi.fn()
    const onUnauthorized = vi.fn()
    const controller = new AbortController()
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Denied' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'))

    try {
      const httpOutcome = await streamSSE(
        '/stream',
        {},
        {
          accepts: (event): event is StreamEvent => Boolean(event),
          onEvent: vi.fn(),
          onError,
        },
      )
      expect(httpOutcome).toEqual({ kind: 'http-error', error: expect.any(StreamHttpError) })
      expect(onError).toHaveBeenCalledWith(expect.any(StreamHttpError))

      onError.mockClear()
      const unauthorizedOutcome = await streamSSE(
        '/stream',
        {},
        {
          accepts: (event): event is StreamEvent => Boolean(event),
          onEvent: vi.fn(),
          onError,
          onUnauthorized,
        },
      )
      expect(unauthorizedOutcome.kind).toBe('unauthorized')
      expect(onUnauthorized).toHaveBeenCalledOnce()
      expect(onError).not.toHaveBeenCalled()

      controller.abort()
      const abortedOutcome = await streamSSE(
        '/stream',
        { signal: controller.signal },
        {
          accepts: (event): event is StreamEvent => Boolean(event),
          onEvent: vi.fn(),
          onError,
        },
      )
      expect(abortedOutcome.kind).toBe('aborted')
      expect(onError).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('reports server errors without completing', async () => {
    const originalFetch = globalThis.fetch
    const onError = vi.fn()
    const onComplete = vi.fn()
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('data: {"type":"error","message":"failed"}\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    )

    try {
      const outcome = await streamSSE(
        '/stream',
        {},
        {
          accepts: (event): event is StreamEvent => Boolean(event),
          onEvent: vi.fn(),
          onError,
          onComplete,
        },
      )

      expect(outcome).toEqual({ kind: 'server-error', error: expect.any(StreamServerError) })
      expect(onError).toHaveBeenCalledOnce()
      expect(onComplete).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('completes successful streams exactly once', async () => {
    const originalFetch = globalThis.fetch
    const onComplete = vi.fn()
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('data: {"type":"done"}\n\ndata: {"type":"done"}\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    )

    try {
      const outcome = await streamSSE(
        '/stream',
        {},
        {
          accepts: (event): event is StreamEvent => Boolean(event),
          onEvent: vi.fn(),
          onComplete,
        },
      )

      expect(outcome).toEqual({ kind: 'success' })
      expect(onComplete).toHaveBeenCalledOnce()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('reconnects a durable stream from the last event id', async () => {
    const originalFetch = globalThis.fetch
    const onEvent = vi.fn()
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('id: 7\ndata: {"type":"content_delta","text":"first"}\n\n', {
          status: 200,
          headers: { 'X-Run-Id': 'run-1' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('data: {"type":"done"}\n\n', {
          status: 200,
          headers: { 'X-Run-Id': 'run-1' },
        }),
      )

    try {
      const outcome = await streamDurableSSE({
        storageKey: 'test',
        mode: 'start',
        startUrl: '/runs',
        startInit: { method: 'POST' },
        reconnectUrl: ({ runId, after }) => `/runs?run_id=${runId}&after=${after}`,
        runIdHeader: 'X-Run-Id',
        reconnectDelayMs: 0,
        accepts: (event): event is StreamEvent => Boolean(event),
        onEvent,
      })

      expect(outcome.kind).toBe('success')
      expect(onEvent).toHaveBeenCalledWith({ type: 'content_delta', text: 'first' })
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        '/runs?run_id=run-1&after=7',
        expect.objectContaining({ method: 'GET', credentials: 'include' }),
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('restores a durable cursor after an aborted page connection', async () => {
    const originalFetch = globalThis.fetch
    installMemoryStorage()
    const controller = new AbortController()
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('id: 4\ndata: {"type":"content_delta","text":"saved"}\n\n', {
          status: 200,
          headers: { 'X-Run-Id': 'run-reload' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('data: {"type":"done"}\n\n', {
          status: 200,
          headers: { 'X-Run-Id': 'run-reload' },
        }),
      )

    try {
      const interrupted = await streamDurableSSE({
        storageKey: 'reload-test',
        mode: 'start',
        startUrl: '/runs',
        startInit: { method: 'POST' },
        reconnectUrl: ({ runId, after }) => `/runs?run_id=${runId}&after=${after}`,
        runIdHeader: 'X-Run-Id',
        signal: controller.signal,
        accepts: (event): event is StreamEvent => Boolean(event),
        onEvent: () => controller.abort(),
      })
      expect(interrupted.kind).toBe('aborted')

      const resumed = await streamDurableSSE({
        storageKey: 'reload-test',
        mode: 'reconnect',
        startUrl: '/runs',
        startInit: { method: 'POST' },
        reconnectUrl: ({ runId, after }) => `/runs?run_id=${runId}&after=${after}`,
        runIdHeader: 'X-Run-Id',
        accepts: (event): event is StreamEvent => Boolean(event),
        onEvent: vi.fn(),
      })

      expect(resumed.kind).toBe('success')
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        '/runs?run_id=run-reload&after=4',
        expect.objectContaining({ method: 'GET', credentials: 'include' }),
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('cancels the stored durable run and clears its cursor', async () => {
    const originalFetch = globalThis.fetch
    const localStorageMock = installMemoryStorage()
    localStorageMock.setItem(
      `${durableRunStoragePrefix}cancel-test`,
      JSON.stringify({ kind: 'reconnecting', runId: 'run-9', after: 3 }),
    )
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

    try {
      await cancelDurableRun({
        storageKey: 'cancel-test',
        cancelUrl: (runId) => `/runs?run_id=${runId}`,
      })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/runs?run_id=run-9',
        expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
      )
      expect(localStorageMock.getItem(`${durableRunStoragePrefix}cancel-test`)).toBeNull()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
