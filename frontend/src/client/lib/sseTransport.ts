import {
  isStreamTerminalEvent,
  parseStreamEvent,
  type StreamEvent,
  type StreamTerminalEvent,
} from '@prism/protocol'
import { apiFetch, durableRunStoragePrefix } from './apiTransport'

export class StreamHttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'StreamHttpError'
    this.status = status
  }
}

export class StreamProtocolError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'StreamProtocolError'
    this.cause = cause
  }
}

export class StreamUnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'StreamUnauthorizedError'
  }
}

export class StreamAbortedError extends Error {
  constructor() {
    super('Stream aborted')
    this.name = 'AbortError'
  }
}

export class StreamServerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StreamServerError'
  }
}

export type StreamOutcome =
  | { kind: 'success' }
  | { kind: 'http-error'; error: StreamHttpError }
  | { kind: 'protocol-error'; error: StreamProtocolError }
  | { kind: 'unauthorized'; error: StreamUnauthorizedError }
  | { kind: 'aborted'; error: StreamAbortedError }
  | { kind: 'server-error'; error: StreamServerError }

type StreamCallbacks<Event extends StreamEvent> = {
  accepts: (event: StreamEvent) => event is Event
  onEvent: (event: Event, metadata: StreamEventMetadata) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  onResponse?: (response: Response) => void
}

export type StreamEventMetadata = Readonly<{ id: number | null }>

export async function consumeEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent, metadata: StreamEventMetadata) => void,
): Promise<StreamTerminalEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let dataLines: string[] = []
  let eventId: number | null = null
  let terminal: StreamTerminalEvent | undefined

  const dispatch = () => {
    if (dataLines.length === 0 || terminal) {
      dataLines = []
      eventId = null
      return
    }

    const data = dataLines.join('\n')
    dataLines = []
    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch (cause) {
      throw new StreamProtocolError('Stream event contains invalid JSON', cause)
    }
    let event: StreamEvent
    try {
      event = parseStreamEvent(parsed)
    } catch (cause) {
      throw new StreamProtocolError('Stream event has an unknown type', cause)
    }

    onEvent(event, { id: eventId })
    if (isStreamTerminalEvent(event)) terminal = event
    eventId = null
  }

  const processLine = (rawLine: string) => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line === '') {
      dispatch()
      return
    }
    if (line.startsWith(':')) return
    if (line.startsWith('id:')) {
      const id = Number(line.slice(3).trim())
      eventId = Number.isSafeInteger(id) && id >= 0 ? id : null
      return
    }
    if (!line.startsWith('data:')) return
    const value = line.slice(5)
    dataLines.push(value.startsWith(' ') ? value.slice(1) : value)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      processLine(buffer.slice(0, newline))
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')
    }
  }

  buffer += decoder.decode()
  if (buffer) processLine(buffer)
  dispatch()

  if (!terminal) {
    throw new StreamProtocolError('Stream ended before a completion event')
  }
  return terminal
}

export async function streamSSE<Event extends StreamEvent>(
  input: RequestInfo | URL,
  init: RequestInit,
  callbacks: StreamCallbacks<Event> & { onUnauthorized?: () => void },
): Promise<StreamOutcome> {
  try {
    const response = await apiFetch(input, init)
    callbacks.onResponse?.(response)
    if (!response.ok) {
      if (response.status === 401) {
        const error = new StreamUnauthorizedError()
        callbacks.onUnauthorized?.()
        return { kind: 'unauthorized', error }
      }
      const payload: unknown = await response.json().catch(() => null)
      const detail =
        payload &&
        typeof payload === 'object' &&
        'detail' in payload &&
        typeof payload.detail === 'string'
          ? payload.detail
          : `HTTP ${response.status}`
      const error = new StreamHttpError(response.status, detail)
      callbacks.onError?.(error)
      return { kind: 'http-error', error }
    }
    if (!response.body) {
      throw new StreamProtocolError('Stream response has no body')
    }
    const terminal = await consumeEventStream(response.body, (event, metadata) => {
      if (!callbacks.accepts(event)) {
        throw new StreamProtocolError(`Unexpected ${event.type} event`)
      }
      callbacks.onEvent(event, metadata)
    })
    if (terminal.type === 'error') {
      const error = new StreamServerError(terminal.message)
      callbacks.onError?.(error)
      return { kind: 'server-error', error }
    }
    callbacks.onComplete?.()
    return { kind: 'success' }
  } catch (error) {
    if (
      init.signal?.aborted ||
      (error instanceof Error &&
        (error.name === 'AbortError' || error.message.startsWith('AbortError:')))
    ) {
      return { kind: 'aborted', error: new StreamAbortedError() }
    }
    const protocolError =
      error instanceof StreamProtocolError
        ? error
        : new StreamProtocolError('Stream transport failed', error)
    callbacks.onError?.(protocolError)
    return { kind: 'protocol-error', error: protocolError }
  }
}

type DurableRunState =
  | Readonly<{ kind: 'starting'; idempotencyKey: string }>
  | Readonly<{ kind: 'reconnecting'; runId: string | null; after: number }>

type DurableStreamOptions<Event extends StreamEvent> = Readonly<{
  storageKey: string
  mode: 'start' | 'reconnect'
  startUrl: string
  startInit: RequestInit
  reconnectUrl: (cursor: Readonly<{ runId: string | null; after: number }>) => string
  runIdHeader: string
  signal?: AbortSignal
  accepts: (event: StreamEvent) => event is Event
  onEvent: (event: Event) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  reconnectDelayMs?: number
  maxReconnectAttempts?: number
}>

function durableStorageKey(key: string) {
  return `${durableRunStoragePrefix}${key}`
}

function durableStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isDurableRunState(value: unknown): value is DurableRunState {
  if (!value || typeof value !== 'object') return false
  const kind = Reflect.get(value, 'kind')
  if (kind === 'starting') return typeof Reflect.get(value, 'idempotencyKey') === 'string'
  if (kind !== 'reconnecting') return false
  const runId = Reflect.get(value, 'runId')
  const after = Reflect.get(value, 'after')
  return (
    (runId === null || typeof runId === 'string') &&
    typeof after === 'number' &&
    Number.isSafeInteger(after) &&
    after >= 0
  )
}

function readDurableRunState(key: string): DurableRunState | null {
  try {
    const value: unknown = JSON.parse(durableStorage()?.getItem(durableStorageKey(key)) || 'null')
    return isDurableRunState(value) ? value : null
  } catch {
    return null
  }
}

function writeDurableRunState(key: string, state: DurableRunState) {
  durableStorage()?.setItem(durableStorageKey(key), JSON.stringify(state))
}

export function hasDurableRunState(key: string) {
  return readDurableRunState(key) !== null
}

export function clearDurableRunState(key: string) {
  durableStorage()?.removeItem(durableStorageKey(key))
}

function waitForReconnect(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal?.aborted || delayMs === 0) {
      resolve()
      return
    }
    const timeout = window.setTimeout(resolve, delayMs)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout)
        resolve()
      },
      { once: true },
    )
  })
}

export async function streamDurableSSE<Event extends StreamEvent>(
  options: DurableStreamOptions<Event>,
): Promise<StreamOutcome> {
  const storedState = readDurableRunState(options.storageKey)
  let state: DurableRunState =
    options.mode === 'start'
      ? { kind: 'starting', idempotencyKey: crypto.randomUUID() }
      : storedState?.kind === 'reconnecting'
        ? storedState
        : {
            kind: 'reconnecting',
            runId: null,
            after: 0,
          }
  writeDurableRunState(options.storageKey, state)

  const maxReconnectAttempts = options.maxReconnectAttempts ?? 4
  let reconnectAttempts = 0

  while (true) {
    const request =
      state.kind === 'starting'
        ? {
            url: options.startUrl,
            init: {
              ...options.startInit,
              headers: {
                ...options.startInit.headers,
                'Idempotency-Key': state.idempotencyKey,
              },
              signal: options.signal,
            },
          }
        : {
            url: options.reconnectUrl(state),
            init: { method: 'GET', signal: options.signal },
          }

    const outcome = await streamSSE(request.url, request.init, {
      accepts: options.accepts,
      onResponse: (response) => {
        if (!response.ok) return
        const runId = response.headers.get(options.runIdHeader)
        const after = state.kind === 'reconnecting' ? state.after : 0
        state = {
          kind: 'reconnecting',
          runId: runId || (state.kind === 'reconnecting' ? state.runId : null),
          after,
        }
        writeDurableRunState(options.storageKey, state)
      },
      onEvent: (event, metadata) => {
        if (state.kind === 'starting') {
          state = { kind: 'reconnecting', runId: null, after: metadata.id ?? 0 }
          writeDurableRunState(options.storageKey, state)
        } else if (metadata.id !== null) {
          state = { ...state, after: Math.max(state.after, metadata.id) }
          writeDurableRunState(options.storageKey, state)
        }
        options.onEvent(event)
      },
    })

    if (outcome.kind === 'success') {
      clearDurableRunState(options.storageKey)
      options.onComplete?.()
      return outcome
    }
    if (outcome.kind === 'aborted') return outcome
    if (outcome.kind !== 'protocol-error' || reconnectAttempts >= maxReconnectAttempts) {
      clearDurableRunState(options.storageKey)
      options.onError?.(outcome.error)
      return outcome
    }

    reconnectAttempts += 1
    await waitForReconnect(options.reconnectDelayMs ?? 250 * reconnectAttempts, options.signal)
    if (options.signal?.aborted) {
      return { kind: 'aborted', error: new StreamAbortedError() }
    }
  }
}

export async function cancelDurableRun(options: {
  storageKey: string
  cancelUrl: (runId: string | null) => string
}) {
  const state = readDurableRunState(options.storageKey)
  const runId = state?.kind === 'reconnecting' ? state.runId : null
  const response = await apiFetch(options.cancelUrl(runId), { method: 'DELETE' })
  if (!response.ok) throw new StreamHttpError(response.status, `HTTP ${response.status}`)
  clearDurableRunState(options.storageKey)
}
