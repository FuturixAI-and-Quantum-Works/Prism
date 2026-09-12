import type { ComplianceRunEvent, StreamTerminalEvent } from "@prism/protocol";

export type ComplianceActor = Readonly<{
  userId: string;
  email: string;
}>;

export type ComplianceScope =
  | Readonly<{ kind: "workspace"; workspaceId: string }>
  | Readonly<{ kind: "project"; projectId: string }>
  | Readonly<{ kind: "document" }>;

export type CompliancePermission = "read" | "write";
export type ComplianceReviewStatus = "pending" | "running" | "completed" | "failed";
export type ComplianceRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ComplianceRuleStatus = "pending" | "compliant" | "non_compliant" | "partial" | "error";

export type ComplianceDocument = Readonly<{
  id: string;
  userId: string;
  projectId: string | null;
  workspaceId: string | null;
  filename: string;
  fileType: string | null;
}>;

export type ComplianceDriveFile = Readonly<{
  id: string;
  filename: string;
  extension: string | null;
  storagePath: string;
}>;

export type ComplianceReview = Readonly<{
  id: string;
  userId: string;
  projectId: string | null;
  workspaceId: string | null;
  primaryDocumentId: string | null;
  title: string | null;
  status: ComplianceReviewStatus;
  complianceScore: number | null;
  results: unknown;
  aiInsights: unknown;
  ragCollectionName: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type ComplianceRule = Readonly<{
  id: string;
  reviewId: string;
  content: string;
  status: ComplianceRuleStatus;
  result: unknown;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type ComplianceQuestion = ComplianceRule;

export type ComplianceSupportingDocument = Readonly<{
  id: string;
  reviewId?: string;
  documentId: string;
  filename: string;
  fileType: string | null;
  createdAt: Date;
}>;

export type ComplianceReviewDetails = Readonly<{
  review: ComplianceReview;
  primaryDocument: Pick<ComplianceDocument, "id" | "filename" | "fileType"> | null;
  supportingDocs: readonly ComplianceSupportingDocument[];
  rules: readonly ComplianceRule[];
  questions: readonly ComplianceQuestion[];
}>;

export type ComplianceRunInput = ComplianceReviewDetails &
  Readonly<{
    workspaceFiles: readonly ComplianceDriveFile[];
    workspaceDocuments: readonly ComplianceDocument[];
  }>;

export type ComplianceRun = Readonly<{
  id: string;
  reviewId: string;
  userId: string;
  jobId: string | null;
  idempotencyKey: string;
  status: ComplianceRunStatus;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}>;

export type PersistedComplianceEvent = Exclude<ComplianceRunEvent, StreamTerminalEvent>;

export type ComplianceRunEventRecord = Readonly<{
  sequence: number;
  event: PersistedComplianceEvent;
}>;

export class ComplianceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ComplianceError";
  }
}
