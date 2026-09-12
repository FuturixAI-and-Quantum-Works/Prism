export function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const data = Reflect.get(error, 'data')
    if (data && typeof data === 'object') {
      const detail = Reflect.get(data, 'detail')
      if (typeof detail === 'string' && detail) return detail
      const message = Reflect.get(data, 'message')
      if (typeof message === 'string' && message) return message
    }
    const message = Reflect.get(error, 'message')
    if (typeof message === 'string' && message) return message
  }
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}
