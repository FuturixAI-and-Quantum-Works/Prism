const getReasoningLabel = (content: string): string => {
  const matches = [...content.matchAll(/\*\*(.*?)\*\*/g)]

  return matches.length ? matches[matches.length - 1][1].trim() : 'Reasoning'
}

interface ReasoningArtifactProps {
  reasoning: string
  isStreaming: boolean
}

export function ReasoningArtifact({ reasoning, isStreaming }: ReasoningArtifactProps) {
  const reasoningLabel = getReasoningLabel(reasoning)

  return (
    <span
      className={isStreaming ? 'reasoning-shimmer' : ''}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={isStreaming}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: '#888787',
      }}
    >
      <span className={isStreaming ? 'shimmer-text' : ''}>
        {isStreaming ? reasoningLabel : 'Ready'}
      </span>
      {isStreaming && (
        <span style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: '#888787',
                animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </span>
      )}
    </span>
  )
}
