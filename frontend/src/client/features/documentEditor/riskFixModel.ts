import type { DocumentInsights, DocumentRisk } from '../documents/api/documentContentApi'

export interface RiskFixResult {
  editIds: string[]
  annotations: Array<{ kind: 'ins' | 'del'; text: string }>
}

export interface EditAnnotationPayload {
  edit_id?: string
  deleted_text?: string
  inserted_text?: string
}

export function createRiskFixPrompt(risk: DocumentRisk) {
  return `First read the entire document using read_document, then make ALL necessary edits in a SINGLE edit_document call to fix this risk:

**Risk:** ${risk.title}
**Description:** ${risk.description}${
    risk.recommendation
      ? `
**Recommendation:** ${risk.recommendation}`
      : ''
  }${
    risk.location
      ? `
**Relevant text:** "${risk.location}"`
      : ''
  }

Instructions:
1. Read the full document first
2. Identify all text that needs to be changed
3. Apply ALL edits in ONE edit_document call with multiple find/replace pairs
4. Do NOT explain or stream reasoning - just execute the edits silently`
}

export function collectRiskFixResult(annotations: EditAnnotationPayload[]): RiskFixResult {
  const editIds = [
    ...new Set(annotations.map((annotation) => annotation.edit_id).filter(Boolean)),
  ].filter((id): id is string => typeof id === 'string')
  const displayAnnotations: RiskFixResult['annotations'] = []

  for (const annotation of annotations) {
    if (annotation.deleted_text) {
      displayAnnotations.push({ kind: 'del', text: annotation.deleted_text })
    }
    if (annotation.inserted_text) {
      displayAnnotations.push({ kind: 'ins', text: annotation.inserted_text })
    }
  }

  return { editIds, annotations: displayAnnotations }
}

export function removeResolvedRisk(
  insights: DocumentInsights | null | undefined,
  riskTitle: string,
): DocumentInsights | null | undefined {
  if (!insights?.mainDocument) return insights
  return {
    ...insights,
    mainDocument: {
      ...insights.mainDocument,
      risks: insights.mainDocument.risks.filter((risk) => risk.title !== riskTitle),
    },
  }
}

export async function resolveRiskEdits({
  decision,
  documentId,
  editIds,
  acceptEdit,
  rejectEdit,
}: {
  decision: 'accept' | 'reject'
  documentId: string
  editIds: string[]
  acceptEdit: (input: { documentId: string; editId: string }) => Promise<unknown>
  rejectEdit: (input: { documentId: string; editId: string }) => Promise<unknown>
}) {
  const resolve = decision === 'accept' ? acceptEdit : rejectEdit
  for (const editId of editIds) {
    await resolve({ documentId, editId })
  }
}
