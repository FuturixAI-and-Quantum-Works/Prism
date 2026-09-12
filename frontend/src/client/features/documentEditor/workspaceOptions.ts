import aiSparkIcon from '../../assets/document-editor/ai-spark.svg'
import aiCloudIcon from '../../assets/document-editor/ai-cloud.svg'
import searchIcon from '../../assets/document-editor/search-icon.svg'
import brainIcon from '../../assets/document-editor/brain.svg'
import messagesIcon from '../../assets/document-editor/messages.svg'
import workflowIcon from '../../assets/document-editor/workflow.svg'

export const placeholderTexts = [
  'Fill all placeholders in this document...',
  'Ask Prism to draft, edit, or review your document…',
  'Summarize key points from this document...',
  'Find clauses related to termination...',
  'Identify potential risks in this document...',
]

export const aiSuggestions = [
  { icon: aiSparkIcon, text: 'Fill all placeholders in this document' },
  { icon: aiSparkIcon, text: 'Draft a Non-Disclosure Agreement between two parties' },
  { icon: searchIcon, text: 'Detail the consequences of breach of the agreement.' },
  {
    icon: aiCloudIcon,
    text: 'Establish the governing law and dispute resolution process for the agreement.',
  },
]

const statusTabs = [
  { id: 'prism', label: 'Prism', icon: null, activeColor: '#454545' },
  { id: 'insights', label: 'Insights', icon: brainIcon, activeColor: '#F36A33' },
  { id: 'comments', label: 'Comments', icon: messagesIcon, activeColor: '#F36A33' },
  { id: 'audit', label: 'Audit Trails', icon: workflowIcon, activeColor: '#454545' },
]

export function getVisibleStatusTabs(visibleTabs: string[]) {
  const visible = new Set(visibleTabs)
  return statusTabs.filter((tab) => visible.has(tab.id))
}
