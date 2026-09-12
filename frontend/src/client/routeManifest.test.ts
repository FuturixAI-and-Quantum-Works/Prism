import ts from 'typescript'
import { matchPath } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routeDefinitions } from './routeManifest'

const frontendSources = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) satisfies Record<string, string>

const backendSources = import.meta.glob('../../../backend/src/**/*.ts', {
  eager: true,
  import: 'default',
  query: '?raw',
}) satisfies Record<string, string>

type Target = Readonly<{ filePath: string; line: number; path: string }>

function renderedPath(node: ts.Expression, allowDynamicPrefix = false): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (!ts.isTemplateExpression(node)) return null
  const path = [
    node.head.text,
    ...node.templateSpans.flatMap((span) => ['generated', span.literal.text]),
  ].join('')
  return allowDynamicPrefix &&
    node.head.text === '' &&
    node.templateSpans[0]?.literal.text.startsWith('/')
    ? path.slice('generated'.length)
    : path
}

function navigationTargets(filePath: string, source: string): Target[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const targets: Target[] = []

  function belongsToTransport(expression: ts.Expression) {
    let current: ts.Node | undefined = expression
    for (let depth = 0; current && depth < 4; depth += 1, current = current.parent) {
      if (!ts.isCallExpression(current)) continue
      if (ts.isIdentifier(current.expression)) {
        return current.expression.text === 'fetch' || current.expression.text === 'apiUrl'
      }
    }
    return false
  }

  function add(expression: ts.Expression) {
    const dynamicOrigin =
      ts.isTemplateExpression(expression) &&
      expression.templateSpans[0]?.expression.getText(sourceFile) === 'window.location.origin'
    const path = renderedPath(expression, dynamicOrigin)
    if (
      !path?.startsWith('/') ||
      belongsToTransport(expression) ||
      /\.(?:gif|ico|jpe?g|png|svg|webp)$/.test(path)
    )
      return
    targets.push({
      filePath,
      line: ts.getLineAndCharacterOfPosition(sourceFile, expression.getStart(sourceFile)).line + 1,
      path: path.split(/[?#]/, 1)[0],
    })
  }

  function visit(node: ts.Node) {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node)
    )
      add(node)
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return targets
}

function backendNavigationTargets(filePath: string, source: string): Target[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const targets: Target[] = []

  function propertyName(node: ts.PropertyName): string | null {
    return ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : null
  }

  function add(expression: ts.Expression) {
    if (
      ts.isStringLiteral(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression) ||
      ts.isTemplateExpression(expression)
    ) {
      const path = renderedPath(expression, true)
      if (path?.startsWith('/')) {
        targets.push({
          filePath,
          line:
            ts.getLineAndCharacterOfPosition(sourceFile, expression.getStart(sourceFile)).line + 1,
          path: path.split(/[?#]/, 1)[0],
        })
      }
      return
    }
    ts.forEachChild(expression, (child) => {
      if (ts.isExpression(child)) add(child)
    })
  }

  function visit(node: ts.Node) {
    if (ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name)
      const isToolPath = name === 'path' && filePath.includes('/modules/ai/tools/')
      if (name === 'link' || name === 'actionUrl' || isToolPath) add(node.initializer)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return targets
}

describe('route graph', () => {
  it('maps every generated navigation target to a declared route', () => {
    const declaredRoutes = routeDefinitions
      .filter(({ path }) => path !== '*')
      .map(({ path }) => path)
    const frontendTargets = Object.entries(frontendSources).flatMap(([filePath, source]) => {
      const routeLinked =
        filePath === './App.tsx' ||
        filePath === './appRoutes.ts' ||
        filePath.includes('/components/') ||
        filePath.includes('/features/')
      const transportSource =
        filePath.includes('/store/api/') ||
        (filePath.includes('/features/') &&
          (filePath.includes('/api/') || /Api\.tsx?$/.test(filePath)))
      return routeLinked && !transportSource && !filePath.includes('.test.')
        ? navigationTargets(filePath, source)
        : []
    })
    const backendTargets = Object.entries(backendSources).flatMap(([filePath, source]) =>
      backendNavigationTargets(filePath, source),
    )
    const targets = [...frontendTargets, ...backendTargets]
    const unmatched = targets.filter(
      (target) =>
        !declaredRoutes.some((path) => matchPath({ path, end: true }, target.path) !== null),
    )

    expect(unmatched.map(({ filePath, line, path }) => `${filePath}:${line} -> ${path}`)).toEqual(
      [],
    )
  })

  it('keeps canonical project and document routes without legacy aliases', () => {
    const paths = routeDefinitions.map(({ path }) => path)
    expect(paths).not.toContain('/project/:uuid')
    expect(paths).not.toContain('/document/:uuid')
    expect(paths).not.toContain('/create-document')
    expect(paths).not.toContain('/projects')
    expect(paths).toContain('/projects/:projectId')
    expect(paths).toContain('/workspaces')
    expect(paths).toContain('/workspaces/:workspaceId')
    expect(paths).toContain('/documents/:documentId')
    expect(paths).toContain('/compliance/reviews/:reviewId')
  })

  it('keeps status behind the authenticated route boundary', () => {
    expect(routeDefinitions.find(({ path }) => path === '/status')?.access).toBe('protected')
  })

  it('scans feature navigation and backend-generated links', () => {
    expect(Object.keys(frontendSources).some((path) => path.includes('/features/dashboard/'))).toBe(
      true,
    )
    expect(Object.keys(backendSources).some((path) => path.endsWith('/lib/notifications.ts'))).toBe(
      true,
    )
  })

  it.each([
    './components/CreateProjectModal.tsx',
    './components/ConversationScreen.tsx',
    './components/ProjectPage.tsx',
    './components/ProjectsPanel.tsx',
    './components/TextSelectionPopup.tsx',
    './components/pages/index.tsx',
    './features/projects/ProjectFeature.tsx',
  ])('does not retain orphaned entrypoint %s', (path) => {
    expect(frontendSources[path]).toBeUndefined()
  })
})
