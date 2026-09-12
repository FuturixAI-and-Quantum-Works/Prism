import { apiFetch, apiUrl } from '../../lib/apiTransport'

export type AiProvider = 'anthropic' | 'google' | 'openai' | 'openai-compatible'
export type AiTask = 'main' | 'title' | 'tabular'

export interface ModelCapabilities {
  input: {
    text: boolean
    image: boolean
    pdf: boolean
  }
  output: {
    text: boolean
    structured: boolean
    toolCalls: boolean
  }
  contextWindowTokens?: number
  maxOutputTokens?: number
}

export interface AiModel {
  id: string
  provider: AiProvider
  providerModelId: string
  displayName: string
  capabilities: ModelCapabilities
  tasks: AiTask[]
  connectionId: string
  connectionName: string
  connectionSource: 'server' | 'user'
}

export interface ProviderConnection {
  id: string
  provider: AiProvider
  name: string
  source: 'server' | 'user'
  baseUrl: string | null
  enabled: boolean
  hasCredential: true
  models: CustomModelInput[]
}

export type AiPreferences = Partial<Record<AiTask, { connectionId: string; modelId: string }>>

export interface AiSettingsSnapshot {
  connections: ProviderConnection[]
  models: AiModel[]
  preferences: AiPreferences
}

export interface CustomModelInput {
  id?: string
  providerModelId: string
  displayName: string
  capabilities: ModelCapabilities
  tasks: AiTask[]
}

interface ConnectionInputBase {
  name: string
  credential?: string
  enabled: boolean
}

export type ConnectionInput =
  | (ConnectionInputBase & {
      provider: Exclude<AiProvider, 'openai-compatible'>
    })
  | (ConnectionInputBase & {
      provider: 'openai-compatible'
      baseUrl: string
      models: CustomModelInput[]
    })

type AiOperation = 'load' | 'save' | 'delete' | 'test' | 'preference'

export class AiSettingsError extends Error {
  readonly operation: AiOperation
  readonly status: number | null

  constructor(operation: AiOperation, status: number | null, message: string) {
    super(message)
    this.name = 'AiSettingsError'
    this.operation = operation
    this.status = status
  }
}

const tasks: AiTask[] = ['main', 'title', 'tabular']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isOptionalPositiveNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value > 0)
}

function isProvider(value: unknown): value is AiProvider {
  return (
    value === 'anthropic' ||
    value === 'google' ||
    value === 'openai' ||
    value === 'openai-compatible'
  )
}

function isTask(value: unknown): value is AiTask {
  return value === 'main' || value === 'title' || value === 'tabular'
}

function parseCapabilities(value: unknown): ModelCapabilities | null {
  if (!isRecord(value) || !isRecord(value.input) || !isRecord(value.output)) return null
  const input = value.input
  const output = value.output
  if (
    !isBoolean(input.text) ||
    !isBoolean(input.image) ||
    !isBoolean(input.pdf) ||
    !isBoolean(output.text) ||
    !isBoolean(output.structured) ||
    !isBoolean(output.toolCalls) ||
    !isOptionalPositiveNumber(value.contextWindowTokens) ||
    !isOptionalPositiveNumber(value.maxOutputTokens)
  ) {
    return null
  }
  return {
    input: { text: input.text, image: input.image, pdf: input.pdf },
    output: {
      text: output.text,
      structured: output.structured,
      toolCalls: output.toolCalls,
    },
    ...(value.contextWindowTokens === undefined
      ? {}
      : { contextWindowTokens: value.contextWindowTokens }),
    ...(value.maxOutputTokens === undefined ? {} : { maxOutputTokens: value.maxOutputTokens }),
  }
}

function parseConnection(value: unknown): ProviderConnection | null {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !isProvider(value.provider) ||
    !isString(value.name) ||
    (value.source !== 'server' && value.source !== 'user') ||
    !(value.baseUrl === null || isString(value.baseUrl)) ||
    !isBoolean(value.enabled) ||
    value.hasCredential !== true ||
    !Array.isArray(value.models)
  ) {
    return null
  }
  const models = parseArray(value.models, parseConnectionModel)
  if (!models) return null
  return {
    id: value.id,
    provider: value.provider,
    name: value.name,
    source: value.source,
    baseUrl: value.baseUrl,
    enabled: value.enabled,
    hasCredential: true,
    models,
  }
}

function parseConnectionModel(value: unknown): CustomModelInput | null {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !isString(value.providerModelId) ||
    !isString(value.displayName) ||
    !Array.isArray(value.tasks) ||
    !value.tasks.every(isTask)
  ) {
    return null
  }
  const capabilities = parseCapabilities(value.capabilities)
  if (!capabilities) return null
  return {
    id: value.id,
    providerModelId: value.providerModelId,
    displayName: value.displayName,
    capabilities,
    tasks: value.tasks,
  }
}

function parseModel(value: unknown): AiModel | null {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !isProvider(value.provider) ||
    !isString(value.providerModelId) ||
    !isString(value.displayName) ||
    !Array.isArray(value.tasks) ||
    !value.tasks.every(isTask) ||
    !isString(value.connectionId) ||
    !isString(value.connectionName) ||
    (value.connectionSource !== 'server' && value.connectionSource !== 'user')
  ) {
    return null
  }
  const capabilities = parseCapabilities(value.capabilities)
  if (!capabilities) return null
  return {
    id: value.id,
    provider: value.provider,
    providerModelId: value.providerModelId,
    displayName: value.displayName,
    capabilities,
    tasks: value.tasks,
    connectionId: value.connectionId,
    connectionName: value.connectionName,
    connectionSource: value.connectionSource,
  }
}

function parseArray<T>(value: unknown, parseItem: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null
  const parsed: T[] = []
  for (const item of value) {
    const result = parseItem(item)
    if (!result) return null
    parsed.push(result)
  }
  return parsed
}

function parsePreferences(value: unknown): AiPreferences | null {
  if (!isRecord(value)) return null
  const parsed: AiPreferences = {}
  for (const task of tasks) {
    const target = value[task]
    if (target === undefined) continue
    if (!isRecord(target) || !isString(target.connectionId) || !isString(target.modelId))
      return null
    parsed[task] = { connectionId: target.connectionId, modelId: target.modelId }
  }
  return parsed
}

function safeMessage(operation: AiOperation, status: number | null): string {
  if (status === 401) return 'Your session has expired. Sign in again and retry.'
  if (status === 403) return 'You do not have permission to manage AI settings.'
  if (operation === 'test')
    return 'Provider connection test failed. Check its credentials and settings.'
  if (status === 400 || status === 422)
    return 'The AI settings were not accepted. Review the fields and retry.'
  if (operation === 'load') return 'AI settings could not be loaded. Retry in a moment.'
  if (operation === 'delete') return 'The connection could not be deleted. Retry in a moment.'
  if (operation === 'preference')
    return 'The model preference could not be saved. Retry in a moment.'
  return 'The connection could not be saved. Retry in a moment.'
}

async function request(
  path: string,
  operation: AiOperation,
  init?: Omit<RequestInit, 'credentials'>,
): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(apiUrl(path), {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    })
  } catch {
    throw new AiSettingsError(operation, null, safeMessage(operation, null))
  }
  if (!response.ok) {
    throw new AiSettingsError(operation, response.status, safeMessage(operation, response.status))
  }
  return response
}

async function readJson(response: Response, operation: AiOperation): Promise<unknown> {
  try {
    const body: unknown = await response.json()
    return body
  } catch {
    throw new AiSettingsError(
      operation,
      response.status,
      'AI settings returned an invalid response.',
    )
  }
}

export async function loadAiSettings(): Promise<AiSettingsSnapshot> {
  const [connectionsResponse, modelsResponse, preferencesResponse] = await Promise.all([
    request('/user/ai/connections', 'load'),
    request('/user/ai/models', 'load'),
    request('/user/ai/preferences', 'load'),
  ])
  const [connectionsValue, modelsValue, preferencesValue] = await Promise.all([
    readJson(connectionsResponse, 'load'),
    readJson(modelsResponse, 'load'),
    readJson(preferencesResponse, 'load'),
  ])
  const connections = parseArray(connectionsValue, parseConnection)
  const models = parseArray(modelsValue, parseModel)
  const preferences = parsePreferences(preferencesValue)
  if (!connections || !models || !preferences) {
    throw new AiSettingsError('load', null, 'AI settings returned an invalid response.')
  }
  return { connections, models, preferences }
}

export async function createConnection(input: ConnectionInput): Promise<void> {
  await request('/user/ai/connections', 'save', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateConnection(id: string, input: ConnectionInput): Promise<void> {
  await request(`/user/ai/connections/${encodeURIComponent(id)}`, 'save', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteConnection(id: string): Promise<void> {
  await request(`/user/ai/connections/${encodeURIComponent(id)}`, 'delete', {
    method: 'DELETE',
  })
}

export async function testConnection(id: string): Promise<void> {
  await request(`/user/ai/connections/${encodeURIComponent(id)}/test`, 'test', {
    method: 'POST',
  })
}

export async function savePreference(
  task: AiTask,
  target: { connectionId: string; modelId: string },
): Promise<AiPreferences> {
  const response = await request(`/user/ai/preferences/${task}`, 'preference', {
    method: 'PUT',
    body: JSON.stringify(target),
  })
  const preferences = parsePreferences(await readJson(response, 'preference'))
  if (!preferences) {
    throw new AiSettingsError('preference', null, 'AI settings returned an invalid response.')
  }
  return preferences
}
