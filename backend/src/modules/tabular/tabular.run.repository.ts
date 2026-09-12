import { isStreamEvent, isTabularGenerateEvent } from "@prism/protocol";
import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import {
  db,
  jobs,
  tabularCells,
  tabularRunEvents,
  tabularRuns,
  type Database,
} from "../../db/index.js";
import type {
  PersistedTabularEvent,
  TabularCellErrorKind,
  TabularCellResult,
  TabularRun,
  TabularRunEventRecord,
  TabularRunOperation,
  TabularRunRequest,
  TabularRunStatus,
} from "./tabular.types.js";
import { TabularActiveRunConflictError, TabularRunConflictError } from "./tabular.types.js";
import { tabularRunRequestSchema } from "./tabular.validators.js";

type RunRow = typeof tabularRuns.$inferSelect;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

type CreateRunInput = {
  reviewId: string;
  userId: string;
  idempotencyKey: string;
  request: TabularRunRequest;
  requestHash: string;
};

type FindRunByIdempotencyInput = Pick<CreateRunInput, "reviewId" | "userId" | "idempotencyKey"> & {
  operation: TabularRunOperation;
};

type ReserveUsageInput = {
  runId: string;
  epoch: number;
  calls: number;
  outputTokens: number;
  maxCalls: number;
  maxOutputTokens: number;
};

type CellTransitionInput = {
  reviewId: string;
  documentId: string;
  columnIndex: number;
  runId: string;
  epoch: number;
  eventKey: string;
  event: PersistedTabularEvent;
};

type CompleteCellInput = CellTransitionInput & {
  content: TabularCellResult;
  status: "done" | "error";
  errorKind?: TabularCellErrorKind;
};

export interface TabularRunRepository {
  createOrGetRun(input: CreateRunInput): Promise<{ run: TabularRun; created: boolean }>;
  findRunByIdempotency(input: FindRunByIdempotencyInput): Promise<TabularRun | null>;
  ensureRunJob(runId: string): Promise<TabularRun>;
  findRun(runId: string, reviewId: string, userId: string): Promise<TabularRun | null>;
  findLatestRun(
    reviewId: string,
    userId: string,
    operation: TabularRunOperation,
  ): Promise<TabularRun | null>;
  claimRun(runId: string): Promise<{ run: TabularRun; epoch: number } | null>;
  completeRun(runId: string, epoch: number): Promise<boolean>;
  failRun(runId: string, epoch: number, error: string): Promise<boolean>;
  failActiveRun(runId: string, error: string): Promise<boolean>;
  cancelRun(runId: string): Promise<boolean>;
  isRunCancelled(runId: string): Promise<boolean>;
  reserveUsage(input: ReserveUsageInput): Promise<boolean>;
  appendRunEvent(
    runId: string,
    eventKey: string,
    event: PersistedTabularEvent,
    errorKind?: TabularCellErrorKind,
  ): Promise<number>;
  listRunEvents(runId: string, afterSequence: number): Promise<readonly TabularRunEventRecord[]>;
  markCellGenerating(input: CellTransitionInput): Promise<boolean>;
  completeCell(input: CompleteCellInput): Promise<boolean>;
}

function parseStatus(value: string): TabularRunStatus {
  if (
    value === "queued" ||
    value === "running" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }
  throw new Error(`Invalid tabular run status: ${value}`);
}

function parseOperation(value: string): TabularRunOperation {
  if (value === "generate" || value === "regenerate-cell") return value;
  throw new Error(`Invalid tabular run operation: ${value}`);
}

function parseErrorKind(value: string | null): TabularCellErrorKind | null {
  if (
    value === "extraction" ||
    value === "unsupported-inline-pdf" ||
    value === "missing-model-result"
  ) {
    return value;
  }
  return null;
}

function toRun(row: typeof tabularRuns.$inferSelect): TabularRun {
  return {
    ...row,
    operation: parseOperation(row.operation),
    request: tabularRunRequestSchema.parse(row.request),
    status: parseStatus(row.status),
  };
}

async function appendEventLocked(
  transaction: Transaction,
  runId: string,
  eventKey: string,
  event: PersistedTabularEvent,
  errorKind?: TabularCellErrorKind,
): Promise<number> {
  await transaction.execute(sql`select id from ${tabularRuns} where id = ${runId} for update`);
  const [existing] = await transaction
    .select({ sequence: tabularRunEvents.sequence })
    .from(tabularRunEvents)
    .where(and(eq(tabularRunEvents.runId, runId), eq(tabularRunEvents.eventKey, eventKey)))
    .limit(1);
  if (existing) return existing.sequence;
  const [current] = await transaction
    .select({ nextSequence: tabularRuns.nextSequence })
    .from(tabularRuns)
    .where(eq(tabularRuns.id, runId))
    .limit(1);
  if (!current) throw new Error("Tabular run not found");
  await transaction
    .update(tabularRuns)
    .set({ nextSequence: current.nextSequence + 1, updatedAt: new Date() })
    .where(eq(tabularRuns.id, runId));
  await transaction.insert(tabularRunEvents).values({
    runId,
    sequence: current.nextSequence,
    eventKey,
    event,
    errorKind: errorKind ?? null,
  });
  return current.nextSequence;
}

async function lockActiveRun(
  transaction: Transaction,
  runId: string,
  epoch: number,
): Promise<boolean> {
  await transaction.execute(sql`select id from ${tabularRuns} where id = ${runId} for update`);
  const [run] = await transaction
    .select({ id: tabularRuns.id })
    .from(tabularRuns)
    .where(
      and(
        eq(tabularRuns.id, runId),
        eq(tabularRuns.status, "running"),
        eq(tabularRuns.executionEpoch, epoch),
      ),
    )
    .limit(1);
  return Boolean(run);
}

export async function withBoundedRunCreationRetry<T>(
  attempt: () => Promise<T | null>,
  maxAttempts = 3,
): Promise<T> {
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    const result = await attempt();
    if (result !== null) return result;
  }
  throw new Error("Failed to create tabular run after concurrent lifecycle changes");
}

function isExpectedRunJob(
  job: typeof jobs.$inferSelect,
  run: Pick<RunRow, "id" | "userId">,
): boolean {
  return (
    job.kind === "tabular.generate" &&
    job.actorUserId === run.userId &&
    job.maxAttempts === 3 &&
    job.priority === 0 &&
    job.payload !== null &&
    typeof job.payload === "object" &&
    Reflect.get(job.payload, "runId") === run.id
  );
}

async function ensureRunJobLocked(transaction: Transaction, runId: string): Promise<RunRow> {
  await transaction.execute(sql`select id from ${tabularRuns} where id = ${runId} for update`);
  const [run] = await transaction
    .select()
    .from(tabularRuns)
    .where(eq(tabularRuns.id, runId))
    .limit(1);
  if (!run) throw new Error("Tabular run not found");
  if (run.jobId || (run.status !== "queued" && run.status !== "running")) return run;
  const idempotencyKey = `tabular.generate:${run.id}`;
  const [createdJob] = await transaction
    .insert(jobs)
    .values({
      kind: "tabular.generate",
      payload: { runId: run.id },
      idempotencyKey,
      actorUserId: run.userId,
      maxAttempts: 3,
    })
    .onConflictDoNothing()
    .returning();
  const [job] = createdJob
    ? [createdJob]
    : await transaction.select().from(jobs).where(eq(jobs.idempotencyKey, idempotencyKey)).limit(1);
  if (!job || !isExpectedRunJob(job, run)) {
    throw new Error(`Tabular job idempotency key conflicts for run ${run.id}`);
  }
  const [attached] = await transaction
    .update(tabularRuns)
    .set({ jobId: job.id, updatedAt: new Date() })
    .where(and(eq(tabularRuns.id, run.id), isNull(tabularRuns.jobId)))
    .returning();
  if (attached) return attached;
  const [current] = await transaction
    .select()
    .from(tabularRuns)
    .where(eq(tabularRuns.id, run.id))
    .limit(1);
  if (!current) throw new Error("Tabular run disappeared while attaching its job");
  return current;
}

export class DrizzleTabularRunRepository implements TabularRunRepository {
  constructor(private readonly database: Database = db) {}

  async createOrGetRun(input: CreateRunInput): Promise<{ run: TabularRun; created: boolean }> {
    return withBoundedRunCreationRetry(() =>
      this.database.transaction(async (transaction) => {
        const findExisting = async (): Promise<RunRow | null> => {
          const [row] = await transaction
            .select()
            .from(tabularRuns)
            .where(
              and(
                eq(tabularRuns.reviewId, input.reviewId),
                eq(tabularRuns.userId, input.userId),
                eq(tabularRuns.operation, input.request.operation),
                eq(tabularRuns.idempotencyKey, input.idempotencyKey),
              ),
            )
            .limit(1);
          return row ?? null;
        };
        const existingBefore = await findExisting();
        if (existingBefore) {
          if (existingBefore.requestHash !== input.requestHash) {
            throw new TabularRunConflictError();
          }
          const run = await ensureRunJobLocked(transaction, existingBefore.id);
          return { run: toRun(run), created: false };
        }
        const [created] = await transaction
          .insert(tabularRuns)
          .values({
            reviewId: input.reviewId,
            userId: input.userId,
            idempotencyKey: input.idempotencyKey,
            operation: input.request.operation,
            request: input.request,
            requestHash: input.requestHash,
          })
          .onConflictDoNothing()
          .returning();
        if (created) {
          const run = await ensureRunJobLocked(transaction, created.id);
          return { run: toRun(run), created: true };
        }
        const existingAfter = await findExisting();
        if (existingAfter) {
          if (existingAfter.requestHash !== input.requestHash) {
            throw new TabularRunConflictError();
          }
          const run = await ensureRunJobLocked(transaction, existingAfter.id);
          return { run: toRun(run), created: false };
        }
        const [active] = await transaction
          .select({ id: tabularRuns.id })
          .from(tabularRuns)
          .where(
            and(
              eq(tabularRuns.reviewId, input.reviewId),
              inArray(tabularRuns.status, ["queued", "running"]),
            ),
          )
          .limit(1);
        if (active) throw new TabularActiveRunConflictError();
        return null;
      }),
    );
  }

  async findRunByIdempotency(input: FindRunByIdempotencyInput): Promise<TabularRun | null> {
    const [existing] = await this.database
      .select()
      .from(tabularRuns)
      .where(
        and(
          eq(tabularRuns.reviewId, input.reviewId),
          eq(tabularRuns.userId, input.userId),
          eq(tabularRuns.operation, input.operation),
          eq(tabularRuns.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    return existing ? toRun(existing) : null;
  }

  async ensureRunJob(runId: string): Promise<TabularRun> {
    return this.database.transaction(async (transaction) => {
      return toRun(await ensureRunJobLocked(transaction, runId));
    });
  }

  async findRun(runId: string, reviewId: string, userId: string): Promise<TabularRun | null> {
    const [row] = await this.database
      .select()
      .from(tabularRuns)
      .where(
        and(
          eq(tabularRuns.id, runId),
          eq(tabularRuns.reviewId, reviewId),
          eq(tabularRuns.userId, userId),
        ),
      )
      .limit(1);
    return row ? toRun(row) : null;
  }

  async findLatestRun(
    reviewId: string,
    userId: string,
    operation: TabularRunOperation,
  ): Promise<TabularRun | null> {
    const [row] = await this.database
      .select()
      .from(tabularRuns)
      .where(
        and(
          eq(tabularRuns.reviewId, reviewId),
          eq(tabularRuns.userId, userId),
          eq(tabularRuns.operation, operation),
        ),
      )
      .orderBy(desc(tabularRuns.createdAt))
      .limit(1);
    return row ? toRun(row) : null;
  }

  async claimRun(runId: string): Promise<{ run: TabularRun; epoch: number } | null> {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`select id from ${tabularRuns} where id = ${runId} for update`);
      const [row] = await transaction
        .update(tabularRuns)
        .set({
          status: "running",
          error: null,
          executionEpoch: sql`${tabularRuns.executionEpoch} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(tabularRuns.id, runId), inArray(tabularRuns.status, ["queued", "running"])))
        .returning();
      if (!row) return null;
      await transaction
        .update(tabularCells)
        .set({
          status: "pending",
          content: null,
          activeRunId: null,
          activeRunEpoch: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tabularCells.activeRunId, runId),
            lt(tabularCells.activeRunEpoch, row.executionEpoch),
          ),
        );
      return { run: toRun(row), epoch: row.executionEpoch };
    });
  }

  async completeRun(runId: string, epoch: number): Promise<boolean> {
    const now = new Date();
    const rows = await this.database
      .update(tabularRuns)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(
        and(
          eq(tabularRuns.id, runId),
          eq(tabularRuns.status, "running"),
          eq(tabularRuns.executionEpoch, epoch),
        ),
      )
      .returning({ id: tabularRuns.id });
    return rows.length === 1;
  }

  async failRun(runId: string, epoch: number, error: string): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      await transaction.execute(sql`select id from ${tabularRuns} where id = ${runId} for update`);
      const [row] = await transaction
        .select({
          reviewId: tabularRuns.reviewId,
          request: tabularRuns.request,
        })
        .from(tabularRuns)
        .where(
          and(
            eq(tabularRuns.id, runId),
            eq(tabularRuns.status, "running"),
            eq(tabularRuns.executionEpoch, epoch),
          ),
        )
        .limit(1);
      if (!row) return false;
      const request = tabularRunRequestSchema.parse(row.request);
      const terminalEvents = await transaction
        .select({ event: tabularRunEvents.event })
        .from(tabularRunEvents)
        .where(eq(tabularRunEvents.runId, runId));
      const terminalTargets = new Set(
        terminalEvents.flatMap(({ event }) =>
          isStreamEvent(event) &&
          isTabularGenerateEvent(event) &&
          event.type === "cell_update" &&
          (event.status === "done" || event.status === "error")
            ? [`${event.document_id}:${event.column_index}`]
            : [],
        ),
      );
      const content: TabularCellResult = { summary: "", flag: "red", reasoning: error };
      for (const target of runTargets(request)) {
        if (terminalTargets.has(`${target.documentId}:${target.columnIndex}`)) continue;
        const cells = await transaction
          .update(tabularCells)
          .set({
            status: "error",
            content,
            activeRunId: null,
            activeRunEpoch: null,
            updatedAt: now,
          })
          .where(
            and(
              eq(tabularCells.reviewId, row.reviewId),
              eq(tabularCells.documentId, target.documentId),
              eq(tabularCells.columnIndex, target.columnIndex),
              or(isNull(tabularCells.activeRunId), eq(tabularCells.activeRunId, runId)),
            ),
          )
          .returning({ id: tabularCells.id });
        if (!cells.length) continue;
        await appendEventLocked(
          transaction,
          runId,
          `cell:error:${target.documentId}:${target.columnIndex}`,
          {
            type: "cell_update",
            document_id: target.documentId,
            column_index: target.columnIndex,
            content,
            status: "error",
          },
        );
      }
      const rows = await transaction
        .update(tabularRuns)
        .set({ status: "failed", error, updatedAt: now })
        .where(
          and(
            eq(tabularRuns.id, runId),
            eq(tabularRuns.status, "running"),
            eq(tabularRuns.executionEpoch, epoch),
          ),
        )
        .returning({ id: tabularRuns.id });
      if (!rows.length) throw new Error("Tabular run changed during final failure");
      return true;
    });
  }

  async failActiveRun(runId: string, error: string): Promise<boolean> {
    const [run] = await this.database
      .select({ epoch: tabularRuns.executionEpoch })
      .from(tabularRuns)
      .where(and(eq(tabularRuns.id, runId), eq(tabularRuns.status, "running")))
      .limit(1);
    return run ? this.failRun(runId, run.epoch, error) : false;
  }

  async cancelRun(runId: string): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      const [run] = await transaction
        .update(tabularRuns)
        .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
        .where(and(eq(tabularRuns.id, runId), inArray(tabularRuns.status, ["queued", "running"])))
        .returning({ epoch: tabularRuns.executionEpoch });
      if (!run) return false;
      await transaction
        .update(tabularCells)
        .set({
          status: "pending",
          content: null,
          activeRunId: null,
          activeRunEpoch: null,
          updatedAt: now,
        })
        .where(eq(tabularCells.activeRunId, runId));
      return true;
    });
  }

  async isRunCancelled(runId: string): Promise<boolean> {
    const [row] = await this.database
      .select({ status: tabularRuns.status })
      .from(tabularRuns)
      .where(eq(tabularRuns.id, runId))
      .limit(1);
    return row?.status === "cancelled";
  }

  async reserveUsage(input: ReserveUsageInput): Promise<boolean> {
    const rows = await this.database
      .update(tabularRuns)
      .set({
        usedModelCalls: sql`${tabularRuns.usedModelCalls} + ${input.calls}`,
        usedOutputTokens: sql`${tabularRuns.usedOutputTokens} + ${input.outputTokens}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tabularRuns.id, input.runId),
          eq(tabularRuns.status, "running"),
          eq(tabularRuns.executionEpoch, input.epoch),
          sql`${tabularRuns.usedModelCalls} + ${input.calls} <= ${input.maxCalls}`,
          sql`${tabularRuns.usedOutputTokens} + ${input.outputTokens} <= ${input.maxOutputTokens}`,
        ),
      )
      .returning({ id: tabularRuns.id });
    return rows.length === 1;
  }

  async appendRunEvent(
    runId: string,
    eventKey: string,
    event: PersistedTabularEvent,
    errorKind?: TabularCellErrorKind,
  ): Promise<number> {
    return this.database.transaction((transaction) =>
      appendEventLocked(transaction, runId, eventKey, event, errorKind),
    );
  }

  async listRunEvents(
    runId: string,
    afterSequence: number,
  ): Promise<readonly TabularRunEventRecord[]> {
    const rows = await this.database
      .select({
        sequence: tabularRunEvents.sequence,
        event: tabularRunEvents.event,
        errorKind: tabularRunEvents.errorKind,
      })
      .from(tabularRunEvents)
      .where(and(eq(tabularRunEvents.runId, runId), gt(tabularRunEvents.sequence, afterSequence)))
      .orderBy(asc(tabularRunEvents.sequence));
    return rows.flatMap(({ sequence, event, errorKind }) =>
      isStreamEvent(event) && isTabularGenerateEvent(event) && event.type === "cell_update"
        ? [{ sequence, event, errorKind: parseErrorKind(errorKind) }]
        : [],
    );
  }

  async markCellGenerating(input: CellTransitionInput): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      if (!(await lockActiveRun(transaction, input.runId, input.epoch))) return false;
      const rows = await transaction
        .update(tabularCells)
        .set({
          status: "generating",
          content: null,
          activeRunId: input.runId,
          activeRunEpoch: input.epoch,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tabularCells.reviewId, input.reviewId),
            eq(tabularCells.documentId, input.documentId),
            eq(tabularCells.columnIndex, input.columnIndex),
            or(isNull(tabularCells.activeRunId), eq(tabularCells.activeRunId, input.runId)),
          ),
        )
        .returning({ id: tabularCells.id });
      if (!rows.length) return false;
      await appendEventLocked(transaction, input.runId, input.eventKey, input.event);
      return true;
    });
  }

  async completeCell(input: CompleteCellInput): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      if (!(await lockActiveRun(transaction, input.runId, input.epoch))) return false;
      const rows = await transaction
        .update(tabularCells)
        .set({
          content: input.content,
          status: input.status,
          activeRunId: null,
          activeRunEpoch: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tabularCells.reviewId, input.reviewId),
            eq(tabularCells.documentId, input.documentId),
            eq(tabularCells.columnIndex, input.columnIndex),
            eq(tabularCells.activeRunId, input.runId),
            eq(tabularCells.activeRunEpoch, input.epoch),
          ),
        )
        .returning({ id: tabularCells.id });
      if (!rows.length) return false;
      await appendEventLocked(
        transaction,
        input.runId,
        input.eventKey,
        input.event,
        input.errorKind,
      );
      return true;
    });
  }
}

function runTargets(
  request: TabularRunRequest,
): readonly Readonly<{ documentId: string; columnIndex: number }>[] {
  if (request.operation === "regenerate-cell") {
    return [{ documentId: request.documentId, columnIndex: request.column.index }];
  }
  return request.targets.flatMap((target) =>
    target.columnIndexes.map((columnIndex) => ({
      documentId: target.documentId,
      columnIndex,
    })),
  );
}
