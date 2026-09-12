import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  tabularReviewChatMessages,
  tabularReviewChats,
  type Database,
} from "../../db/index.js";

export interface TabularChatRepository {
  listChats(reviewId: string, userId: string): Promise<readonly unknown[]>;
  deleteChat(reviewId: string, chatId: string, userId: string): Promise<void>;
  findOwnedChat(
    reviewId: string,
    chatId: string,
    userId: string,
  ): Promise<{ id: string; title: string | null } | null>;
  createChat(reviewId: string, userId: string): Promise<{ id: string; title: string | null }>;
  listChatMessages(chatId: string): Promise<readonly unknown[]>;
  addChatMessage(input: {
    chatId: string;
    role: "user" | "assistant";
    content: string | null;
    annotations?: unknown;
  }): Promise<void>;
  updateChat(input: {
    reviewId: string;
    chatId: string;
    userId: string;
    title?: string;
  }): Promise<void>;
}

export class DrizzleTabularChatRepository implements TabularChatRepository {
  constructor(private readonly database: Database = db) {}

  async listChats(reviewId: string, userId: string): Promise<readonly unknown[]> {
    return this.database
      .select({
        id: tabularReviewChats.id,
        title: tabularReviewChats.title,
        createdAt: tabularReviewChats.createdAt,
        updatedAt: tabularReviewChats.updatedAt,
        userId: tabularReviewChats.userId,
      })
      .from(tabularReviewChats)
      .where(and(eq(tabularReviewChats.reviewId, reviewId), eq(tabularReviewChats.userId, userId)))
      .orderBy(desc(tabularReviewChats.updatedAt));
  }

  async deleteChat(reviewId: string, chatId: string, userId: string): Promise<void> {
    await this.database
      .delete(tabularReviewChats)
      .where(
        and(
          eq(tabularReviewChats.id, chatId),
          eq(tabularReviewChats.reviewId, reviewId),
          eq(tabularReviewChats.userId, userId),
        ),
      );
  }

  async findOwnedChat(
    reviewId: string,
    chatId: string,
    userId: string,
  ): Promise<{ id: string; title: string | null } | null> {
    const [chat] = await this.database
      .select()
      .from(tabularReviewChats)
      .where(
        and(
          eq(tabularReviewChats.id, chatId),
          eq(tabularReviewChats.reviewId, reviewId),
          eq(tabularReviewChats.userId, userId),
        ),
      )
      .limit(1);
    return chat ?? null;
  }

  async createChat(
    reviewId: string,
    userId: string,
  ): Promise<{ id: string; title: string | null }> {
    const [chat] = await this.database
      .insert(tabularReviewChats)
      .values({ reviewId, userId })
      .returning({ id: tabularReviewChats.id, title: tabularReviewChats.title });
    if (!chat) throw new Error("Failed to create chat");
    return chat;
  }

  async listChatMessages(chatId: string): Promise<readonly unknown[]> {
    return this.database
      .select({
        id: tabularReviewChatMessages.id,
        role: tabularReviewChatMessages.role,
        content: tabularReviewChatMessages.content,
        annotations: tabularReviewChatMessages.annotations,
        createdAt: tabularReviewChatMessages.createdAt,
      })
      .from(tabularReviewChatMessages)
      .where(eq(tabularReviewChatMessages.chatId, chatId))
      .orderBy(asc(tabularReviewChatMessages.createdAt));
  }

  async addChatMessage(input: {
    chatId: string;
    role: "user" | "assistant";
    content: string | null;
    annotations?: unknown;
  }): Promise<void> {
    await this.database.insert(tabularReviewChatMessages).values(input);
  }

  async updateChat(input: {
    reviewId: string;
    chatId: string;
    userId: string;
    title?: string;
  }): Promise<void> {
    await this.database
      .update(tabularReviewChats)
      .set({ ...(input.title === undefined ? {} : { title: input.title }), updatedAt: new Date() })
      .where(
        and(
          eq(tabularReviewChats.id, input.chatId),
          eq(tabularReviewChats.reviewId, input.reviewId),
          eq(tabularReviewChats.userId, input.userId),
        ),
      );
  }
}
