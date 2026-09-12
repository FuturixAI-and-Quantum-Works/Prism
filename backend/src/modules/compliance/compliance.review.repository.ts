import { and, asc, desc, eq } from "drizzle-orm";
import {
  complianceReviewQuestions,
  complianceReviewRules,
  complianceReviews,
  complianceReviewSupportingDocs,
  documents,
  type Database,
} from "../../db/index.js";
import type { ComplianceReviewRepository } from "./compliance.repository.js";

export function createComplianceReviewRepository(database: Database): ComplianceReviewRepository {
  return {
    async listReviews(scope = {}) {
      const predicates = [];
      if (scope.projectId) predicates.push(eq(complianceReviews.projectId, scope.projectId));
      if (scope.workspaceId) predicates.push(eq(complianceReviews.workspaceId, scope.workspaceId));
      if (scope.primaryDocumentId) {
        predicates.push(eq(complianceReviews.primaryDocumentId, scope.primaryDocumentId));
      }
      return database
        .select()
        .from(complianceReviews)
        .where(predicates.length > 0 ? and(...predicates) : undefined)
        .orderBy(desc(complianceReviews.createdAt));
    },

    async findReview(reviewId) {
      const [review] = await database
        .select()
        .from(complianceReviews)
        .where(eq(complianceReviews.id, reviewId))
        .limit(1);
      return review ?? null;
    },

    async createReview(input) {
      const [review] = await database.insert(complianceReviews).values(input).returning();
      if (!review) throw new Error("Failed to create compliance review");
      return review;
    },

    async updateReviewTitle(reviewId, title) {
      const [review] = await database
        .update(complianceReviews)
        .set({ title, updatedAt: new Date() })
        .where(eq(complianceReviews.id, reviewId))
        .returning();
      return review ?? null;
    },

    async deleteReview(reviewId) {
      const rows = await database
        .delete(complianceReviews)
        .where(eq(complianceReviews.id, reviewId))
        .returning({ id: complianceReviews.id });
      return rows.length === 1;
    },

    async getDetails(review) {
      const [supportingDocs, rules, questions, primaryDocuments] = await Promise.all([
        database
          .select({
            id: complianceReviewSupportingDocs.id,
            documentId: complianceReviewSupportingDocs.documentId,
            filename: documents.filename,
            fileType: documents.fileType,
            createdAt: complianceReviewSupportingDocs.createdAt,
          })
          .from(complianceReviewSupportingDocs)
          .innerJoin(documents, eq(complianceReviewSupportingDocs.documentId, documents.id))
          .where(eq(complianceReviewSupportingDocs.reviewId, review.id)),
        database
          .select()
          .from(complianceReviewRules)
          .where(eq(complianceReviewRules.reviewId, review.id))
          .orderBy(asc(complianceReviewRules.sortOrder)),
        database
          .select()
          .from(complianceReviewQuestions)
          .where(eq(complianceReviewQuestions.reviewId, review.id))
          .orderBy(asc(complianceReviewQuestions.sortOrder)),
        review.primaryDocumentId
          ? database
              .select({
                id: documents.id,
                filename: documents.filename,
                fileType: documents.fileType,
              })
              .from(documents)
              .where(eq(documents.id, review.primaryDocumentId))
              .limit(1)
          : Promise.resolve([]),
      ]);
      return {
        review,
        primaryDocument: primaryDocuments[0] ?? null,
        supportingDocs,
        rules,
        questions,
      };
    },

    async addSupportingDocument(reviewId, documentId) {
      const [row] = await database
        .insert(complianceReviewSupportingDocs)
        .values({ reviewId, documentId })
        .onConflictDoNothing()
        .returning();
      if (row) return row;
      const [existing] = await database
        .select()
        .from(complianceReviewSupportingDocs)
        .where(
          and(
            eq(complianceReviewSupportingDocs.reviewId, reviewId),
            eq(complianceReviewSupportingDocs.documentId, documentId),
          ),
        )
        .limit(1);
      if (!existing) throw new Error("Failed to resolve supporting document");
      return existing;
    },

    async removeSupportingDocument(reviewId, documentId) {
      await database
        .delete(complianceReviewSupportingDocs)
        .where(
          and(
            eq(complianceReviewSupportingDocs.reviewId, reviewId),
            eq(complianceReviewSupportingDocs.documentId, documentId),
          ),
        );
    },

    async addRule(reviewId, content) {
      const [latest] = await database
        .select({ sortOrder: complianceReviewRules.sortOrder })
        .from(complianceReviewRules)
        .where(eq(complianceReviewRules.reviewId, reviewId))
        .orderBy(desc(complianceReviewRules.sortOrder))
        .limit(1);
      const [rule] = await database
        .insert(complianceReviewRules)
        .values({ reviewId, content, sortOrder: (latest?.sortOrder ?? -1) + 1 })
        .returning();
      if (!rule) throw new Error("Failed to create compliance rule");
      return rule;
    },

    async updateRule(reviewId, ruleId, content) {
      const [rule] = await database
        .update(complianceReviewRules)
        .set({ ...(content === undefined ? {} : { content }), updatedAt: new Date() })
        .where(
          and(eq(complianceReviewRules.id, ruleId), eq(complianceReviewRules.reviewId, reviewId)),
        )
        .returning();
      return rule ?? null;
    },

    async deleteRule(reviewId, ruleId) {
      await database
        .delete(complianceReviewRules)
        .where(
          and(eq(complianceReviewRules.id, ruleId), eq(complianceReviewRules.reviewId, reviewId)),
        );
    },

    async addQuestion(reviewId, content) {
      const [latest] = await database
        .select({ sortOrder: complianceReviewQuestions.sortOrder })
        .from(complianceReviewQuestions)
        .where(eq(complianceReviewQuestions.reviewId, reviewId))
        .orderBy(desc(complianceReviewQuestions.sortOrder))
        .limit(1);
      const [question] = await database
        .insert(complianceReviewQuestions)
        .values({ reviewId, content, sortOrder: (latest?.sortOrder ?? -1) + 1 })
        .returning();
      if (!question) throw new Error("Failed to create compliance question");
      return question;
    },

    async updateQuestion(reviewId, questionId, content) {
      const [question] = await database
        .update(complianceReviewQuestions)
        .set({ ...(content === undefined ? {} : { content }), updatedAt: new Date() })
        .where(
          and(
            eq(complianceReviewQuestions.id, questionId),
            eq(complianceReviewQuestions.reviewId, reviewId),
          ),
        )
        .returning();
      return question ?? null;
    },

    async deleteQuestion(reviewId, questionId) {
      await database
        .delete(complianceReviewQuestions)
        .where(
          and(
            eq(complianceReviewQuestions.id, questionId),
            eq(complianceReviewQuestions.reviewId, reviewId),
          ),
        );
    },

    async updateRuleResult(ruleId, status, result) {
      await database
        .update(complianceReviewRules)
        .set({ status, result, updatedAt: new Date() })
        .where(eq(complianceReviewRules.id, ruleId));
    },

    async updateQuestionResult(questionId, status, result) {
      await database
        .update(complianceReviewQuestions)
        .set({ status, result, updatedAt: new Date() })
        .where(eq(complianceReviewQuestions.id, questionId));
    },
  };
}
