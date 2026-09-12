import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import {
  createConnection,
  deleteConnection,
  loadAiSettings,
  savePreference,
  testConnection,
  updateConnection,
  type AiTask,
  type ProviderConnection,
} from './aiSettingsApi'
import {
  buildConnectionInput,
  capabilityText,
  fieldsForConnection,
  initialFields,
  modelTargetValue,
  providerLabels,
  safeError,
  taskRows,
  type ActionState,
  type FormFields,
  type FormState,
  type PageState,
} from './aiSettingsModel'
import ProviderConnectionForm from './ProviderConnectionForm'

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

export default function ProviderSettings() {
  const [page, setPage] = useState<PageState>({ kind: 'loading' })
  const [form, setForm] = useState<FormState>({ kind: 'closed' })
  const [action, setAction] = useState<ActionState>({ kind: 'idle' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setPage({ kind: 'loading' })
    try {
      setPage({ kind: 'ready', snapshot: await loadAiSettings() })
    } catch (error) {
      setPage({
        kind: 'error',
        message: safeError(error, 'AI settings could not be loaded. Retry in a moment.'),
      })
    }
  }, [])

  useEffect(() => {
    void refresh(true)
  }, [refresh])

  const updateFields = (change: (fields: FormFields) => FormFields) => {
    setForm((current) =>
      current.kind === 'closed' ? current : { ...current, fields: change(current.fields) },
    )
  }

  const handleSubmit = async () => {
    if (form.kind === 'closed') return
    const result = buildConnectionInput(form.fields, form.kind === 'create', import.meta.env.DEV)
    if (result.kind === 'invalid') {
      setAction({ kind: 'error', message: result.message })
      setForm((current) =>
        current.kind === 'closed'
          ? current
          : { ...current, fields: { ...current.fields, credential: '' } },
      )
      return
    }
    setAction({ kind: 'busy', action: 'save' })
    try {
      if (form.kind === 'create') {
        await createConnection(result.input)
      } else {
        await updateConnection(form.connectionId, result.input)
      }
    } catch (error) {
      setAction({
        kind: 'error',
        message: safeError(error, 'The connection could not be saved. Retry in a moment.'),
      })
      return
    } finally {
      setForm((current) =>
        current.kind === 'closed'
          ? current
          : { ...current, fields: { ...current.fields, credential: '' } },
      )
    }
    await refresh()
    setAction({ kind: 'success', message: 'Connection saved.' })
  }

  const handleDelete = async (connection: ProviderConnection) => {
    setAction({ kind: 'busy', action: 'delete', target: connection.id })
    try {
      await deleteConnection(connection.id)
      setConfirmDeleteId(null)
      if (form.kind === 'edit' && form.connectionId === connection.id) {
        setForm({ kind: 'closed' })
      }
      await refresh()
      setAction({ kind: 'success', message: `${connection.name} deleted.` })
    } catch (error) {
      setAction({
        kind: 'error',
        message: safeError(error, 'The connection could not be deleted. Retry in a moment.'),
      })
    }
  }

  const handleTest = async (connection: ProviderConnection) => {
    setAction({ kind: 'busy', action: 'test', target: connection.id })
    try {
      await testConnection(connection.id)
      setAction({ kind: 'success', message: `${connection.name} connected successfully.` })
    } catch (error) {
      setAction({
        kind: 'error',
        message: safeError(
          error,
          'Provider connection test failed. Check its credentials and settings.',
        ),
      })
    }
  }

  const handlePreference = async (task: AiTask, selectedTarget: string) => {
    if (page.kind !== 'ready') return
    const model = page.snapshot.models.find(
      (candidate) =>
        modelTargetValue({ connectionId: candidate.connectionId, modelId: candidate.id }) ===
        selectedTarget,
    )
    if (!model) return
    setAction({ kind: 'busy', action: 'preference', target: task })
    try {
      const preferences = await savePreference(task, {
        connectionId: model.connectionId,
        modelId: model.id,
      })
      setPage({ kind: 'ready', snapshot: { ...page.snapshot, preferences } })
      setAction({ kind: 'success', message: 'Model preference saved.' })
    } catch (error) {
      setAction({
        kind: 'error',
        message: safeError(error, 'The model preference could not be saved. Retry in a moment.'),
      })
    }
  }

  return (
    <>
      {action.kind === 'error' && (
        <p role="alert" style={{ color: '#b42318', marginBottom: 16 }}>
          {action.message}
        </p>
      )}
      {action.kind === 'success' && (
        <p aria-live="polite" style={{ color: '#087443', marginBottom: 16 }}>
          {action.message}
        </p>
      )}

      {page.kind === 'loading' && <p aria-live="polite">Loading AI settings…</p>}
      {page.kind === 'error' && (
        <div role="alert" style={sectionStyle}>
          <p style={{ color: '#b42318', marginBottom: 12 }}>{page.message}</p>
          <button type="button" style={buttonStyle} onClick={() => void refresh(true)}>
            Retry
          </button>
        </div>
      )}
      {page.kind === 'ready' && (
        <div style={{ display: 'grid', gap: 24 }}>
          <section aria-labelledby="connections-heading" style={sectionStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div>
                <h2 id="connections-heading" style={{ fontSize: 20, color: '#272727' }}>
                  Provider connections
                </h2>
                <p style={{ color: '#737373', fontSize: 14, marginTop: 4 }}>
                  Server connections are managed by your administrator.
                </p>
              </div>
              <button
                type="button"
                style={{ ...buttonStyle, background: '#272727', color: '#fff' }}
                onClick={() => {
                  setForm({ kind: 'create', fields: initialFields() })
                  setAction({ kind: 'idle' })
                }}
              >
                Add connection
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {page.snapshot.connections.map((connection) => (
                <article
                  key={connection.id}
                  style={{
                    border: '1px solid #e5e5e5',
                    borderRadius: 9,
                    padding: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong style={{ color: '#272727' }}>{connection.name}</strong>
                    <div style={{ color: '#737373', fontSize: 13, marginTop: 4 }}>
                      {providerLabels[connection.provider]} ·{' '}
                      {connection.source === 'server' ? 'Server managed' : 'Personal'} ·{' '}
                      {connection.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                    {connection.baseUrl && (
                      <div style={{ color: '#737373', fontSize: 13, marginTop: 4 }}>
                        {connection.baseUrl}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={buttonStyle}
                      disabled={action.kind === 'busy' || !connection.enabled}
                      title={
                        connection.enabled
                          ? `Test ${connection.name}`
                          : 'Enable this connection before testing it'
                      }
                      onClick={() => void handleTest(connection)}
                    >
                      {action.kind === 'busy' &&
                      action.action === 'test' &&
                      action.target === connection.id
                        ? 'Testing…'
                        : 'Test'}
                    </button>
                    {connection.source === 'server' ? (
                      <span style={{ color: '#737373', fontSize: 13 }}>Read-only</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => {
                            setForm({
                              kind: 'edit',
                              connectionId: connection.id,
                              fields: fieldsForConnection(connection),
                            })
                            setAction({ kind: 'idle' })
                          }}
                        >
                          Edit
                        </button>
                        {confirmDeleteId === connection.id ? (
                          <>
                            <span style={{ fontSize: 13 }}>Delete this connection?</span>
                            <button
                              type="button"
                              style={{ ...buttonStyle, color: '#b42318' }}
                              onClick={() => void handleDelete(connection)}
                            >
                              Confirm delete
                            </button>
                            <button
                              type="button"
                              style={buttonStyle}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            style={{ ...buttonStyle, color: '#b42318' }}
                            onClick={() => setConfirmDeleteId(connection.id)}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {form.kind !== 'closed' && (
            <ProviderConnectionForm
              form={form}
              saving={action.kind === 'busy' && action.action === 'save'}
              updateFields={updateFields}
              onSubmit={handleSubmit}
              onClose={() => {
                setForm({ kind: 'closed' })
                setAction({ kind: 'idle' })
              }}
            />
          )}

          <section aria-labelledby="models-heading" style={sectionStyle}>
            <h2 id="models-heading" style={{ fontSize: 20, color: '#272727' }}>
              Available models
            </h2>
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {page.snapshot.models.map((model) => (
                <article
                  key={modelTargetValue({
                    connectionId: model.connectionId,
                    modelId: model.id,
                  })}
                >
                  <strong style={{ color: '#272727' }}>{model.displayName}</strong>
                  <div style={{ color: '#737373', fontSize: 13 }}>
                    {model.connectionName} · {model.providerModelId} · {model.tasks.join(', ')}
                  </div>
                  <div style={{ color: '#737373', fontSize: 13 }}>{capabilityText(model)}</div>
                </article>
              ))}
              {page.snapshot.models.length === 0 && (
                <p style={{ color: '#737373' }}>No models are available.</p>
              )}
            </div>
          </section>

          <section aria-labelledby="preferences-heading" style={sectionStyle}>
            <h2 id="preferences-heading" style={{ fontSize: 20, color: '#272727' }}>
              Model preferences
            </h2>
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              {taskRows.map((row) => {
                const eligibleModels = page.snapshot.models.filter(
                  (model) =>
                    model.tasks.includes(row.task) &&
                    page.snapshot.connections.some(
                      (connection) => connection.id === model.connectionId && connection.enabled,
                    ),
                )
                const preference = page.snapshot.preferences[row.task]
                return (
                  <label key={row.label}>
                    <span style={{ display: 'block', marginBottom: 5 }}>{row.label}</span>
                    {row.detail && (
                      <span
                        id={`${row.task}-coupling-note`}
                        style={{
                          display: 'block',
                          color: '#737373',
                          fontSize: 13,
                          marginBottom: 6,
                        }}
                      >
                        {row.detail}
                      </span>
                    )}
                    <select
                      aria-label={`${row.label} model`}
                      aria-describedby={row.detail ? `${row.task}-coupling-note` : undefined}
                      style={inputStyle}
                      value={preference ? modelTargetValue(preference) : ''}
                      disabled={eligibleModels.length === 0 || action.kind === 'busy'}
                      onChange={(event) => void handlePreference(row.task, event.target.value)}
                    >
                      <option value="">Select a model</option>
                      {eligibleModels.map((model) => (
                        <option
                          key={modelTargetValue({
                            connectionId: model.connectionId,
                            modelId: model.id,
                          })}
                          value={modelTargetValue({
                            connectionId: model.connectionId,
                            modelId: model.id,
                          })}
                        >
                          {model.connectionName} · {model.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
