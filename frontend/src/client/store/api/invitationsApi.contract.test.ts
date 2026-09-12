import { configureStore } from '@reduxjs/toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { baseApi } from './baseApi'
import { invitationsApi } from './invitationsApi'

describe('invitation API request contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('routes token and internal-id acceptance through one typed endpoint', async () => {
    const requests: Request[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init)
        requests.push(request.clone())
        return new Response(
          JSON.stringify({
            ok: true,
            resource_type: 'project',
            resource_id: 'project-1',
            resource_name: 'Apollo',
            role: 'editor',
            status: 'accepted',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )
    const store = configureStore({
      reducer: { [baseApi.reducerPath]: baseApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    })

    await store.dispatch(
      invitationsApi.endpoints.acceptInvitation.initiate({
        kind: 'token',
        token: 'share-token',
      }),
    )
    await store.dispatch(
      invitationsApi.endpoints.acceptInvitation.initiate({
        kind: 'id',
        invitationId: 'invitation-1',
      }),
    )

    expect(requests.map((request) => [request.method, new URL(request.url).pathname])).toEqual([
      ['POST', '/invitations/share-token/accept'],
      ['POST', '/invitations/by-id/invitation-1/accept'],
    ])
  })
})
