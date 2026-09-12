import ReactMarkdown from 'react-markdown'

const components = {
  h1: ({ children }: React.PropsWithChildren) => (
    <h1 style={{ fontSize: '18px', fontWeight: 600, margin: '16px 0 8px', color: '#272727' }}>
      {children}
    </h1>
  ),
  h2: ({ children }: React.PropsWithChildren) => (
    <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '14px 0 6px', color: '#272727' }}>
      {children}
    </h2>
  ),
  h3: ({ children }: React.PropsWithChildren) => (
    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '12px 0 6px', color: '#272727' }}>
      {children}
    </h3>
  ),
  h4: ({ children }: React.PropsWithChildren) => (
    <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '10px 0 4px', color: '#272727' }}>
      {children}
    </h4>
  ),
  p: ({ children }: React.PropsWithChildren) => (
    <p style={{ margin: '0 0 10px', lineHeight: '1.6' }}>{children}</p>
  ),
  ul: ({ children }: React.PropsWithChildren) => (
    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ul>
  ),
  ol: ({ children }: React.PropsWithChildren) => (
    <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ol>
  ),
  li: ({ children }: React.PropsWithChildren) => (
    <li style={{ marginBottom: '4px' }}>{children}</li>
  ),
  strong: ({ children }: React.PropsWithChildren) => (
    <strong style={{ fontWeight: 600 }}>{children}</strong>
  ),
  em: ({ children }: React.PropsWithChildren) => (
    <em style={{ fontStyle: 'italic' }}>{children}</em>
  ),
  code: ({ children }: React.PropsWithChildren) => (
    <code
      style={{
        backgroundColor: '#E8E8E8',
        padding: '2px 5px',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'monospace',
      }}
    >
      {children}
    </code>
  ),
  blockquote: ({ children }: React.PropsWithChildren) => (
    <blockquote
      style={{
        borderLeft: '3px solid #D0D0D0',
        paddingLeft: '12px',
        margin: '8px 0',
        color: '#666',
      }}
    >
      {children}
    </blockquote>
  ),
}

export function ChatMarkdown({ children }: { children: string }) {
  return (
    <div
      className="ai-message-content"
      style={{
        fontSize: '14px',
        fontWeight: 400,
        lineHeight: '1.6',
        letterSpacing: '-0.28px',
      }}
    >
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  )
}
