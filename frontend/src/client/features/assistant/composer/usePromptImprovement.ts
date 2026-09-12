import { useCallback, useState } from 'react'
import { streamChat } from '../../../store/api/chatApi'
import { PROMPT_IMPROVEMENT_FAILURE_MESSAGE, type PromptImprovementResult } from './ChatInputConfig'

const improvementRequest = (
  text: string,
) => `You are a writing assistant. Your task is to improve the following text by:
1. Fixing any spelling mistakes
2. Fixing grammatical errors
3. Making it clearer and more professional
4. Keeping the original meaning and intent

IMPORTANT: Return ONLY the improved text, nothing else. No explanations, no quotes, no prefixes like "Here's the improved text:". Just the corrected text itself.

Text to improve:
${text}`

const failedImprovement = (): PromptImprovementResult => ({
  kind: 'failed',
  message: PROMPT_IMPROVEMENT_FAILURE_MESSAGE,
})

export function usePromptImprovement() {
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false)

  const improvePrompt = useCallback(async (text: string): Promise<PromptImprovementResult> => {
    setIsImprovingPrompt(true)
    try {
      let improvedText = ''
      const outcome = await streamChat({
        messages: [{ role: 'user', content: improvementRequest(text) }],
        historyMode: 'discard',
        onEvent: (event) => {
          if (event.type === 'text_delta' || event.type === 'content_delta') {
            improvedText += event.text
          }
        },
      })
      if (outcome.kind !== 'success') return failedImprovement()

      const cleaned = improvedText
        .trim()
        .replace(/^["']|["']$/g, '')
        .trim()
      return cleaned ? { kind: 'improved', text: cleaned } : failedImprovement()
    } catch {
      return failedImprovement()
    } finally {
      setIsImprovingPrompt(false)
    }
  }, [])

  return { improvePrompt, isImprovingPrompt }
}
