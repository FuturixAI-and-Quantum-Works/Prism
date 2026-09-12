import type { AttachedFile } from '../composer/ChatInputConfig'
import type {
  ChatDocumentArtifact,
  ChatSourceResultArtifact,
  ChatToolCallArtifact,
} from '../stream/artifactTypes'
import type { LocalChatMessage } from '../../../hooks/chatMessageModel'

export type ConversationTab = 'new' | 'history' | 'templates'

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  title?: string
  showActions?: boolean
  isStreaming?: boolean
  isStopped?: boolean
  followUps?: string[]
  reasoning?: string
  tools?: ChatToolCallArtifact[]
  sources?: ChatSourceResultArtifact[]
  documents?: ChatDocumentArtifact[]
  files?: AttachedFile[]
}

export interface ActionVisibility {
  showExportAndEditor: boolean
  showCopyShareDownload: boolean
  showFollowUps: boolean
  showSources: boolean
}

export const welcomeMessages = [
  "I'm here to help you with documents, contracts, and legal questions.",
  'Ask me anything about your documents or let me help you draft something new.',
  'Ready to assist with document analysis, drafting, or any questions you have.',
  "Let's work together on your legal documents and contracts.",
]

export function toConversationMessages(
  messages: LocalChatMessage[],
  stoppedMessageIds: Record<string, true>,
): ConversationMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    showActions: !message.isStreaming,
    isStreaming: message.isStreaming,
    isStopped: message.role === 'assistant' && !!stoppedMessageIds[message.id],
    reasoning: message.reasoning,
    tools: message.tools,
    sources: message.sources,
    documents: message.documents,
    files: message.files,
  }))
}

export function filterToolCallContent(content: string): string {
  if (!content) return content

  const patterns = [
    /^(?:📄|📝|🔍|✏️|🔧|⚙️|💾|📊|📈)\s*\w+.*?(started|running|complete|finished).*?[−–-]\s*\{[^}]*\}\s*$/gmu,
    /^\s*\{\s*"(doc_id|tool|action|status)":\s*"[^"]*"[^}]*\}\s*$/gm,
    /^\s*\[Tool:\s*\w+\].*$/gm,
    /^\s*Tool call:.*$/gm,
    /^(Reading|Searching|Analyzing|Processing)\s+document.*\{.*\}\s*$/gm,
  ]

  let filtered = content
  for (const pattern of patterns) {
    filtered = filtered.replace(pattern, '')
  }

  return filtered.replace(/\n{3,}/g, '\n\n').trim()
}

export function generateFollowUps(aiResponse: string, userMessage: string): string[] {
  const lowerResponse = aiResponse.toLowerCase()
  const lowerUserMessage = userMessage.toLowerCase()
  const followUps: string[] = []

  if (
    lowerResponse.includes('risk') ||
    lowerResponse.includes('clause') ||
    lowerResponse.includes('liability')
  ) {
    followUps.push('How can I mitigate these risks?')
    followUps.push('Suggest alternative language for risky clauses')
    followUps.push('Compare with industry standard clauses')
  }

  if (
    lowerUserMessage.includes('summar') ||
    lowerResponse.includes('key points') ||
    lowerResponse.includes('summary')
  ) {
    followUps.push('Explain any complex terms used')
    followUps.push('What are the action items from this?')
    followUps.push('Highlight any deadlines or important dates')
  }

  if (
    lowerResponse.includes('compliance') ||
    lowerResponse.includes('regulation') ||
    lowerResponse.includes('legal')
  ) {
    followUps.push('What are the compliance requirements?')
    followUps.push('Are there any regulatory concerns?')
    followUps.push('How do I ensure full compliance?')
  }

  if (
    lowerResponse.includes('contract') ||
    lowerResponse.includes('agreement') ||
    lowerResponse.includes('terms')
  ) {
    followUps.push('What terms should I negotiate?')
    followUps.push('Are there any missing clauses?')
    followUps.push('Explain the termination conditions')
  }

  if (
    lowerUserMessage.includes('compare') ||
    lowerResponse.includes('difference') ||
    lowerResponse.includes('comparison')
  ) {
    followUps.push('Which version is more favorable?')
    followUps.push('Highlight the key differences')
    followUps.push('Recommend which changes to accept')
  }

  if (
    lowerResponse.includes('payment') ||
    lowerResponse.includes('fee') ||
    lowerResponse.includes('cost') ||
    lowerResponse.includes('price')
  ) {
    followUps.push('Clarify the payment terms')
    followUps.push('Are these fees negotiable?')
    followUps.push('What are the penalty clauses?')
  }

  if (
    lowerResponse.includes('confidential') ||
    lowerResponse.includes('nda') ||
    lowerResponse.includes('non-disclosure')
  ) {
    followUps.push('What information is covered?')
    followUps.push('How long does confidentiality last?')
    followUps.push('What are the exceptions?')
  }

  if (followUps.length === 0) {
    followUps.push('Tell me more about this')
    followUps.push('What should I do next?')
    followUps.push('Are there any concerns I should know about?')
    followUps.push('Can you explain this in simpler terms?')
  }

  return [...new Set(followUps)].slice(0, 4)
}

export function getActionVisibility(userMessage: string, aiResponse: string): ActionVisibility {
  const lowerMessage = userMessage.toLowerCase()
  const lowerResponse = aiResponse.toLowerCase()

  const showExportAndEditor =
    lowerMessage.includes('generate') ||
    lowerMessage.includes('create') ||
    lowerMessage.includes('draft') ||
    lowerMessage.includes('write') ||
    lowerMessage.includes('make me') ||
    lowerMessage.includes('prepare') ||
    lowerMessage.includes('compose') ||
    lowerResponse.includes('here is the') ||
    lowerResponse.includes('i have drafted') ||
    lowerResponse.includes('i have created') ||
    lowerResponse.includes("here's a draft")

  const showCopyShareDownload =
    lowerMessage.includes('generate') ||
    lowerMessage.includes('create') ||
    lowerMessage.includes('draft') ||
    lowerMessage.includes('write') ||
    lowerMessage.includes('summarize') ||
    lowerMessage.includes('summary') ||
    lowerMessage.includes('list') ||
    lowerMessage.includes('extract') ||
    lowerMessage.includes('compile') ||
    aiResponse.length > 500

  const showSources =
    lowerResponse.includes('according to') ||
    lowerResponse.includes('based on') ||
    lowerResponse.includes('the document') ||
    lowerResponse.includes('in the contract') ||
    lowerResponse.includes('as stated') ||
    lowerResponse.includes('section') ||
    lowerResponse.includes('clause')

  const showFollowUps =
    lowerMessage.includes('analyze') ||
    lowerMessage.includes('review') ||
    lowerMessage.includes('check') ||
    lowerMessage.includes('explain') ||
    lowerMessage.includes('what') ||
    lowerMessage.includes('how') ||
    lowerMessage.includes('why') ||
    lowerMessage.includes('summarize') ||
    lowerMessage.includes('compare') ||
    lowerMessage.includes('risk') ||
    lowerMessage.includes('compliance') ||
    lowerMessage.includes('?')

  return {
    showExportAndEditor,
    showCopyShareDownload,
    showFollowUps,
    showSources,
  }
}

export function isImageAttachment(file: Pick<AttachedFile, 'name' | 'type'>): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  return (
    file.type.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)
  )
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function getWelcomeMessage(now = Date.now()): string {
  return welcomeMessages[Math.floor(now / 60000) % welcomeMessages.length]
}
