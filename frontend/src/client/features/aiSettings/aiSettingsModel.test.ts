import { describe, expect, it } from 'vitest'
import { AiSettingsError, type AiTask, type ProviderConnection } from './aiSettingsApi'
import {
  buildConnectionInput,
  capabilityText,
  fieldsForConnection,
  initialFields,
  modelTargetValue,
  safeError,
  validateEndpoint,
} from './aiSettingsModel'

const capabilities = {
  input: { text: true, image: false, pdf: true },
  output: { text: true, structured: true, toolCalls: false },
  contextWindowTokens: 128000,
  maxOutputTokens: 4096,
}

describe('AI settings model', () => {
  it('enforces the endpoint transport and credential policy', () => {
    expect(validateEndpoint('not a URL', true)).toBe('Enter a valid endpoint URL.')
    expect(validateEndpoint('https://name:secret@example.com/v1', true)).toBe(
      'Endpoint URLs cannot contain credentials.',
    )
    expect(validateEndpoint('https://example.com/v1', false)).toBeNull()
    expect(validateEndpoint('http://localhost:11434/v1', true)).toBeNull()
    expect(validateEndpoint('http://127.0.0.1:11434/v1', true)).toBeNull()
    expect(validateEndpoint('http://[::1]:11434/v1', true)).toBeNull()
    expect(validateEndpoint('http://localhost:11434/v1', false)).toBe(
      'Use HTTPS. Loopback HTTP is allowed only in development.',
    )
    expect(validateEndpoint('http://example.com/v1', true)).toBe(
      'Use HTTPS. Loopback HTTP is allowed only in development.',
    )
  })

  it('requires and trims credentials for create payloads', () => {
    const fields = {
      ...initialFields(),
      name: '  Personal Claude  ',
      credential: '  submitted-secret  ',
    }

    expect(buildConnectionInput(fields, true, false)).toEqual({
      kind: 'valid',
      input: {
        provider: 'anthropic',
        name: 'Personal Claude',
        credential: 'submitted-secret',
        enabled: true,
      },
    })
    expect(buildConnectionInput({ ...fields, credential: '   ' }, true, false)).toEqual({
      kind: 'invalid',
      message: 'Enter an API key.',
    })
  })

  it('omits blank edit credentials and strips form-only model keys', () => {
    const fields = {
      ...initialFields(),
      provider: 'openai-compatible' as const,
      name: '  Gateway  ',
      credential: '   ',
      baseUrl: '  https://gateway.example.com/v1  ',
      models: [
        {
          ...initialFields().models[0],
          key: 17,
          id: 'model-1',
          providerModelId: '  custom-model  ',
          displayName: '  Custom Model  ',
          capabilities,
          tasks: ['main', 'tabular'] as AiTask[],
        },
      ],
    }

    const result = buildConnectionInput(fields, false, false)

    expect(result).toEqual({
      kind: 'valid',
      input: {
        provider: 'openai-compatible',
        name: 'Gateway',
        enabled: true,
        baseUrl: 'https://gateway.example.com/v1',
        models: [
          {
            id: 'model-1',
            providerModelId: 'custom-model',
            displayName: 'Custom Model',
            capabilities,
            tasks: ['main', 'tabular'],
          },
        ],
      },
    })
    if (result.kind === 'valid') {
      expect(result.input).not.toHaveProperty('credential')
      if (result.input.provider === 'openai-compatible') {
        expect(result.input.models[0]).not.toHaveProperty('key')
      }
    }
  })

  it('validates custom model identity and task eligibility', () => {
    const fields = {
      ...initialFields(),
      provider: 'openai-compatible' as const,
      name: 'Gateway',
      credential: 'secret',
      baseUrl: 'https://gateway.example.com/v1',
    }

    expect(buildConnectionInput({ ...fields, models: [] }, true, false)).toEqual({
      kind: 'invalid',
      message: 'Add at least one custom model.',
    })
    expect(
      buildConnectionInput(
        {
          ...fields,
          models: [{ ...fields.models[0], providerModelId: 'model', displayName: '   ' }],
        },
        true,
        false,
      ),
    ).toEqual({
      kind: 'invalid',
      message: 'Each custom model needs an ID and display name.',
    })
    expect(
      buildConnectionInput(
        {
          ...fields,
          models: [
            {
              ...fields.models[0],
              providerModelId: 'model',
              displayName: 'Model',
              tasks: [],
            },
          ],
        },
        true,
        false,
      ),
    ).toEqual({
      kind: 'invalid',
      message: 'Each custom model must support at least one task.',
    })
  })

  it('hydrates editable fields without hydrating credentials', () => {
    const connection: ProviderConnection & { credential: string } = {
      id: 'connection-1',
      provider: 'openai-compatible',
      name: 'Gateway',
      source: 'user',
      baseUrl: 'https://gateway.example.com/v1',
      enabled: false,
      hasCredential: true,
      credential: 'must-not-be-hydrated',
      models: [
        {
          id: 'model-1',
          providerModelId: 'custom-model',
          displayName: 'Custom Model',
          capabilities,
          tasks: ['title'],
        },
      ],
    }

    expect(fieldsForConnection(connection)).toEqual({
      provider: 'openai-compatible',
      name: 'Gateway',
      credential: '',
      enabled: false,
      baseUrl: 'https://gateway.example.com/v1',
      models: [
        {
          key: 1,
          id: 'model-1',
          providerModelId: 'custom-model',
          displayName: 'Custom Model',
          capabilities,
          tasks: ['title'],
        },
      ],
    })
  })

  it('formats model details, composite targets, and safe errors', () => {
    expect(
      capabilityText({
        id: 'model-1',
        provider: 'openai',
        providerModelId: 'gpt-main',
        displayName: 'Chat Model',
        capabilities,
        tasks: ['main'],
        connectionId: 'connection-1',
        connectionName: 'Personal OpenAI',
        connectionSource: 'user',
      }),
    ).toBe('text input, PDF input, text output, structured output, 128,000 context, 4,096 output')
    expect(modelTargetValue({ connectionId: 'connection-1', modelId: 'model-1' })).toBe(
      '["connection-1","model-1"]',
    )
    expect(safeError(new AiSettingsError('save', 422, 'Safe message'), 'Fallback')).toBe(
      'Safe message',
    )
    expect(safeError(new Error('Raw error'), 'Fallback')).toBe('Fallback')
  })
})
