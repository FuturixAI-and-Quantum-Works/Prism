import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";
import { DrizzleTabularCellRepository } from "../../src/modules/tabular/tabular.cell.repository.js";
import { DrizzleTabularReviewRepository } from "../../src/modules/tabular/tabular.review.repository.js";
import {
  DrizzleTabularRunRepository,
  withBoundedRunCreationRetry,
} from "../../src/modules/tabular/tabular.run.repository.js";

const databaseSchema = `
  CREATE TABLE users (
    id uuid PRIMARY KEY,
    email varchar(255) NOT NULL,
    full_name varchar(255) NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    display_name varchar(255),
    role text DEFAULT 'user' NOT NULL
  );
  CREATE TABLE jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind varchar(120) NOT NULL,
    status text DEFAULT 'queued' NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    idempotency_key varchar(255),
    actor_user_id uuid,
    priority integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    available_at timestamp DEFAULT now() NOT NULL,
    locked_by varchar(255),
    locked_until timestamp,
    completed_at timestamp,
    cancelled_at timestamp,
    last_error text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(idempotency_key)
  );
  CREATE TABLE tabular_reviews (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    project_id uuid,
    workflow_id uuid,
    title varchar(500),
    columns_config jsonb,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE tabular_review_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES tabular_reviews(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    email varchar(255) NOT NULL,
    role text NOT NULL,
    shared_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(review_id, email)
  );
  CREATE TABLE tabular_review_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES tabular_reviews(id) ON DELETE CASCADE,
    document_id uuid NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(review_id, document_id),
    UNIQUE(review_id, sort_order)
  );
  CREATE TABLE tabular_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES tabular_reviews(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
    idempotency_key varchar(255) NOT NULL,
    operation varchar(30) NOT NULL,
    request jsonb NOT NULL,
    request_hash varchar(64) NOT NULL,
    status varchar(20) DEFAULT 'queued' NOT NULL,
    error text,
    execution_epoch integer DEFAULT 0 NOT NULL,
    next_sequence integer DEFAULT 1 NOT NULL,
    used_model_calls integer DEFAULT 0 NOT NULL,
    used_output_tokens integer DEFAULT 0 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    completed_at timestamp,
    cancelled_at timestamp,
    UNIQUE(review_id, user_id, operation, idempotency_key),
    UNIQUE(job_id)
  );
  CREATE TABLE tabular_cells (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES tabular_reviews(id) ON DELETE CASCADE,
    document_id uuid NOT NULL,
    column_index integer NOT NULL,
    content jsonb,
    status varchar(50) DEFAULT 'pending',
    active_run_id uuid,
    active_run_epoch integer,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(review_id, document_id, column_index)
  );
  CREATE TABLE tabular_run_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES tabular_runs(id) ON DELETE CASCADE,
    sequence integer NOT NULL,
    event_key varchar(255) NOT NULL,
    event jsonb NOT NULL,
    error_kind varchar(40),
    created_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(run_id, event_key),
    UNIQUE(run_id, sequence)
  );
  CREATE UNIQUE INDEX tabular_runs_active_review_idx
    ON tabular_runs(review_id)
    WHERE status IN ('queued', 'running');
`;

describe("DrizzleTabularRunRepository run ledger", () => {
  let pglite: PGlite;
  let repository: DrizzleTabularRunRepository;
  let cells: DrizzleTabularCellRepository;
  let reviews: DrizzleTabularReviewRepository;
  const userId = "00000000-0000-4000-8000-000000000001";
  const reviewId = "00000000-0000-4000-8000-000000000002";

  beforeEach(async () => {
    pglite = new PGlite();
    await pglite.exec(databaseSchema);
    await pglite.query(
      "INSERT INTO users (id, email, full_name) VALUES ($1, 'user@example.com', 'User')",
      [userId],
    );
    await pglite.query(
      "INSERT INTO tabular_reviews (id, user_id, columns_config) VALUES ($1, $2, '[]')",
      [reviewId, userId],
    );
    const database = drizzle(pglite, { schema });
    repository = new DrizzleTabularRunRepository(database);
    cells = new DrizzleTabularCellRepository(database);
    reviews = new DrizzleTabularReviewRepository(database);
  });

  afterEach(async () => {
    await pglite.close();
  });

  it("retries a vanished active-run conflict within a fixed bound", async () => {
    let attempts = 0;
    await expect(
      withBoundedRunCreationRetry(async () => {
        attempts += 1;
        return attempts === 3 ? "created" : null;
      }),
    ).resolves.toBe("created");
    expect(attempts).toBe(3);

    attempts = 0;
    await expect(
      withBoundedRunCreationRetry(async () => {
        attempts += 1;
        return null;
      }),
    ).rejects.toThrow("concurrent lifecycle changes");
    expect(attempts).toBe(3);
  });

  it("replaces tabular review shares with normalized identity and role rows", async () => {
    const collaboratorId = "00000000-0000-4000-8000-000000000004";
    await pglite.query(
      "INSERT INTO users (id, email, full_name) VALUES ($1, 'editor@example.com', 'Editor')",
      [collaboratorId],
    );
    await reviews.updateReview({
      reviewId,
      updates: {},
      shareReplacement: {
        sharedByUserId: userId,
        shares: [
          { email: "editor@example.com", role: "editor" },
          { email: "pending@example.com", role: "viewer" },
        ],
      },
    });
    await expect(
      pglite.query(
        "SELECT user_id, email, role, shared_by_user_id FROM tabular_review_shares ORDER BY email",
      ),
    ).resolves.toMatchObject({
      rows: [
        {
          user_id: collaboratorId,
          email: "editor@example.com",
          role: "editor",
          shared_by_user_id: userId,
        },
        {
          user_id: null,
          email: "pending@example.com",
          role: "viewer",
          shared_by_user_id: userId,
        },
      ],
    });

    await reviews.updateReview({
      reviewId,
      updates: {},
      shareReplacement: {
        sharedByUserId: userId,
        shares: [{ email: "editor@example.com", role: "admin" }],
      },
    });
    await expect(
      pglite.query("SELECT email, role FROM tabular_review_shares"),
    ).resolves.toMatchObject({
      rows: [{ email: "editor@example.com", role: "admin" }],
    });
  });

  it("deduplicates runs and event keys while preserving event order", async () => {
    const input = {
      reviewId,
      userId,
      idempotencyKey: "request-1",
      request: {
        operation: "generate" as const,
        sourceDocumentIds: [],
        columns: [],
        targets: [],
        requestedModel: null,
      },
      requestHash: "hash-1",
    };
    const { run: first } = await repository.createOrGetRun(input);
    expect(first.jobId).not.toBeNull();
    await expect(
      pglite.query(
        "SELECT kind, payload, idempotency_key, actor_user_id, priority, max_attempts, status FROM jobs WHERE id = $1",
        [first.jobId],
      ),
    ).resolves.toMatchObject({
      rows: [
        {
          kind: "tabular.generate",
          payload: { runId: first.id },
          idempotency_key: `tabular.generate:${first.id}`,
          actor_user_id: userId,
          priority: 0,
          max_attempts: 3,
          status: "queued",
        },
      ],
    });
    const { run: duplicate } = await repository.createOrGetRun(input);
    expect(duplicate.id).toBe(first.id);
    const generating = {
      type: "cell_update" as const,
      document_id: "00000000-0000-4000-8000-000000000003",
      column_index: 0,
      content: null,
      status: "generating" as const,
    };
    const firstSequence = await repository.appendRunEvent(first.id, "cell:generating", generating);
    await expect(repository.appendRunEvent(first.id, "cell:generating", generating)).resolves.toBe(
      firstSequence,
    );
    const doneSequence = await repository.appendRunEvent(first.id, "cell:done", {
      ...generating,
      status: "done",
      content: { summary: "Value" },
    });
    await expect(repository.listRunEvents(first.id, firstSequence)).resolves.toEqual([
      {
        sequence: doneSequence,
        event: { ...generating, status: "done", content: { summary: "Value" } },
        errorKind: null,
      },
    ]);
    const claim = await repository.claimRun(first.id);
    if (!claim) throw new Error("Run was not claimed");
    await repository.completeRun(first.id, claim.epoch);
    const { run: other } = await repository.createOrGetRun({
      ...input,
      idempotencyKey: "request-other",
      requestHash: "hash-other",
    });
    await expect(repository.appendRunEvent(other.id, "cell:generating", generating)).resolves.toBe(
      1,
    );
  });

  it("reconciles a queued run whose deterministic job is missing", async () => {
    const { run } = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "missing-job",
      request: {
        operation: "generate",
        sourceDocumentIds: [],
        columns: [],
        targets: [],
        requestedModel: null,
      },
      requestHash: "missing-job",
    });
    await pglite.query("DELETE FROM jobs WHERE id = $1", [run.jobId]);
    const reconciled = await repository.ensureRunJob(run.id);
    expect(reconciled.jobId).not.toBeNull();
    expect(reconciled.jobId).not.toBe(run.jobId);
    await expect(
      pglite.query("SELECT idempotency_key, status FROM jobs WHERE id = $1", [reconciled.jobId]),
    ).resolves.toMatchObject({
      rows: [{ idempotency_key: `tabular.generate:${run.id}`, status: "queued" }],
    });
  });

  it("attaches an already claimed deterministic job to a running run", async () => {
    const { run } = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "running-job",
      request: {
        operation: "generate",
        sourceDocumentIds: [],
        columns: [],
        targets: [],
        requestedModel: null,
      },
      requestHash: "running-job",
    });
    await pglite.query("UPDATE jobs SET status = 'running' WHERE id = $1", [run.jobId]);
    await pglite.query("UPDATE tabular_runs SET status = 'running', job_id = NULL WHERE id = $1", [
      run.id,
    ]);
    const reconciled = await repository.ensureRunJob(run.id);
    expect(reconciled).toMatchObject({ status: "running", jobId: run.jobId });
    await expect(
      pglite.query("SELECT COUNT(*)::int AS count FROM jobs WHERE idempotency_key = $1", [
        `tabular.generate:${run.id}`,
      ]),
    ).resolves.toMatchObject({ rows: [{ count: 1 }] });
  });

  it("rejects an idempotency key reused with a different request hash", async () => {
    const input = {
      reviewId,
      userId,
      idempotencyKey: "request-conflict",
      request: {
        operation: "generate" as const,
        sourceDocumentIds: [],
        columns: [],
        targets: [],
        requestedModel: null,
      },
      requestHash: "hash-a",
    };
    await repository.createOrGetRun(input);
    await expect(repository.createOrGetRun({ ...input, requestHash: "hash-b" })).rejects.toThrow(
      "different request",
    );
  });

  it("does not let completion overwrite cancellation", async () => {
    const { run } = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "request-2",
      request: {
        operation: "generate",
        sourceDocumentIds: [],
        columns: [],
        targets: [],
        requestedModel: null,
      },
      requestHash: "hash-2",
    });
    const claim = await repository.claimRun(run.id);
    if (!claim) throw new Error("Run was not claimed");
    await expect(repository.cancelRun(run.id)).resolves.toBe(true);
    await expect(repository.completeRun(run.id, claim.epoch)).resolves.toBe(false);
  });

  it("rejects stale cell transitions and resets only the cancelled attempt", async () => {
    const documentId = "00000000-0000-4000-8000-000000000003";
    await pglite.query(
      "INSERT INTO tabular_cells (review_id, document_id, column_index) VALUES ($1, $2, 0)",
      [reviewId, documentId],
    );
    const { run } = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "request-3",
      request: {
        operation: "generate",
        sourceDocumentIds: [documentId],
        columns: [{ index: 0, name: "Term", prompt: "Extract" }],
        targets: [{ documentId, columnIndexes: [0] }],
        requestedModel: null,
      },
      requestHash: "hash-3",
    });
    const first = await repository.claimRun(run.id);
    if (!first) throw new Error("Run was not claimed");
    await expect(
      repository.markCellGenerating({
        reviewId,
        documentId,
        columnIndex: 0,
        runId: run.id,
        epoch: first.epoch,
        eventKey: "cell:generating",
        event: {
          type: "cell_update",
          document_id: documentId,
          column_index: 0,
          content: null,
          status: "generating",
        },
      }),
    ).resolves.toBe(true);
    const second = await repository.claimRun(run.id);
    if (!second) throw new Error("Run retry was not claimed");
    expect(await cells.findCell(reviewId, documentId, 0)).toMatchObject({
      status: "pending",
      activeRunId: null,
      activeRunEpoch: null,
    });
    await expect(
      repository.completeCell({
        reviewId,
        documentId,
        columnIndex: 0,
        runId: run.id,
        epoch: first.epoch,
        content: { summary: "stale", flag: "red", reasoning: "stale" },
        status: "done",
        eventKey: "cell:done",
        event: {
          type: "cell_update",
          document_id: documentId,
          column_index: 0,
          content: { summary: "stale", flag: "red", reasoning: "stale" },
          status: "done",
        },
      }),
    ).resolves.toBe(false);
    await repository.markCellGenerating({
      reviewId,
      documentId,
      columnIndex: 0,
      runId: run.id,
      epoch: second.epoch,
      eventKey: "cell:generating",
      event: {
        type: "cell_update",
        document_id: documentId,
        column_index: 0,
        content: null,
        status: "generating",
      },
    });
    await repository.cancelRun(run.id);
    const cell = await cells.findCell(reviewId, documentId, 0);
    expect(cell).toMatchObject({
      status: "pending",
      content: null,
      activeRunId: null,
      activeRunEpoch: null,
    });
    await expect(
      repository.completeCell({
        reviewId,
        documentId,
        columnIndex: 0,
        runId: run.id,
        epoch: second.epoch,
        content: { summary: "late", flag: "green", reasoning: "late" },
        status: "done",
        eventKey: "cell:late",
        event: {
          type: "cell_update",
          document_id: documentId,
          column_index: 0,
          content: { summary: "late", flag: "green", reasoning: "late" },
          status: "done",
        },
      }),
    ).resolves.toBe(false);
  });

  it("serializes active runs per review while preserving same-key idempotency", async () => {
    const documentId = "00000000-0000-4000-8000-000000000005";
    const request = {
      operation: "generate" as const,
      sourceDocumentIds: [documentId],
      columns: [{ index: 0, name: "Term", prompt: "Extract" }],
      targets: [{ documentId, columnIndexes: [0] }],
      requestedModel: null,
    };
    const input = {
      reviewId,
      userId,
      idempotencyKey: "overlap-1",
      request,
      requestHash: "overlap-1",
    };
    const [first, duplicate] = await Promise.all([
      repository.createOrGetRun(input),
      repository.createOrGetRun(input),
    ]);
    expect(duplicate.run.id).toBe(first.run.id);
    await expect(
      repository.createOrGetRun({
        ...input,
        idempotencyKey: "overlap-2",
        requestHash: "overlap-2",
      }),
    ).rejects.toThrow("already active");
  });

  it("turns clear-cell fence loss into a failed run without touching another owner", async () => {
    const documentId = "00000000-0000-4000-8000-000000000006";
    await pglite.query(
      "INSERT INTO tabular_cells (review_id, document_id, column_index) VALUES ($1, $2, 0)",
      [reviewId, documentId],
    );
    const { run } = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "clear-fence",
      request: {
        operation: "generate",
        sourceDocumentIds: [documentId],
        columns: [{ index: 0, name: "Term", prompt: "Extract" }],
        targets: [{ documentId, columnIndexes: [0] }],
        requestedModel: null,
      },
      requestHash: "clear-fence",
    });
    const claim = await repository.claimRun(run.id);
    if (!claim) throw new Error("Run was not claimed");
    await repository.markCellGenerating({
      reviewId,
      documentId,
      columnIndex: 0,
      runId: run.id,
      epoch: claim.epoch,
      eventKey: "cell:generating",
      event: {
        type: "cell_update",
        document_id: documentId,
        column_index: 0,
        content: null,
        status: "generating",
      },
    });
    await cells.clearCells(reviewId, [documentId]);
    await expect(
      repository.completeCell({
        reviewId,
        documentId,
        columnIndex: 0,
        runId: run.id,
        epoch: claim.epoch,
        content: { summary: "late", flag: "green", reasoning: "" },
        status: "done",
        eventKey: "cell:done",
        event: {
          type: "cell_update",
          document_id: documentId,
          column_index: 0,
          content: { summary: "late", flag: "green", reasoning: "" },
          status: "done",
        },
      }),
    ).resolves.toBe(false);
    await expect(repository.failRun(run.id, claim.epoch, "lost cell ownership")).resolves.toBe(
      true,
    );
    await expect(repository.findRun(run.id, reviewId, userId)).resolves.toMatchObject({
      status: "failed",
    });
  });

  it("terminalizes every unresolved request target after a final retry failure", async () => {
    const documentId = "00000000-0000-4000-8000-000000000004";
    await pglite.query(
      "INSERT INTO tabular_cells (review_id, document_id, column_index) VALUES ($1, $2, 0), ($1, $2, 1), ($1, $2, 2)",
      [reviewId, documentId],
    );
    const { run } = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "request-4",
      request: {
        operation: "generate",
        sourceDocumentIds: [documentId],
        columns: [
          { index: 0, name: "Term", prompt: "Extract" },
          { index: 1, name: "Price", prompt: "Extract" },
          { index: 2, name: "Party", prompt: "Extract" },
        ],
        targets: [{ documentId, columnIndexes: [0, 1, 2] }],
        requestedModel: null,
      },
      requestHash: "hash-4",
    });
    const firstClaim = await repository.claimRun(run.id);
    if (!firstClaim) throw new Error("Run was not claimed");
    await repository.markCellGenerating({
      reviewId,
      documentId,
      columnIndex: 0,
      runId: run.id,
      epoch: firstClaim.epoch,
      eventKey: "cell:generating",
      event: {
        type: "cell_update",
        document_id: documentId,
        column_index: 0,
        content: null,
        status: "generating",
      },
    });
    await repository.completeCell({
      reviewId,
      documentId,
      columnIndex: 0,
      runId: run.id,
      epoch: firstClaim.epoch,
      content: { summary: "12 months", flag: "green", reasoning: "Clause 4" },
      status: "done",
      eventKey: "cell:done:0",
      event: {
        type: "cell_update",
        document_id: documentId,
        column_index: 0,
        content: { summary: "12 months", flag: "green", reasoning: "Clause 4" },
        status: "done",
      },
    });
    await repository.markCellGenerating({
      reviewId,
      documentId,
      columnIndex: 1,
      runId: run.id,
      epoch: firstClaim.epoch,
      eventKey: "cell:generating:1",
      event: {
        type: "cell_update",
        document_id: documentId,
        column_index: 1,
        content: null,
        status: "generating",
      },
    });
    const claim = await repository.claimRun(run.id);
    if (!claim) throw new Error("Run retry was not claimed");
    await repository.markCellGenerating({
      reviewId,
      documentId,
      columnIndex: 2,
      runId: run.id,
      epoch: claim.epoch,
      eventKey: "cell:generating:2",
      event: {
        type: "cell_update",
        document_id: documentId,
        column_index: 2,
        content: null,
        status: "generating",
      },
    });
    await expect(repository.failRun(run.id, claim.epoch, "provider unavailable")).resolves.toBe(
      true,
    );
    expect(await cells.findCell(reviewId, documentId, 0)).toMatchObject({
      status: "done",
      content: {
        summary: "12 months",
        flag: "green",
        reasoning: "Clause 4",
      },
    });
    for (const columnIndex of [1, 2]) {
      expect(await cells.findCell(reviewId, documentId, columnIndex)).toMatchObject({
        status: "error",
        content: {
          summary: "",
          flag: "red",
          reasoning: "provider unavailable",
        },
        activeRunId: null,
        activeRunEpoch: null,
      });
    }
    const terminalEvents = (await repository.listRunEvents(run.id, 0)).filter(
      ({ event }) => event.status === "done" || event.status === "error",
    );
    expect(
      terminalEvents.map(({ sequence, event }) => [sequence, event.column_index, event.status]),
    ).toEqual([
      [2, 0, "done"],
      [5, 1, "error"],
      [6, 2, "error"],
    ]);
    expect(terminalEvents.slice(1).map(({ errorKind }) => errorKind)).toEqual([null, null]);
    await expect(repository.findRun(run.id, reviewId, userId)).resolves.toMatchObject({
      status: "failed",
      error: "provider unavailable",
    });
  });
});
