import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BackgroundChatIndicator from './BackgroundChatIndicator'
import PendingProcessesIndicator from './PendingProcessesIndicator'

const mocks = vi.hoisted(() => {
  const state: {
    dispatch: ReturnType<typeof vi.fn>
    selectorResult: unknown
  } = {
    dispatch: vi.fn(),
    selectorResult: undefined,
  }
  return state
})

vi.mock('../store/hooks', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: () => mocks.selectorResult,
}))

function readGlobalCss() {
  const runtime = globalThis as typeof globalThis & {
    process: {
      cwd: () => string
      getBuiltinModule: (name: 'fs') => {
        readFileSync: (path: string, encoding: 'utf8') => string
      }
    }
  }
  return runtime.process
    .getBuiltinModule('fs')
    .readFileSync(`${runtime.process.cwd()}/frontend/src/client/index.css`, 'utf8')
}

describe('background process accessibility', () => {
  beforeEach(() => {
    mocks.dispatch.mockReset()
  })

  it('keeps background chat controls outside its text-only live region', () => {
    mocks.selectorResult = {
      isActive: true,
      isStreaming: true,
      isComplete: false,
      workspaceId: 'workspace-1',
      lastUserMessage: 'Review this agreement',
      notificationDismissed: false,
    }

    render(
      <MemoryRouter>
        <BackgroundChatIndicator />
      </MemoryRouter>,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('AI is responding')
    expect(status.querySelector('button')).toBeNull()
    expect(screen.getByRole('button', { name: 'Dismiss background chat' })).toBeInTheDocument()
  })

  it('keeps pending-process controls outside its text-only live region', () => {
    mocks.selectorResult = [
      {
        id: 'process-1',
        type: 'analysis',
        status: 'running',
        title: 'Contract analysis',
      },
    ]

    render(
      <MemoryRouter>
        <PendingProcessesIndicator />
      </MemoryRouter>,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Contract analysis: Running...')
    expect(status.querySelector('button')).toBeNull()
    expect(screen.getByRole('button', { name: 'Dismiss Contract analysis' })).toBeInTheDocument()
  })

  it('namespaces global keyframes and disables decorative motion for reduced-motion users', () => {
    const css = readGlobalCss()
    const keyframeNames = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1])

    expect(keyframeNames).toEqual([...new Set(keyframeNames)])
    expect(keyframeNames.every((name) => name.startsWith('prism-'))).toBe(true)
    expect(css).toContain('@keyframes prism-background-chat-slide-in')
    expect(css).toContain('@keyframes prism-pending-process-slide-in')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
    expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
    expect(css).toMatch(
      /\.prism-pending-process-spinner\s*\{[\s\S]*?animation:\s*none\s*!important/,
    )
  })

  it('keeps global scrollbars visible and styled', () => {
    const css = readGlobalCss()

    expect(css).not.toMatch(/scrollbar-width:\s*none/)
    expect(css).not.toMatch(/::-webkit-scrollbar\s*\{[^}]*(?:width|height):\s*0(?:px)?/)
    expect(css).toMatch(/::-webkit-scrollbar\s*\{[^}]*width:\s*10px[^}]*height:\s*10px/)
    expect(css).toMatch(/scrollbar-color:\s*#737373 transparent/)
  })
})
