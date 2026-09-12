import { describe, expect, it } from 'vitest'

type DirectoryEntry = Readonly<{
  isDirectory: () => boolean
  name: string
}>

function fileSystem() {
  const runtime = globalThis as typeof globalThis & {
    process: {
      cwd: () => string
      getBuiltinModule: (name: 'fs') => {
        existsSync: (path: string) => boolean
        readFileSync: (path: string, encoding: 'utf8') => string
        readdirSync: (path: string, options: { withFileTypes: true }) => DirectoryEntry[]
      }
    }
  }
  return runtime.process.getBuiltinModule('fs')
}

function readDesignSystem() {
  const runtime = globalThis as typeof globalThis & {
    process: { cwd: () => string }
  }
  return fileSystem().readFileSync(`${runtime.process.cwd()}/frontend/DESIGN_SYSTEM.md`, 'utf8')
}

describe('frontend design system documentation', () => {
  it('lists every current feature folder', () => {
    const runtime = globalThis as typeof globalThis & {
      process: { cwd: () => string }
    }
    const documentedFeatures = [
      ...readDesignSystem().matchAll(/\[`[^`]+`\]\(src\/client\/features\/([^/]+)\/\)/g),
    ].map((match) => match[1])
    const sourceFeatures = fileSystem()
      .readdirSync(`${runtime.process.cwd()}/frontend/src/client/features`, {
        withFileTypes: true,
      })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    expect(documentedFeatures.sort()).toEqual(sourceFeatures.sort())
  })

  it('keeps every local documentation link resolvable', () => {
    const runtime = globalThis as typeof globalThis & {
      process: { cwd: () => string }
    }
    const targets = [...readDesignSystem().matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1])
    const missing = targets.filter(
      (target) =>
        !fileSystem().existsSync(`${runtime.process.cwd()}/frontend/${target.split('#', 1)[0]}`),
    )

    expect(targets.length).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })

  it('names the current route, CSS, accessibility, and sanitization sources', () => {
    const documentation = readDesignSystem()

    expect(documentation).toContain('[`src/client/routeManifest.ts`](src/client/routeManifest.ts)')
    expect(documentation).toContain('[`src/client/index.css`](src/client/index.css)')
    expect(documentation).toContain(
      '[`src/client/components/ui/AccessibleDialog.tsx`](src/client/components/ui/AccessibleDialog.tsx)',
    )
    expect(documentation).toContain(
      '[`src/client/lib/sanitizeHtml.ts`](src/client/lib/sanitizeHtml.ts)',
    )
    expect(documentation).not.toContain('components/pages/index.tsx')
    expect(documentation).not.toContain('Routes are defined in `App.tsx`')
    expect(documentation).not.toContain('All styling is done via inline styles')
  })
})
