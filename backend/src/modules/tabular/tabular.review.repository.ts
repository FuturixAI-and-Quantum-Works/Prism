import { and, asc, desc, eq, getTableColumns, inArray } from "drizzle-orm";
import {
  db,
  documents,
  tabularCells,
  tabularReviewShares,
  tabularReviewSources,
  tabularReviews,
  userProfiles,
  users,
  type Database,
} from "../../db/index.js";
import { parseCellContent } from "./tabular.cell.repository.js";
import type { TabularDocument, TabularReview } from "./tabular.types.js";

type ReviewInsert = typeof tabularReviews.$inferInsert;
type ReviewUpdate = Partial<Pick<ReviewInsert, "title" | "columnsConfig" | "projectId">>;
type ReviewShareInput = Readonly<{
  email: string;
  role: "admin" | "editor" | "viewer";
}>;

export interface TabularReviewRepository {
  findReview(reviewId: string): Promise<TabularReview | null>;
  listVisibleReviews(input: {
    reviewIds: readonly string[];
    projectId?: string;
  }): Promise<readonly unknown[]>;
  createReview(input: {
    userId: string;
    title: string | null;
    projectId: string | null;
    workflowId: string | null;
    columns: readonly { index: number }[];
    documentIds: readonly string[];
  }): Promise<unknown>;
  updateReview(input: {
    reviewId: string;
    updates: ReviewUpdate;
    shareReplacement?: Readonly<{
      shares: readonly ReviewShareInput[];
      sharedByUserId: string;
    }>;
    documentIds?: readonly string[];
    columns?: readonly { index: number }[];
  }): Promise<unknown | null>;
  deleteReview(reviewId: string): Promise<void>;
  reviewDetails(review: TabularReview, userId: string, role: string): Promise<unknown>;
  reviewPeople(review: TabularReview): Promise<unknown>;
  listReviewDocuments(reviewId: string): Promise<readonly TabularDocument[]>;
  findDocuments(documentIds: readonly string[]): Promise<readonly TabularDocument[]>;
  sourceBelongsToReview(reviewId: string, documentId: string): Promise<boolean>;
  findDocument(documentId: string): Promise<TabularDocument | null>;
  findUserEmail(userId: string): Promise<string | null>;
}

export class DrizzleTabularReviewRepository implements TabularReviewRepository {
  constructor(private readonly database: Database = db) {}

  async findReview(reviewId: string): Promise<TabularReview | null> {
    const [review] = await this.database
      .select()
      .from(tabularReviews)
      .where(eq(tabularReviews.id, reviewId))
      .limit(1);
    return review ?? null;
  }

  async listVisibleReviews(input: {
    reviewIds: readonly string[];
    projectId?: string;
  }): Promise<readonly unknown[]> {
    if (input.reviewIds.length === 0) return [];
    const reviews = await this.database
      .select()
      .from(tabularReviews)
      .where(
        input.projectId
          ? and(
              inArray(tabularReviews.id, [...input.reviewIds]),
              eq(tabularReviews.projectId, input.projectId),
            )
          : inArray(tabularReviews.id, [...input.reviewIds]),
      )
      .orderBy(desc(tabularReviews.createdAt));
    const ids = reviews.map(({ id }) => id);
    const [sources, shares] =
      ids.length === 0
        ? [[], []]
        : await Promise.all([
            this.database
              .select({ reviewId: tabularReviewSources.reviewId })
              .from(tabularReviewSources)
              .where(inArray(tabularReviewSources.reviewId, ids)),
            this.database
              .select()
              .from(tabularReviewShares)
              .where(inArray(tabularReviewShares.reviewId, ids)),
          ]);
    const counts = new Map<string, number>();
    for (const source of sources)
      counts.set(source.reviewId, (counts.get(source.reviewId) ?? 0) + 1);
    return reviews.map((review) => ({
      ...review,
      document_count: counts.get(review.id) ?? 0,
      shares: shares.filter((share) => share.reviewId === review.id),
    }));
  }

  async createReview(input: {
    userId: string;
    title: string | null;
    projectId: string | null;
    workflowId: string | null;
    columns: readonly { index: number }[];
    documentIds: readonly string[];
  }): Promise<unknown> {
    return this.database.transaction(async (transaction) => {
      const [review] = await transaction
        .insert(tabularReviews)
        .values({
          userId: input.userId,
          title: input.title,
          projectId: input.projectId,
          workflowId: input.workflowId,
          columnsConfig: [...input.columns],
        })
        .returning();
      if (!review) throw new Error("Failed to create review");
      if (input.documentIds.length) {
        await transaction.insert(tabularReviewSources).values(
          input.documentIds.map((documentId, sortOrder) => ({
            reviewId: review.id,
            documentId,
            sortOrder,
          })),
        );
        const cells = input.documentIds.flatMap((documentId) =>
          input.columns.map((column) => ({
            reviewId: review.id,
            documentId,
            columnIndex: column.index,
            status: "pending",
          })),
        );
        if (cells.length) await transaction.insert(tabularCells).values(cells);
      }
      return review;
    });
  }

  async updateReview(input: {
    reviewId: string;
    updates: ReviewUpdate;
    shareReplacement?: Readonly<{
      shares: readonly ReviewShareInput[];
      sharedByUserId: string;
    }>;
    documentIds?: readonly string[];
    columns?: readonly { index: number }[];
  }): Promise<unknown | null> {
    return this.database.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(tabularReviews)
        .where(eq(tabularReviews.id, input.reviewId))
        .limit(1);
      if (!current) return null;
      const [updated] = await transaction
        .update(tabularReviews)
        .set({ ...input.updates, updatedAt: new Date() })
        .where(eq(tabularReviews.id, input.reviewId))
        .returning();
      const replacement = input.shareReplacement;
      if (replacement) {
        await transaction
          .delete(tabularReviewShares)
          .where(eq(tabularReviewShares.reviewId, input.reviewId));
        if (replacement.shares.length > 0) {
          const selectedUsers = await transaction
            .select({ id: users.id, email: users.email })
            .from(users);
          const userByEmail = new Map(
            selectedUsers.map((user) => [user.email.toLowerCase(), user.id]),
          );
          await transaction.insert(tabularReviewShares).values(
            replacement.shares.map((share) => ({
              reviewId: input.reviewId,
              userId: userByEmail.get(share.email) ?? null,
              email: share.email,
              role: share.role,
              sharedByUserId: replacement.sharedByUserId,
            })),
          );
        }
      }
      const sourceRows = await transaction
        .select({ documentId: tabularReviewSources.documentId })
        .from(tabularReviewSources)
        .where(eq(tabularReviewSources.reviewId, input.reviewId))
        .orderBy(asc(tabularReviewSources.sortOrder));
      const documentIds = input.documentIds ?? sourceRows.map(({ documentId }) => documentId);
      const columns = input.columns ?? parseColumns(current.columnsConfig);
      const existingCells = await transaction
        .select({
          documentId: tabularCells.documentId,
          columnIndex: tabularCells.columnIndex,
        })
        .from(tabularCells)
        .where(eq(tabularCells.reviewId, input.reviewId));
      if (input.documentIds) {
        await transaction
          .delete(tabularReviewSources)
          .where(eq(tabularReviewSources.reviewId, input.reviewId));
        if (documentIds.length) {
          await transaction.insert(tabularReviewSources).values(
            documentIds.map((documentId, sortOrder) => ({
              reviewId: input.reviewId,
              documentId,
              sortOrder,
            })),
          );
        }
        const removed = sourceRows
          .map(({ documentId }) => documentId)
          .filter((documentId) => !documentIds.includes(documentId));
        if (removed.length) {
          await transaction
            .delete(tabularCells)
            .where(
              and(
                eq(tabularCells.reviewId, input.reviewId),
                inArray(tabularCells.documentId, removed),
              ),
            );
        }
      }
      if (input.documentIds || input.columns) {
        const existingKeys = new Set(
          existingCells.map((cell) => `${cell.documentId}:${cell.columnIndex}`),
        );
        const cells = documentIds.flatMap((documentId) =>
          columns.flatMap((column) =>
            existingKeys.has(`${documentId}:${column.index}`)
              ? []
              : [
                  {
                    reviewId: input.reviewId,
                    documentId,
                    columnIndex: column.index,
                    status: "pending",
                  },
                ],
          ),
        );
        if (cells.length) {
          await transaction.insert(tabularCells).values(cells).onConflictDoNothing();
        }
      }
      return updated ?? null;
    });
  }

  async deleteReview(reviewId: string): Promise<void> {
    await this.database.delete(tabularReviews).where(eq(tabularReviews.id, reviewId));
  }

  async reviewDetails(review: TabularReview, userId: string, role: string): Promise<unknown> {
    const [cells, documentsForReview, shares] = await Promise.all([
      this.database.select().from(tabularCells).where(eq(tabularCells.reviewId, review.id)),
      this.listReviewDocuments(review.id),
      this.database
        .select()
        .from(tabularReviewShares)
        .where(eq(tabularReviewShares.reviewId, review.id)),
    ]);
    return {
      review: { ...review, shares, is_owner: review.userId === userId, access_role: role },
      cells: cells.map(
        ({ activeRunId: _activeRunId, activeRunEpoch: _activeRunEpoch, ...cell }) => ({
          ...cell,
          content: parseCellContent(cell.content),
        }),
      ),
      documents: documentsForReview,
    };
  }

  async reviewPeople(review: TabularReview): Promise<unknown> {
    const shares = await this.database
      .select()
      .from(tabularReviewShares)
      .where(eq(tabularReviewShares.reviewId, review.id))
      .orderBy(asc(tabularReviewShares.createdAt));
    const allUsers = await this.database.select({ id: users.id, email: users.email }).from(users);
    const byEmail = new Map(allUsers.map((user) => [user.email.toLowerCase(), user]));
    const ids = [
      review.userId,
      ...shares.flatMap((share) => {
        if (share.userId) return [share.userId];
        const user = byEmail.get(share.email);
        return user ? [user.id] : [];
      }),
    ];
    const profiles =
      ids.length === 0
        ? []
        : await this.database
            .select({ userId: userProfiles.userId, displayName: userProfiles.displayName })
            .from(userProfiles)
            .where(inArray(userProfiles.userId, ids));
    const names = new Map(profiles.map((profile) => [profile.userId, profile.displayName]));
    const owner = allUsers.find((user) => user.id === review.userId);
    return {
      owner: {
        user_id: review.userId,
        email: owner?.email ?? null,
        display_name: names.get(review.userId) ?? null,
      },
      members: shares.map((share) => {
        const user = share.userId
          ? allUsers.find(({ id }) => id === share.userId)
          : byEmail.get(share.email);
        return {
          id: share.id,
          user_id: share.userId,
          email: share.email,
          role: share.role,
          display_name: user ? (names.get(user.id) ?? null) : null,
        };
      }),
    };
  }

  async listReviewDocuments(reviewId: string): Promise<readonly TabularDocument[]> {
    return this.database
      .select({ ...getTableColumns(documents) })
      .from(tabularReviewSources)
      .innerJoin(documents, eq(documents.id, tabularReviewSources.documentId))
      .where(eq(tabularReviewSources.reviewId, reviewId))
      .orderBy(asc(tabularReviewSources.sortOrder));
  }

  async findDocuments(documentIds: readonly string[]): Promise<readonly TabularDocument[]> {
    if (!documentIds.length) return [];
    return this.database
      .select({
        id: documents.id,
        userId: documents.userId,
        projectId: documents.projectId,
        filename: documents.filename,
        fileType: documents.fileType,
      })
      .from(documents)
      .where(inArray(documents.id, [...documentIds]));
  }

  async sourceBelongsToReview(reviewId: string, documentId: string): Promise<boolean> {
    const [source] = await this.database
      .select({ id: tabularReviewSources.id })
      .from(tabularReviewSources)
      .where(
        and(
          eq(tabularReviewSources.reviewId, reviewId),
          eq(tabularReviewSources.documentId, documentId),
        ),
      )
      .limit(1);
    return Boolean(source);
  }

  async findDocument(documentId: string): Promise<TabularDocument | null> {
    const [document] = await this.database
      .select({
        id: documents.id,
        userId: documents.userId,
        projectId: documents.projectId,
        filename: documents.filename,
        fileType: documents.fileType,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    return document ?? null;
  }

  async findUserEmail(userId: string): Promise<string | null> {
    const [user] = await this.database
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user?.email?.trim().toLowerCase() || null;
  }
}

function parseColumns(value: unknown): readonly { index: number }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const index = Reflect.get(entry, "index");
    return typeof index === "number" && Number.isInteger(index) ? [{ index }] : [];
  });
}
