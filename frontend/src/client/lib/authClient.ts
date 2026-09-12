import { emailOTPClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { apiUrl } from './apiTransport'

export const authClient = createAuthClient({
  baseURL: apiUrl('/auth'),
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [emailOTPClient()],
})
