import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import type { SelectedComplianceDocument } from './complianceModels'
import { formatTimeAgo, resolveComplianceTarget } from './complianceModels'
import { complianceFontFamily, useCompliancePresentation } from './compliancePresentation'
import { ComplianceParametersPanel } from './ComplianceParametersPanel'
import { ComplianceResultsPanel } from './ComplianceResultsPanel'
import { ComplianceReviewDialogs } from './ComplianceReviewDialogs'
import { ComplianceReviewHeader } from './ComplianceReviewHeader'
import { DocumentSourcesPanel } from './DocumentSourcesPanel'
import { WorkspaceDocumentsPanel } from './WorkspaceDocumentsPanel'
import { useComplianceParameters } from './useComplianceParameters'
import { useComplianceResults } from './useComplianceResults'
import { useComplianceReviewData } from './useComplianceReviewData'
import { useComplianceRun } from './useComplianceRun'
import { useComplianceSources } from './useComplianceSources'

export interface ComplianceReviewFeatureProps {
  projectId?: string
  workspaceId?: string
  selectedDocuments?: SelectedComplianceDocument[]
  embedded?: boolean
  onClose?: () => void
  selectedRulebookId?: string | null
}

export function ComplianceReviewFeature(props: ComplianceReviewFeatureProps) {
  useCompliancePresentation()
  const routeParams = useParams<{ documentId: string; reviewId: string; workspaceId: string }>()
  const target = useMemo(
    () =>
      resolveComplianceTarget({
        documentId: routeParams.documentId,
        reviewId: routeParams.reviewId,
        workspaceId: props.workspaceId || routeParams.workspaceId,
      }),
    [props.workspaceId, routeParams.documentId, routeParams.reviewId, routeParams.workspaceId],
  )
  const data = useComplianceReviewData(target, props.selectedDocuments)
  const parameters = useComplianceParameters(
    data.reviewId,
    data.complianceData,
    props.selectedRulebookId,
  )
  const results = useComplianceResults(data.complianceData)
  const sources = useComplianceSources(data.scopeTarget, data.reviewId, data.complianceData)
  const run = useComplianceRun(
    data.scopeTarget,
    {
      id: data.reviewId,
      status: data.complianceData?.review.status,
      documentName: data.primaryDocument?.filename,
      workspaceName: data.workspace?.name,
      refetch: data.refetchCompliance,
    },
    { syncForRun: parameters.syncForRun },
    { applyRunEvent: results.applyRunEvent, reset: results.reset },
  )

  const documentName = data.primaryDocument?.filename || 'Document'
  const uploadTime = data.primaryDocument?.created_at
    ? formatTimeAgo(data.primaryDocument.created_at)
    : 'Uploaded recently'
  const embedded = props.embedded ?? false

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        fontFamily: complianceFontFamily,
      }}
    >
      <ComplianceReviewHeader
        embedded={embedded}
        canClose={Boolean(props.onClose)}
        hasSelectedRulebook={Boolean(parameters.selectedRulebook)}
        rulebookImported={parameters.rulebookImported}
        reviewId={data.reviewId}
        isRunning={run.isRunning}
        onClose={props.onClose}
        onImportRules={parameters.importSelectedRulebook}
        onAddRule={parameters.openRuleSetup}
        onAddQuestion={parameters.openQuestionSetup}
        onRun={() => {
          void run.run()
        }}
        onCancel={() => {
          void run.cancel()
        }}
      />
      {run.error && (
        <p
          role="alert"
          style={{
            margin: '8px 12px 0',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            color: '#B42318',
            fontSize: '13px',
          }}
        >
          {run.error}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: data.isWorkspace ? 'column' : 'row',
          flex: 1,
          overflowX: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: data.isWorkspace ? 1 : undefined,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '50%',
              overflow: 'auto',
            }}
          >
            {!data.isWorkspace && (
              <DocumentSourcesPanel
                documentName={documentName}
                uploadTime={uploadTime}
                isLoading={data.isPrimaryDocumentLoading}
                supportingDocuments={sources.supportingDocuments}
                error={sources.error}
                onUpload={sources.openUpload}
                onBrowse={sources.openBrowse}
                onClear={sources.clear}
                onPreview={sources.preview}
                onRemove={sources.remove}
              />
            )}
            <div
              style={{
                maxHeight: '100vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #EDEDED',
              }}
            >
              {data.isWorkspace && data.workspace && (
                <WorkspaceDocumentsPanel
                  workspaceName={data.workspace.name}
                  files={data.workspaceFiles}
                />
              )}
              <ComplianceParametersPanel
                rules={parameters.reviewRules}
                questions={parameters.questions}
                error={parameters.error}
                onAddRule={parameters.openRuleSetup}
                onAddQuestion={parameters.openQuestionSetup}
                onUpdateRule={parameters.updateRule}
                onUpdateQuestion={parameters.updateQuestion}
                onRemoveRule={parameters.removeRule}
                onRemoveQuestion={parameters.removeQuestion}
              />
            </div>
          </div>
        </div>

        <ComplianceResultsPanel results={results.state} isRunning={run.isRunning} />
      </div>

      <ComplianceReviewDialogs sources={sources.dialogs} parameters={parameters.dialogs} />
    </div>
  )

  return embedded ? content : <Layout activePage="compliance">{content}</Layout>
}
