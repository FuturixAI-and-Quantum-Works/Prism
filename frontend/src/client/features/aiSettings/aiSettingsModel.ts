import {
  AiSettingsError,
  type AiModel,
  type AiProvider,
  type AiSettingsSnapshot,
  type AiTask,
  type ConnectionInput,
  type CustomModelInput,
  type ModelCapabilities,
  type ProviderConnection,
} from './aiSettingsApi'

export interface ModelDraft extends CustomModelInput {
  key: number
}

export interface FormFields {
  provider: AiProvider
  name: string
  credential: string
  enabled: boolean
  baseUrl: string
  models: ModelDraft[]
}

export type FormState =
  | { kind: 'closed' }
  | { kind: 'create'; fields: FormFields }
  | { kind: 'edit'; connectionId: string; fields: FormFields }

export type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; snapshot: AiSettingsSnapshot }

export type ActionState =
  | { kind: 'idle' }
  | { kind: 'busy'; action: 'save' | 'delete' | 'test' | 'preference'; target?: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

export const emptyCapabilities: ModelCapabilities = {
  input: { text: true, image: false, pdf: false },
  output: { text: true, structured: false, toolCalls: false },
}

export const providerLabels: Record<AiProvider, string> = {
  anthropic: 'Anthropic',
  google: 'Google',
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-compatible',
}

export const taskRows: Array<{ task: AiTask; label: string; detail?: string }> = [
  { task: 'main', label: 'Chat' },
  { task: 'title', label: 'Title generation' },
  { task: 'tabular', label: 'Tabular analysis' },
  {
    task: 'tabular',
    label: 'Compliance review',
    detail: 'Uses the Tabular analysis preference. Both controls stay synchronized.',
  },
]

export const capabilityOptions = [
  { direction: 'input', capability: 'text', label: 'Text input' },
  { direction: 'input', capability: 'image', label: 'Image input' },
  { direction: 'input', capability: 'pdf', label: 'PDF input' },
  { direction: 'output', capability: 'text', label: 'Text output' },
  { direction: 'output', capability: 'structured', label: 'Structured output' },
  { direction: 'output', capability: 'toolCalls', label: 'Tool calls' },
] as const

export const modelTaskOptions = [
  ['main', 'Chat'],
  ['title', 'Title generation'],
  ['tabular', 'Tabular and compliance'],
] satisfies Array<[AiTask, string]>

export function newModel(key: number): ModelDraft {
  return {
    key,
    providerModelId: '',
    displayName: '',
    capabilities: emptyCapabilities,
    tasks: ['main'],
  }
}

export function nextModelKey(models: ModelDraft[]): number {
  return Math.max(0, ...models.map((model) => model.key)) + 1
}

export function setCapability(
  capabilities: ModelCapabilities,
  option: (typeof capabilityOptions)[number],
  checked: boolean,
): ModelCapabilities {
  if (option.direction === 'input') {
    return {
      ...capabilities,
      input: { ...capabilities.input, [option.capability]: checked },
    }
  }
  return {
    ...capabilities,
    output: { ...capabilities.output, [option.capability]: checked },
  }
}

export function initialFields(): FormFields {
  return {
    provider: 'anthropic',
    name: '',
    credential: '',
    enabled: true,
    baseUrl: '',
    models: [newModel(1)],
  }
}

export function providerFromValue(value: string): AiProvider {
  if (value === 'google' || value === 'openai' || value === 'openai-compatible') return value
  return 'anthropic'
}

export function safeError(error: unknown, fallback: string): string {
  return error instanceof AiSettingsError ? error.message : fallback
}

export function validateEndpoint(value: string, allowLoopbackHttp: boolean): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'Enter a valid endpoint URL.'
  }
  if (url.username || url.password) return 'Endpoint URLs cannot contain credentials.'
  if (url.protocol === 'https:') return null
  const loopbackHosts = ['localhost', '127.0.0.1', '::1', '[::1]']
  if (allowLoopbackHttp && url.protocol === 'http:' && loopbackHosts.includes(url.hostname)) {
    return null
  }
  return 'Use HTTPS. Loopback HTTP is allowed only in development.'
}

type ConnectionInputResult =
  { kind: 'valid'; input: ConnectionInput } | { kind: 'invalid'; message: string }

export function buildConnectionInput(
  fields: FormFields,
  requireCredential: boolean,
  allowLoopbackHttp: boolean,
): ConnectionInputResult {
  const name = fields.name.trim()
  const credential = fields.credential.trim()
  if (!name) return { kind: 'invalid', message: 'Enter a display name.' }
  if (requireCredential && !credential) {
    return { kind: 'invalid', message: 'Enter an API key.' }
  }
  const credentialInput = credential ? { credential } : {}
  if (fields.provider !== 'openai-compatible') {
    return {
      kind: 'valid',
      input: { provider: fields.provider, name, ...credentialInput, enabled: fields.enabled },
    }
  }
  const baseUrl = fields.baseUrl.trim()
  const endpointError = validateEndpoint(baseUrl, allowLoopbackHttp)
  if (endpointError) return { kind: 'invalid', message: endpointError }
  if (fields.models.length === 0) {
    return { kind: 'invalid', message: 'Add at least one custom model.' }
  }
  const models = fields.models.map(({ key: _key, ...model }) => ({
    ...model,
    providerModelId: model.providerModelId.trim(),
    displayName: model.displayName.trim(),
  }))
  if (models.some((model) => !model.providerModelId || !model.displayName)) {
    return { kind: 'invalid', message: 'Each custom model needs an ID and display name.' }
  }
  if (models.some((model) => model.tasks.length === 0)) {
    return { kind: 'invalid', message: 'Each custom model must support at least one task.' }
  }
  return {
    kind: 'valid',
    input: {
      provider: 'openai-compatible',
      name,
      ...credentialInput,
      enabled: fields.enabled,
      baseUrl,
      models,
    },
  }
}

export function capabilityText(model: AiModel): string {
  const capabilities = [
    model.capabilities.input.text && 'text input',
    model.capabilities.input.image && 'image input',
    model.capabilities.input.pdf && 'PDF input',
    model.capabilities.output.text && 'text output',
    model.capabilities.output.structured && 'structured output',
    model.capabilities.output.toolCalls && 'tool calls',
  ].filter(Boolean)
  const limits = [
    model.capabilities.contextWindowTokens &&
      `${model.capabilities.contextWindowTokens.toLocaleString()} context`,
    model.capabilities.maxOutputTokens &&
      `${model.capabilities.maxOutputTokens.toLocaleString()} output`,
  ].filter(Boolean)
  return [...capabilities, ...limits].join(', ')
}

export function modelTargetValue(target: { connectionId: string; modelId: string }): string {
  return JSON.stringify([target.connectionId, target.modelId])
}

export function fieldsForConnection(connection: ProviderConnection): FormFields {
  const customModels = connection.models.map((model, index) => ({
    key: index + 1,
    id: model.id,
    providerModelId: model.providerModelId,
    displayName: model.displayName,
    capabilities: model.capabilities,
    tasks: model.tasks,
  }))
  return {
    provider: connection.provider,
    name: connection.name,
    credential: '',
    enabled: connection.enabled,
    baseUrl: connection.baseUrl ?? '',
    models: customModels.length > 0 ? customModels : [newModel(1)],
  }
}
