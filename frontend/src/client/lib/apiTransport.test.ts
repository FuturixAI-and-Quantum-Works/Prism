import { describe, expect, it } from 'vitest'
import { apiBaseUrl, apiUrl, resolveApiBaseUrl } from './apiTransport'

describe('API transport', () => {
  it('defaults direct local requests to the backend port', () => {
    expect(apiBaseUrl).toBe('http://localhost:3001')
    expect(apiUrl('/health')).toBe('http://localhost:3001/health')
  })

  it('preserves configured absolute URLs and Vite proxy paths', () => {
    expect(resolveApiBaseUrl('https://api.example.test/')).toBe('https://api.example.test')
    expect(resolveApiBaseUrl('/api/')).toBe('/api')
  })
})
