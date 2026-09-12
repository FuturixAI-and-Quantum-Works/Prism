function segment(value: string): string {
  return encodeURIComponent(value)
}

export const appRoutePatterns = {
  workspaces: '/workspaces',
  workspace: '/workspaces/:workspaceId',
  project: '/projects/:projectId',
  document: '/documents/:documentId',
  complianceDocument: '/compliance/documents/:documentId',
  complianceReview: '/compliance/reviews/:reviewId',
  complianceWorkspace: '/compliance/workspaces/:workspaceId',
} as const

export const appRoutes = {
  workspaces: appRoutePatterns.workspaces,
  workspace: (workspaceId: string) => `/workspaces/${segment(workspaceId)}`,
  project: (projectId: string) => `/projects/${segment(projectId)}`,
  document: (documentId: string) => `/documents/${segment(documentId)}`,
  complianceDocument: (documentId: string) => `/compliance/documents/${segment(documentId)}`,
  complianceReview: (reviewId: string) => `/compliance/reviews/${segment(reviewId)}`,
  complianceWorkspace: (workspaceId: string) => `/compliance/workspaces/${segment(workspaceId)}`,
} as const
