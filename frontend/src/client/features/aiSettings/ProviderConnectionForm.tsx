import type { CSSProperties, FormEvent } from 'react'
import {
  capabilityOptions,
  modelTaskOptions,
  newModel,
  nextModelKey,
  providerFromValue,
  providerLabels,
  setCapability,
  type FormFields,
  type FormState,
} from './aiSettingsModel'

const sectionStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e5e5',
  borderRadius: 12,
  padding: 24,
}

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #d4d4d4',
  borderRadius: 7,
  padding: '9px 10px',
  font: 'inherit',
  background: '#fff',
  color: '#272727',
}

const buttonStyle: CSSProperties = {
  border: '1px solid #d4d4d4',
  background: '#fff',
  borderRadius: 7,
  padding: '8px 12px',
  font: 'inherit',
  cursor: 'pointer',
}

type OpenFormState = Exclude<FormState, { kind: 'closed' }>

interface ProviderConnectionFormProps {
  form: OpenFormState
  saving: boolean
  updateFields: (change: (fields: FormFields) => FormFields) => void
  onSubmit: () => Promise<void>
  onClose: () => void
}

export default function ProviderConnectionForm({
  form,
  saving,
  updateFields,
  onSubmit,
  onClose,
}: ProviderConnectionFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void onSubmit()
  }

  return (
    <section aria-labelledby="connection-form-heading" style={sectionStyle}>
      <h2 id="connection-form-heading" style={{ fontSize: 20, color: '#272727' }}>
        {form.kind === 'create' ? 'Add provider connection' : 'Edit provider connection'}
      </h2>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={saving} style={{ border: 0, display: 'grid', gap: 16, marginTop: 18 }}>
          <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
            Connection details
          </legend>
          <label>
            <span style={{ display: 'block', marginBottom: 6 }}>Provider</span>
            <select
              aria-label="Provider"
              style={inputStyle}
              value={form.fields.provider}
              onChange={(event) =>
                updateFields((fields) => ({
                  ...fields,
                  provider: providerFromValue(event.target.value),
                }))
              }
            >
              {Object.entries(providerLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 6 }}>Display name</span>
            <input
              style={inputStyle}
              value={form.fields.name}
              onChange={(event) =>
                updateFields((fields) => ({ ...fields, name: event.target.value }))
              }
            />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 6 }}>
              API key{form.kind === 'edit' ? ' (leave blank to keep current key)' : ''}
            </span>
            <input
              aria-label="API key"
              type="password"
              autoComplete="new-password"
              style={inputStyle}
              value={form.fields.credential}
              onChange={(event) =>
                updateFields((fields) => ({ ...fields, credential: event.target.value }))
              }
            />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={form.fields.enabled}
              onChange={(event) =>
                updateFields((fields) => ({ ...fields, enabled: event.target.checked }))
              }
            />
            Enabled
          </label>

          {form.fields.provider === 'openai-compatible' && (
            <>
              <label>
                <span style={{ display: 'block', marginBottom: 6 }}>Endpoint URL</span>
                <input
                  style={inputStyle}
                  type="url"
                  value={form.fields.baseUrl}
                  onChange={(event) =>
                    updateFields((fields) => ({
                      ...fields,
                      baseUrl: event.target.value,
                    }))
                  }
                />
              </label>
              <fieldset style={{ border: 0 }}>
                <legend style={{ fontWeight: 600, color: '#272727', marginBottom: 10 }}>
                  Custom models
                </legend>
                <div style={{ display: 'grid', gap: 14 }}>
                  {form.fields.models.map((model, modelIndex) => (
                    <fieldset
                      key={model.key}
                      style={{
                        border: '1px solid #e5e5e5',
                        borderRadius: 8,
                        padding: 14,
                        display: 'grid',
                        gap: 12,
                      }}
                    >
                      <legend style={{ padding: '0 5px' }}>Model {modelIndex + 1}</legend>
                      <label>
                        <span style={{ display: 'block', marginBottom: 6 }}>Model ID</span>
                        <input
                          style={inputStyle}
                          value={model.providerModelId}
                          onChange={(event) =>
                            updateFields((fields) => ({
                              ...fields,
                              models: fields.models.map((item) =>
                                item.key === model.key
                                  ? { ...item, providerModelId: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span style={{ display: 'block', marginBottom: 6 }}>
                          Model display name
                        </span>
                        <input
                          style={inputStyle}
                          value={model.displayName}
                          onChange={(event) =>
                            updateFields((fields) => ({
                              ...fields,
                              models: fields.models.map((item) =>
                                item.key === model.key
                                  ? { ...item, displayName: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <fieldset style={{ border: 0 }}>
                        <legend>Capabilities</legend>
                        <div
                          style={{
                            display: 'flex',
                            gap: 14,
                            flexWrap: 'wrap',
                            marginTop: 8,
                          }}
                        >
                          {capabilityOptions.map((option) => (
                            <label key={`${option.direction}-${option.capability}`}>
                              <input
                                type="checkbox"
                                checked={
                                  option.direction === 'input'
                                    ? model.capabilities.input[option.capability]
                                    : model.capabilities.output[option.capability]
                                }
                                onChange={(event) =>
                                  updateFields((fields) => ({
                                    ...fields,
                                    models: fields.models.map((item) =>
                                      item.key === model.key
                                        ? {
                                            ...item,
                                            capabilities: setCapability(
                                              item.capabilities,
                                              option,
                                              event.target.checked,
                                            ),
                                          }
                                        : item,
                                    ),
                                  }))
                                }
                              />{' '}
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset style={{ border: 0 }}>
                        <legend>Supported tasks</legend>
                        <div
                          style={{
                            display: 'flex',
                            gap: 14,
                            flexWrap: 'wrap',
                            marginTop: 8,
                          }}
                        >
                          {modelTaskOptions.map(([task, label]) => (
                            <label key={task}>
                              <input
                                type="checkbox"
                                checked={model.tasks.includes(task)}
                                onChange={(event) =>
                                  updateFields((fields) => ({
                                    ...fields,
                                    models: fields.models.map((item) =>
                                      item.key === model.key
                                        ? {
                                            ...item,
                                            tasks: event.target.checked
                                              ? [...item.tasks, task]
                                              : item.tasks.filter((current) => current !== task),
                                          }
                                        : item,
                                    ),
                                  }))
                                }
                              />{' '}
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      {form.fields.models.length > 1 && (
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() =>
                            updateFields((fields) => ({
                              ...fields,
                              models: fields.models.filter((item) => item.key !== model.key),
                            }))
                          }
                        >
                          Remove model
                        </button>
                      )}
                    </fieldset>
                  ))}
                </div>
                <button
                  type="button"
                  style={{ ...buttonStyle, marginTop: 12 }}
                  onClick={() =>
                    updateFields((fields) => ({
                      ...fields,
                      models: [...fields.models, newModel(nextModelKey(fields.models))],
                    }))
                  }
                >
                  Add model
                </button>
              </fieldset>
            </>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ ...buttonStyle, background: '#272727', color: '#fff' }}>
              {saving ? 'Saving…' : 'Save connection'}
            </button>
            <button type="button" style={buttonStyle} onClick={onClose}>
              Close
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}
