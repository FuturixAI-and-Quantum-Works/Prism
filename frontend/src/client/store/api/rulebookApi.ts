import { baseApi } from './baseApi'

export type RulebookColumnFormat =
  'text' | 'bulleted_list' | 'number' | 'currency' | 'yes_no' | 'date' | 'tag' | 'percentage'

export type RulebookSeverity = 'info' | 'warning' | 'error'

export interface RulebookFaq {
  id: string
  question: string
  column_name: string
  prompt: string
  format: RulebookColumnFormat
  category: string
  severity: RulebookSeverity
  rationale?: string
  tags?: string[]
}

export interface RulebookColumn {
  id: string
  index: number
  name: string
  prompt: string
  format: RulebookColumnFormat
  tags?: string[]
  width: number
  question: string
  category: string
  severity: RulebookSeverity
  rationale?: string
}

export interface GenerateRulebookRequest {
  document_type: string
  sample_document_id?: string | null
  extra_requirements?: string | null
  count?: number
}

export interface GenerateRulebookResponse {
  title: string
  document_type: string
  sample_document: {
    id: string
    filename: string
  } | null
  faqs: RulebookFaq[]
  columns_config: RulebookColumn[]
  source: 'llm'
}

export const rulebookApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateRulebook: builder.mutation<GenerateRulebookResponse, GenerateRulebookRequest>({
      query: (body) => ({
        url: '/rulebook/generate',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Rulebook', id: 'LIST' }],
    }),
  }),
})

export const { useGenerateRulebookMutation } = rulebookApi
