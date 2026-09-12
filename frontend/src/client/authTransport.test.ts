import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const sources = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) satisfies Record<string, string>

const canonicalTransportModules = new Set([
  './lib/apiTransport.ts',
  './lib/sseTransport.ts',
  './store/api/baseApi.ts',
])
const browserTransportPrimitives = new Set(['fetch', 'XMLHttpRequest', 'EventSource'])

interface TransportViolation {
  filePath: string
  line: number
  primitive: string
}

function parseSource(filePath: string, source: string) {
  return ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
}

function directFetchCalls(filePath: string, source: string) {
  const sourceFile = parseSource(filePath, source)
  const calls: ts.CallExpression[] = []
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'fetch'
    ) {
      calls.push(node)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return calls
}

function browserTransportViolations(filePath: string, source: string): TransportViolation[] {
  if (canonicalTransportModules.has(filePath)) return []

  const sourceFile = parseSource(filePath, source)
  const violations = new Map<string, TransportViolation>()
  const record = (node: ts.Node, primitive: string) => {
    const line = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile)).line + 1
    violations.set(`${primitive}:${node.getStart(sourceFile)}`, { filePath, line, primitive })
  }
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && browserTransportPrimitives.has(node.text)) {
      record(node, node.text)
    } else if (
      ts.isStringLiteral(node) &&
      browserTransportPrimitives.has(node.text) &&
      ts.isElementAccessExpression(node.parent) &&
      node.parent.argumentExpression === node &&
      ts.isIdentifier(node.parent.expression) &&
      (node.parent.expression.text === 'window' || node.parent.expression.text === 'globalThis')
    ) {
      record(node, node.text)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return [...violations.values()]
}

function includesCookieCredentials(call: ts.CallExpression) {
  const options = call.arguments[1]
  if (!options || !ts.isObjectLiteralExpression(options)) return false
  return options.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      property.name.getText() === 'credentials' &&
      ts.isStringLiteral(property.initializer) &&
      property.initializer.text === 'include',
  )
}

describe('frontend authentication transport', () => {
  it('contains no legacy browser token paths', () => {
    const forbidden = [
      /\bAuthorization\b/,
      /\bBearer\b/,
      /\bprism_auth\b/,
      /\btempToken\b/,
      /\bsessionStorage\b/,
      /searchParams\.get\(['"]token['"]\)/,
      /[?&](?:token|authToken)=/,
    ]

    const violations: string[] = []
    for (const [filePath, source] of Object.entries(sources)) {
      if (filePath.includes('.test.')) continue
      for (const pattern of forbidden) {
        if (pattern.test(source)) violations.push(`${filePath}: ${pattern}`)
      }
    }

    expect(violations).toEqual([])
  })

  it('confines browser network primitives to canonical transport modules', () => {
    const violations = Object.entries(sources)
      .filter(([filePath]) => !/\.(?:test|spec)\.[jt]sx?$/.test(filePath))
      .flatMap(([filePath, source]) => browserTransportViolations(filePath, source))
      .map(({ filePath, line, primitive }) => `${filePath}:${line}: ${primitive}`)

    expect(violations).toEqual([])
  })

  it.each([
    { name: 'bare fetch', source: "fetch('/api')" },
    { name: 'window fetch', source: "window.fetch('/api')" },
    { name: 'global fetch', source: "globalThis.fetch('/api')" },
    { name: 'fetch alias', source: "const request = window.fetch; request('/api')" },
    {
      name: 'destructured fetch alias',
      source: "const { fetch: request } = globalThis; request('/api')",
    },
    { name: 'XMLHttpRequest', source: 'new XMLHttpRequest()' },
    {
      name: 'XMLHttpRequest alias',
      source: 'const Request = window.XMLHttpRequest; new Request()',
    },
    { name: 'EventSource', source: "new EventSource('/events')" },
    {
      name: 'EventSource alias',
      source: "const Events = globalThis.EventSource; new Events('/events')",
    },
  ])('detects $name outside canonical modules', ({ source }) => {
    expect(browserTransportViolations('./features/example.ts', source)).toHaveLength(1)
  })

  it('includes cookies in canonical fetch transports and RTK Query', () => {
    const apiTransportSource = sources['./lib/apiTransport.ts']
    const fetchCalls = directFetchCalls('./lib/apiTransport.ts', apiTransportSource)

    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls.every(includesCookieCredentials)).toBe(true)
    const baseApiSource = sources['./store/api/baseApi.ts']
    expect(baseApiSource).toContain("credentials: 'include'")
  })

  it('permits browser transport primitives in canonical modules', () => {
    expect(browserTransportViolations('./lib/apiTransport.ts', "window.fetch('/api')")).toEqual([])
  })
})
