import { afterEach, describe, expect, it, vi } from 'vitest'
import ts from 'typescript'
import { apiUrl } from '../../lib/apiTransport'
import { requestDocumentExport } from './useDocumentExport'
import {
  getDocumentStatusConfig,
  getWorkspaceActivePage,
  getWorkspaceBreadcrumbs,
} from './workspaceViewModel'

const editorSources = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) satisfies Record<string, string>

afterEach(() => {
  vi.restoreAllMocks()
})

describe('document editor workspace view model', () => {
  it('derives lifecycle and revision status without UI state', () => {
    expect(getDocumentStatusConfig('DRAFT', 'ready', false)).toEqual({
      label: 'Draft',
      color: '#8A5A00',
      bg: '#FFF8E5',
    })
    expect(getDocumentStatusConfig('DRAFT', 'ready', true)).toEqual({
      label: 'Revision required',
      color: '#C83A2D',
      bg: '#FFF7F6',
    })
    expect(getDocumentStatusConfig('FINALIZED', 'processing', false).label).toBe('Done')
    expect(getDocumentStatusConfig(null, 'error', false).label).toBe('Error')
  })

  it('builds canonical workspace navigation breadcrumbs', () => {
    expect(
      getWorkspaceBreadcrumbs(
        {
          from: 'workspaces',
          workspaceId: 'workspace-1',
          workspaceName: 'Legal',
        },
        'Agreement.docx',
      ),
    ).toEqual([
      { label: 'Home', icon: 'home', path: '/' },
      { label: 'Workspaces', icon: 'projects', path: '/workspaces' },
      {
        label: 'Legal',
        icon: null,
        path: '/workspaces/workspace-1',
      },
      { label: 'Agreement.docx', icon: null },
    ])

    const workspaceState = { from: 'workspaces', workspaceId: 'workspace-1' }
    expect(getWorkspaceActivePage(workspaceState)).toBe('workspaces')
    expect(getWorkspaceBreadcrumbs(workspaceState, 'Agreement.docx')[1]).toEqual({
      label: 'Workspaces',
      icon: 'projects',
      path: '/workspaces',
    })
  })

  it('does not import route entry modules into the editor graph', () => {
    const routeImports = Object.entries(editorSources).flatMap(([path, source]) => {
      const file = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      )
      return file.statements.flatMap((statement) => {
        if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) return []
        if (!ts.isStringLiteral(statement.moduleSpecifier)) return []
        return statement.moduleSpecifier.text.includes('/components/pages/')
          ? [`${path} -> ${statement.moduleSpecifier.text}`]
          : []
      })
    })

    expect(routeImports).toEqual([])
  })
})

describe('document export transport', () => {
  it('uses the canonical URL and credentialed API transport', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response())

    await requestDocumentExport('document-1', '<p>Agreement</p>', 'pdf')

    expect(fetchMock).toHaveBeenCalledWith(apiUrl('/documents/document-1/export'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: '<p>Agreement</p>', format: 'pdf' }),
    })
  })
})
