import { and, eq, inArray } from "drizzle-orm";
import { db, tabularCells, type Database } from "../../db/index.js";
import type { TabularCell } from "./tabular.types.js";

export interface TabularCellRepository {
  clearCells(reviewId: string, documentIds?: readonly string[]): Promise<void>;
  listCells(reviewId: string): Promise<readonly TabularCell[]>;
  findCell(reviewId: string, documentId: string, columnIndex: number): Promise<TabularCell | null>;
}

export class DrizzleTabularCellRepository implements TabularCellRepository {
  constructor(private readonly database: Database = db) {}

  async clearCells(reviewId: string, documentIds?: readonly string[]): Promise<void> {
    const predicate = documentIds?.length
      ? and(eq(tabularCells.reviewId, reviewId), inArray(tabularCells.documentId, [...documentIds]))
      : eq(tabularCells.reviewId, reviewId);
    await this.database
      .update(tabularCells)
      .set({ content: null, status: "pending", activeRunId: null, activeRunEpoch: null })
      .where(predicate);
  }

  async listCells(reviewId: string): Promise<readonly TabularCell[]> {
    return this.database.select().from(tabularCells).where(eq(tabularCells.reviewId, reviewId));
  }

  async findCell(reviewId: string, documentId: string, columnIndex: number) {
    const [cell] = await this.database
      .select()
      .from(tabularCells)
      .where(
        and(
          eq(tabularCells.reviewId, reviewId),
          eq(tabularCells.documentId, documentId),
          eq(tabularCells.columnIndex, columnIndex),
        ),
      )
      .limit(1);
    return cell ?? null;
  }
}

export function parseCellContent(
  raw: unknown,
): { summary: string; flag?: string; reasoning?: string } | null {
  if (!raw) return null;
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { summary: String(raw), flag: "grey", reasoning: "" };
    }
  }
  if (!value || typeof value !== "object") return null;
  const summary = Reflect.get(value, "summary") ?? Reflect.get(value, "value");
  const flag = Reflect.get(value, "flag");
  const reasoning = Reflect.get(value, "reasoning");
  return {
    summary: String(summary ?? "").trim(),
    flag:
      flag === "green" || flag === "grey" || flag === "yellow" || flag === "red" ? flag : undefined,
    reasoning: typeof reasoning === "string" ? reasoning : "",
  };
}
