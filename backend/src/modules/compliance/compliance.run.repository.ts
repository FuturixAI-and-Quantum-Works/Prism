import { isComplianceRunEvent, isStreamEvent } from "@prism/protocol";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  attentionItems,
  complianceReviews,
  complianceRunEvents,
  complianceRuns,
  notifications,
  userActivity,
  type Database,
} from "../../db/index.js";
import type { ComplianceRunRepository } from "./compliance.repository.js";
import type { ComplianceRun, ComplianceRunStatus } from "./compliance.types.js";

function runStatus(value: string): ComplianceRunStatus {
  if (
    value === "queued" ||
    value === "running" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }
  throw new Error(`Invalid compliance run status: ${value}`);
}

function toRun(row: typeof complianceRuns.$inferSelect): ComplianceRun {
  return { ...row, status: runStatus(row.status) };
}

function resultText(result: unknown, field: "summary" | "answer"): string | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  const value = Reflect.get(result, field);
  return typeof value === "string" ? value : undefined;
}

export function createComplianceRunRepository(database: Database): ComplianceRunRepository {
  return {
    async createOrGetRun(input) {
      const [created] = await database
        .insert(complianceRuns)
        .values(input)
        .onConflictDoNothing()
        .returning();
      if (created) return toRun(created);
      const [existing] = await database
        .select()
        .from(complianceRuns)
        .where(
          and(
            eq(complianceRuns.reviewId, input.reviewId),
            eq(complianceRuns.userId, input.userId),
            eq(complianceRuns.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (!existing) throw new Error("Failed to resolve idempotent compliance run");
      return toRun(existing);
    },

    async attachRunJob(runId, jobId) {
      await database
        .update(complianceRuns)
        .set({ jobId, updatedAt: new Date() })
        .where(and(eq(complianceRuns.id, runId), eq(complianceRuns.status, "queued")));
    },

    async findLatestRun(reviewId, userId) {
      const [run] = await database
        .select()
        .from(complianceRuns)
        .where(and(eq(complianceRuns.reviewId, reviewId), eq(complianceRuns.userId, userId)))
        .orderBy(desc(complianceRuns.createdAt))
        .limit(1);
      return run ? toRun(run) : null;
    },

    async findRun(runId, reviewId, userId) {
      const [run] = await database
        .select()
        .from(complianceRuns)
        .where(
          and(
            eq(complianceRuns.id, runId),
            eq(complianceRuns.reviewId, reviewId),
            eq(complianceRuns.userId, userId),
          ),
        )
        .limit(1);
      return run ? toRun(run) : null;
    },

    async markRunRunning(runId) {
      const [run] = await database
        .update(complianceRuns)
        .set({ status: "running", error: null, updatedAt: new Date() })
        .where(and(eq(complianceRuns.id, runId), eq(complianceRuns.status, "queued")))
        .returning({ reviewId: complianceRuns.reviewId });
      const current =
        run ??
        (
          await database
            .select({ reviewId: complianceRuns.reviewId, status: complianceRuns.status })
            .from(complianceRuns)
            .where(and(eq(complianceRuns.id, runId), eq(complianceRuns.status, "running")))
            .limit(1)
        )[0];
      if (!current) throw new Error("Compliance run not found");
      await database
        .update(complianceReviews)
        .set({ status: "running", updatedAt: new Date() })
        .where(eq(complianceReviews.id, current.reviewId));
    },

    async failReviewRun(runId, reviewId, error) {
      return database.transaction(async (transaction) => {
        const now = new Date();
        const runs = await transaction
          .update(complianceRuns)
          .set({ status: "failed", error, updatedAt: now })
          .where(
            and(
              eq(complianceRuns.id, runId),
              inArray(complianceRuns.status, ["queued", "running"]),
            ),
          )
          .returning({ id: complianceRuns.id });
        if (runs.length !== 1) return false;
        await transaction
          .update(complianceReviews)
          .set({ status: "failed", updatedAt: now })
          .where(eq(complianceReviews.id, reviewId));
        await transaction
          .insert(complianceRunEvents)
          .values({
            runId,
            eventKey: "status:failed",
            event: { type: "status", status: "failed" },
          })
          .onConflictDoNothing();
        return true;
      });
    },

    async markRunCancelled(runId) {
      return database.transaction(async (transaction) => {
        const now = new Date();
        const [run] = await transaction
          .update(complianceRuns)
          .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
          .where(
            and(
              eq(complianceRuns.id, runId),
              inArray(complianceRuns.status, ["queued", "running"]),
            ),
          )
          .returning({ reviewId: complianceRuns.reviewId });
        if (!run) return false;
        await transaction
          .update(complianceReviews)
          .set({ status: "pending", updatedAt: now })
          .where(eq(complianceReviews.id, run.reviewId));
        return true;
      });
    },

    async isRunCancelled(runId) {
      const [run] = await database
        .select({ status: complianceRuns.status })
        .from(complianceRuns)
        .where(eq(complianceRuns.id, runId))
        .limit(1);
      return run?.status === "cancelled";
    },

    async appendRunEvent(runId, eventKey, event) {
      const [row] = await database
        .insert(complianceRunEvents)
        .values({ runId, eventKey, event })
        .onConflictDoNothing()
        .returning({ sequence: complianceRunEvents.sequence });
      if (row) return row.sequence;
      const [existing] = await database
        .select({ sequence: complianceRunEvents.sequence })
        .from(complianceRunEvents)
        .where(
          and(eq(complianceRunEvents.runId, runId), eq(complianceRunEvents.eventKey, eventKey)),
        )
        .limit(1);
      if (!existing) throw new Error("Failed to persist compliance event");
      return existing.sequence;
    },

    async listRunEvents(runId, afterSequence) {
      const rows = await database
        .select({
          sequence: complianceRunEvents.sequence,
          event: complianceRunEvents.event,
        })
        .from(complianceRunEvents)
        .where(eq(complianceRunEvents.runId, runId))
        .orderBy(asc(complianceRunEvents.sequence));
      return rows.flatMap(({ sequence, event }) =>
        sequence > afterSequence &&
        isStreamEvent(event) &&
        isComplianceRunEvent(event) &&
        event.type !== "done" &&
        event.type !== "error"
          ? [{ sequence, event }]
          : [],
      );
    },

    async completeReviewRun(input) {
      return database.transaction(async (transaction) => {
        const now = new Date();
        const runs = await transaction
          .update(complianceRuns)
          .set({ status: "completed", completedAt: now, updatedAt: now })
          .where(and(eq(complianceRuns.id, input.runId), eq(complianceRuns.status, "running")))
          .returning({ id: complianceRuns.id });
        if (runs.length !== 1) return false;
        await transaction
          .update(complianceReviews)
          .set({
            status: "completed",
            complianceScore: input.complianceScore,
            results: input.summary,
            aiInsights: [...input.insights],
            updatedAt: now,
          })
          .where(eq(complianceReviews.id, input.reviewId));
        await transaction
          .insert(complianceRunEvents)
          .values({
            runId: input.runId,
            eventKey: "status:completed",
            event: { type: "status", status: "completed" },
          })
          .onConflictDoNothing();
        const issueValues: (typeof attentionItems.$inferInsert)[] = [
          ...input.rules.flatMap((rule) =>
            rule.status === "non_compliant" || rule.status === "partial"
              ? [
                  {
                    userId: input.userId,
                    sourceType: "compliance_issue" as const,
                    sourceId: input.reviewId,
                    secondarySourceId: rule.id,
                    severity: rule.status === "non_compliant" ? "high" : "medium",
                    title: rule.content.slice(0, 100) + (rule.content.length > 100 ? "..." : ""),
                    description:
                      resultText(rule.result, "summary") || "Compliance rule requires attention",
                    metadata: { fullContent: rule.content, status: rule.status },
                  },
                ]
              : [],
          ),
          ...input.questions.flatMap((question) =>
            question.status === "non_compliant" || question.status === "partial"
              ? [
                  {
                    userId: input.userId,
                    sourceType: "compliance_question" as const,
                    sourceId: input.reviewId,
                    secondarySourceId: question.id,
                    severity: question.status === "non_compliant" ? "high" : "medium",
                    title:
                      question.content.slice(0, 100) + (question.content.length > 100 ? "..." : ""),
                    description:
                      resultText(question.result, "answer") ||
                      "Compliance question requires attention",
                    metadata: { fullContent: question.content, status: question.status },
                  },
                ]
              : [],
          ),
        ];
        if (issueValues.length > 0) {
          await transaction.insert(attentionItems).values(issueValues);
        }
        await transaction.insert(userActivity).values({
          userId: input.userId,
          action: "compliance_run_completed",
          resourceType: "compliance_review",
          resourceId: input.reviewId,
          resourceName: input.reviewTitle || "Compliance Review",
          details: {
            compliance_score: input.complianceScore,
            non_compliant_count: input.nonCompliantCount,
            partial_count: input.partialCount,
            compliant_count: input.compliantCount,
          },
        });
        if (input.primaryDocumentId) {
          const hasCriticalIssues = input.nonCompliantCount > 0;
          const documentName = input.reviewTitle || "Document";
          await transaction.insert(notifications).values({
            userId: input.userId,
            icon: hasCriticalIssues ? "alert" : "compliance",
            title: hasCriticalIssues
              ? "Critical Compliance Issues Found"
              : "Compliance Review Complete",
            description:
              input.complianceScore === null
                ? `Compliance review for "${documentName}" completed. Compliance score unavailable because no scorable rules were evaluated.`
                : `Compliance review for "${documentName}" completed with a score of ${input.complianceScore}%`,
            link: `/compliance/documents/${encodeURIComponent(input.primaryDocumentId)}`,
            resourceType: "document",
            resourceId: input.primaryDocumentId,
            metadata: {
              score: input.complianceScore,
              hasCriticalIssues,
              documentName,
            },
          });
        }
        return true;
      });
    },
  };
}
