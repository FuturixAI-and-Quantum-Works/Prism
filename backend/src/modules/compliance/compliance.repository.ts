import { complianceReviewSupportingDocs, db, type Database } from "../../db/index.js";
import { createComplianceReviewRepository } from "./compliance.review.repository.js";
import { createComplianceRunRepository } from "./compliance.run.repository.js";
import { createComplianceSourceRepository } from "./compliance.source.repository.js";
import type {
  ComplianceDocument,
  ComplianceQuestion,
  ComplianceReview,
  ComplianceReviewDetails,
  ComplianceRule,
  ComplianceRun,
  ComplianceRunEventRecord,
  ComplianceRunInput,
  PersistedComplianceEvent,
} from "./compliance.types.js";

export type CreateReviewInput = Readonly<{
  userId: string;
  primaryDocumentId: string | null;
  title: string | null;
  projectId: string | null;
  workspaceId: string | null;
}>;

export type CompleteReviewRunInput = Readonly<{
  runId: string;
  reviewId: string;
  complianceScore: number | null;
  summary: Record<string, number | null>;
  insights: readonly string[];
  reviewTitle: string | null;
  primaryDocumentId: string | null;
  userId: string;
  nonCompliantCount: number;
  partialCount: number;
  compliantCount: number;
  rules: readonly ComplianceRule[];
  questions: readonly ComplianceQuestion[];
}>;

export interface ComplianceReviewRepository {
  listReviews(
    scope?: Readonly<{
      projectId?: string;
      workspaceId?: string;
      primaryDocumentId?: string;
    }>,
  ): Promise<readonly ComplianceReview[]>;
  findReview(reviewId: string): Promise<ComplianceReview | null>;
  createReview(input: CreateReviewInput): Promise<ComplianceReview>;
  updateReviewTitle(reviewId: string, title: string | null): Promise<ComplianceReview | null>;
  deleteReview(reviewId: string): Promise<boolean>;
  getDetails(review: ComplianceReview): Promise<ComplianceReviewDetails>;
  addSupportingDocument(
    reviewId: string,
    documentId: string,
  ): Promise<typeof complianceReviewSupportingDocs.$inferSelect>;
  removeSupportingDocument(reviewId: string, documentId: string): Promise<void>;
  addRule(reviewId: string, content: string): Promise<ComplianceRule>;
  updateRule(
    reviewId: string,
    ruleId: string,
    content: string | undefined,
  ): Promise<ComplianceRule | null>;
  deleteRule(reviewId: string, ruleId: string): Promise<void>;
  addQuestion(reviewId: string, content: string): Promise<ComplianceQuestion>;
  updateQuestion(
    reviewId: string,
    questionId: string,
    content: string | undefined,
  ): Promise<ComplianceQuestion | null>;
  deleteQuestion(reviewId: string, questionId: string): Promise<void>;
  updateRuleResult(
    ruleId: string,
    status: ComplianceRule["status"],
    result: unknown,
  ): Promise<void>;
  updateQuestionResult(
    questionId: string,
    status: ComplianceQuestion["status"],
    result: unknown,
  ): Promise<void>;
}

export interface ComplianceSourceRepository {
  findDocuments(ids: readonly string[]): Promise<readonly ComplianceDocument[]>;
  getWorkspaceName(workspaceId: string): Promise<string | null>;
  workspaceHasContent(workspaceId: string): Promise<boolean>;
  loadRunInput(review: ComplianceReview): Promise<ComplianceRunInput>;
}

export interface ComplianceRunRepository {
  createOrGetRun(input: {
    reviewId: string;
    userId: string;
    idempotencyKey: string;
  }): Promise<ComplianceRun>;
  attachRunJob(runId: string, jobId: string): Promise<void>;
  findLatestRun(reviewId: string, userId: string): Promise<ComplianceRun | null>;
  findRun(runId: string, reviewId: string, userId: string): Promise<ComplianceRun | null>;
  markRunRunning(runId: string): Promise<void>;
  failReviewRun(runId: string, reviewId: string, error: string): Promise<boolean>;
  markRunCancelled(runId: string): Promise<boolean>;
  isRunCancelled(runId: string): Promise<boolean>;
  appendRunEvent(runId: string, eventKey: string, event: PersistedComplianceEvent): Promise<number>;
  listRunEvents(runId: string, afterSequence: number): Promise<readonly ComplianceRunEventRecord[]>;
  completeReviewRun(input: CompleteReviewRunInput): Promise<boolean>;
}

export type ComplianceRepository = ComplianceReviewRepository &
  ComplianceSourceRepository &
  ComplianceRunRepository;

export function createDrizzleComplianceRepository(database: Database = db): ComplianceRepository {
  const reviews = createComplianceReviewRepository(database);
  return {
    ...reviews,
    ...createComplianceSourceRepository(database, reviews),
    ...createComplianceRunRepository(database),
  };
}
