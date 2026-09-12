const localApiBaseUrl = 'http://localhost:3001'

export function resolveApiBaseUrl(configuredUrl?: string) {
  return (configuredUrl || localApiBaseUrl).replace(/\/+$/, '')
}

export const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
export const sessionLostEvent = 'prism:session-lost'
export const durableRunStoragePrefix = 'prism_durable_run:'

export function apiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function notifySessionLost() {
  window.dispatchEvent(new Event(sessionLostEvent))
}

export function clearDurableRunStates() {
  try {
    const storage = window.localStorage
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    for (const key of keys) {
      if (key?.startsWith(durableRunStoragePrefix)) storage.removeItem(key)
    }
  } catch {
    return
  }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await fetch(input, { ...init, credentials: 'include' })
  if (response.status === 401) notifySessionLost()
  return response
}
