import { and, desc, eq, inArray } from "drizzle-orm";
import { db, templates, type Database } from "../../db/index.js";
import type {
  CreateTemplateInput,
  Template,
  TemplateListType,
  UpdateTemplateInput,
} from "./templates.types.js";

export interface TemplatesRepository {
  list(templateIds: readonly string[], type: TemplateListType): Promise<readonly Template[]>;
  findById(templateId: string): Promise<Template | null>;
  create(userId: string, input: CreateTemplateInput): Promise<Template>;
  updateOwned(
    templateId: string,
    userId: string,
    input: UpdateTemplateInput,
  ): Promise<Template | null>;
  deleteOwned(templateId: string, userId: string): Promise<Template | null>;
  clone(
    source: Template,
    userId: string,
    name: string,
    sourceStoragePath: string | null,
  ): Promise<Template>;
}

export class DrizzleTemplatesRepository implements TemplatesRepository {
  constructor(private readonly database: Database = db) {}

  list(templateIds: readonly string[], type: TemplateListType): Promise<readonly Template[]> {
    if (templateIds.length === 0) return Promise.resolve([]);
    const typeCondition =
      type === "system"
        ? eq(templates.isCreatedByUser, false)
        : type === "user"
          ? eq(templates.isCreatedByUser, true)
          : undefined;
    return this.database
      .select()
      .from(templates)
      .where(and(inArray(templates.id, [...templateIds]), typeCondition))
      .orderBy(desc(templates.createdAt));
  }

  async findById(templateId: string): Promise<Template | null> {
    const [template] = await this.database
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);
    return template ?? null;
  }

  async create(userId: string, input: CreateTemplateInput): Promise<Template> {
    return this.database.transaction(async (transaction) => {
      const [template] = await transaction
        .insert(templates)
        .values({
          userId,
          name: input.name,
          category: input.category,
          description: input.description || null,
          contentHtml: input.contentHtml,
          fields: input.fields ?? null,
          isCreatedByUser: true,
        })
        .returning();
      if (!template) throw new Error("Failed to create template");
      return template;
    });
  }

  async updateOwned(
    templateId: string,
    userId: string,
    input: UpdateTemplateInput,
  ): Promise<Template | null> {
    return this.database.transaction(async (transaction) => {
      const [template] = await transaction
        .update(templates)
        .set({ ...input, updatedAt: new Date() })
        .where(
          and(
            eq(templates.id, templateId),
            eq(templates.userId, userId),
            eq(templates.isCreatedByUser, true),
          ),
        )
        .returning();
      return template ?? null;
    });
  }

  async deleteOwned(templateId: string, userId: string): Promise<Template | null> {
    return this.database.transaction(async (transaction) => {
      const [template] = await transaction
        .delete(templates)
        .where(
          and(
            eq(templates.id, templateId),
            eq(templates.userId, userId),
            eq(templates.isCreatedByUser, true),
          ),
        )
        .returning();
      return template ?? null;
    });
  }

  async clone(
    source: Template,
    userId: string,
    name: string,
    sourceStoragePath: string | null,
  ): Promise<Template> {
    return this.database.transaction(async (transaction) => {
      const [template] = await transaction
        .insert(templates)
        .values({
          userId,
          name,
          category: source.category,
          description: source.description,
          contentHtml: source.contentHtml,
          fields: source.fields,
          sourceFilename: source.sourceFilename,
          sourceStoragePath,
          sourceMimeType: source.sourceMimeType,
          sourceChecksum: source.sourceChecksum,
          sourceMetadata: source.sourceMetadata,
          isCreatedByUser: true,
        })
        .returning();
      if (!template) throw new Error("Failed to clone template");
      return template;
    });
  }
}
