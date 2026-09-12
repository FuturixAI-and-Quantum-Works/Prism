import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";
import {
  createDrizzleComplianceRepository,
  type ComplianceRepository,
} from "../../src/modules/compliance/compliance.repository.js";

const databaseSchema = `
  CREATE TABLE users (
    id uuid PRIMARY KEY,
    email varchar(255) NOT NULL,
    full_name varchar(255) NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE compliance_reviews (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    project_id uuid,
    workspace_id uuid,
    primary_document_id uuid,
    title varchar(255),
    status text DEFAULT 'pending' NOT NULL,
    compliance_score integer,
    results jsonb,
    ai_insights jsonb,
    rag_collection_name varchar(255),
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE jobs (
    id uuid PRIMARY KEY,
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
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE compliance_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES compliance_reviews(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
    idempotency_key varchar(255) NOT NULL,
    status varchar(20) DEFAULT 'queued' NOT NULL,
    error text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    completed_at timestamp,
    cancelled_at timestamp,
    UNIQUE(review_id, user_id, idempotency_key),
    UNIQUE(job_id)
  );
  CREATE TABLE compliance_run_events (
    sequence serial PRIMARY KEY,
    run_id uuid NOT NULL REFERENCES compliance_runs(id) ON DELETE CASCADE,
    event_key varchar(255) NOT NULL,
    event jsonb NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(run_id, event_key)
  );
  CREATE TABLE attention_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    source_type text NOT NULL,
    source_id uuid,
    secondary_source_id uuid,
    severity varchar(20) NOT NULL,
    title varchar(500) NOT NULL,
    description text,
    metadata jsonb,
    status text DEFAULT 'pending' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    resolved_at timestamp
  );
  CREATE TABLE user_activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    action varchar(80) NOT NULL,
    resource_type varchar(50),
    resource_id uuid,
    resource_name varchar(500),
    actor_user_id uuid,
    actor_name varchar(255),
    details jsonb,
    created_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    icon text DEFAULT 'system' NOT NULL,
    title varchar(255) NOT NULL,
    description text,
    read boolean DEFAULT false NOT NULL,
    on_email boolean DEFAULT false NOT NULL,
    email_sent_at timestamp,
    link text,
    resource_type varchar(50),
    resource_id uuid,
    actor_user_id uuid,
    metadata jsonb,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
`;

describe("compliance run repository", () => {
  let pglite: PGlite;
  let repository: ComplianceRepository;
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
      "INSERT INTO compliance_reviews (id, user_id, primary_document_id) VALUES ($1, $2, $3)",
      [reviewId, userId, "00000000-0000-4000-8000-000000000003"],
    );
    repository = createDrizzleComplianceRepository(drizzle(pglite, { schema }));
  });

  afterEach(async () => {
    await pglite.close();
  });

  async function completeWithScore(complianceScore: number | null, reviewTitle: string) {
    const primaryDocumentId = "00000000-0000-4000-8000-000000000003";
    const run = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: `score-${complianceScore}`,
    });
    await repository.markRunRunning(run.id);
    await expect(
      repository.completeReviewRun({
        runId: run.id,
        reviewId,
        complianceScore,
        summary: { compliance_score: complianceScore },
        insights: [],
        reviewTitle,
        primaryDocumentId,
        userId,
        nonCompliantCount: 0,
        partialCount: 0,
        compliantCount: 0,
        rules: [],
        questions: [],
      }),
    ).resolves.toBe(true);
    return pglite.query<{
      description: string | null;
      metadata: {
        score: number | null;
        hasCriticalIssues: boolean;
        documentName: string;
      };
    }>("SELECT description, metadata FROM notifications WHERE resource_id = $1", [
      primaryDocumentId,
    ]);
  }

  it("deduplicates a run and each durable event", async () => {
    const input = { reviewId, userId, idempotencyKey: "request-1" };
    const first = await repository.createOrGetRun(input);
    const duplicate = await repository.createOrGetRun(input);

    expect(duplicate.id).toBe(first.id);
    const firstSequence = await repository.appendRunEvent(first.id, "status:running", {
      type: "status",
      status: "running",
    });
    const duplicateSequence = await repository.appendRunEvent(first.id, "status:running", {
      type: "status",
      status: "running",
    });
    expect(duplicateSequence).toBe(firstSequence);
    await expect(repository.listRunEvents(first.id, 0)).resolves.toEqual([
      { sequence: firstSequence, event: { type: "status", status: "running" } },
    ]);
  });

  it("replays events in sequence after the requested cursor", async () => {
    const run = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "request-event-order",
    });
    const runningSequence = await repository.appendRunEvent(run.id, "status:running", {
      type: "status",
      status: "running",
    });
    const activitySequence = await repository.appendRunEvent(run.id, "activity:started", {
      type: "activity",
      action: "Started",
      timestamp: new Date().toISOString(),
      user: "System",
    });
    const summarySequence = await repository.appendRunEvent(run.id, "status:completed", {
      type: "status",
      status: "completed",
    });

    await expect(repository.listRunEvents(run.id, runningSequence)).resolves.toEqual([
      {
        sequence: activitySequence,
        event: expect.objectContaining({ type: "activity", action: "Started" }),
      },
      {
        sequence: summarySequence,
        event: { type: "status", status: "completed" },
      },
    ]);
  });

  it("prevents cancellation from being overwritten by completion", async () => {
    const run = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "request-2",
    });
    await repository.markRunRunning(run.id);
    await expect(repository.markRunCancelled(run.id)).resolves.toBe(true);
    await expect(
      repository.completeReviewRun({
        runId: run.id,
        reviewId,
        complianceScore: 100,
        summary: { compliance_score: 100 },
        insights: [],
        reviewTitle: "Review",
        primaryDocumentId: null,
        userId,
        nonCompliantCount: 0,
        partialCount: 0,
        compliantCount: 0,
        rules: [],
        questions: [],
      }),
    ).resolves.toBe(false);
  });

  it("rejects an invalid running transition without changing the review", async () => {
    const run = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "request-3",
    });
    await pglite.query("UPDATE compliance_runs SET status = 'failed' WHERE id = $1", [run.id]);

    await expect(repository.markRunRunning(run.id)).rejects.toThrow("Compliance run not found");
    const review = await pglite.query<{ status: string }>(
      "SELECT status FROM compliance_reviews WHERE id = $1",
      [reviewId],
    );
    expect(review.rows[0]?.status).toBe("pending");
  });

  it("commits completion state and user-facing side effects together", async () => {
    const run = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "request-4",
    });
    await repository.markRunRunning(run.id);
    const now = new Date();

    await expect(
      repository.completeReviewRun({
        runId: run.id,
        reviewId,
        complianceScore: 50,
        summary: { compliance_score: 50 },
        insights: ["Review the termination clause"],
        reviewTitle: "Vendor Contract",
        primaryDocumentId: "00000000-0000-4000-8000-000000000003",
        userId,
        nonCompliantCount: 1,
        partialCount: 0,
        compliantCount: 0,
        rules: [
          {
            id: "00000000-0000-4000-8000-000000000004",
            reviewId,
            content: "The agreement must define termination rights.",
            status: "non_compliant",
            result: { summary: "Termination rights are absent." },
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
          },
        ],
        questions: [],
      }),
    ).resolves.toBe(true);

    const [storedRun, review, events, activity, attention, notification] = await Promise.all([
      repository.findRun(run.id, reviewId, userId),
      pglite.query<{ status: string }>("SELECT status FROM compliance_reviews WHERE id = $1", [
        reviewId,
      ]),
      repository.listRunEvents(run.id, 0),
      pglite.query("SELECT id FROM user_activity WHERE resource_id = $1", [reviewId]),
      pglite.query("SELECT id FROM attention_items WHERE source_id = $1", [reviewId]),
      pglite.query("SELECT id FROM notifications WHERE resource_id = $1", [
        "00000000-0000-4000-8000-000000000003",
      ]),
    ]);
    expect(storedRun).toMatchObject({ status: "completed" });
    expect(review.rows[0]?.status).toBe("completed");
    expect(events).toEqual([
      { sequence: expect.any(Number), event: { type: "status", status: "completed" } },
    ]);
    expect(activity.rows).toHaveLength(1);
    expect(attention.rows).toHaveLength(1);
    expect(notification.rows).toHaveLength(1);
  });

  it("describes an unavailable score without fabricating zero", async () => {
    const notification = await completeWithScore(null, "Question Review");

    expect(notification.rows).toEqual([
      {
        description:
          'Compliance review for "Question Review" completed. Compliance score unavailable because no scorable rules were evaluated.',
        metadata: {
          score: null,
          hasCriticalIssues: false,
          documentName: "Question Review",
        },
      },
    ]);
  });

  it("preserves a real zero score in notification text and metadata", async () => {
    const notification = await completeWithScore(0, "Failed Rules Review");

    expect(notification.rows).toEqual([
      {
        description: 'Compliance review for "Failed Rules Review" completed with a score of 0%',
        metadata: {
          score: 0,
          hasCriticalIssues: false,
          documentName: "Failed Rules Review",
        },
      },
    ]);
  });

  it("commits terminal failure state and event atomically", async () => {
    const run = await repository.createOrGetRun({
      reviewId,
      userId,
      idempotencyKey: "request-5",
    });
    await repository.markRunRunning(run.id);

    await expect(repository.failReviewRun(run.id, reviewId, "provider failed")).resolves.toBe(true);
    await expect(repository.markRunCancelled(run.id)).resolves.toBe(false);

    const [storedRun, review, events] = await Promise.all([
      repository.findRun(run.id, reviewId, userId),
      pglite.query<{ status: string }>("SELECT status FROM compliance_reviews WHERE id = $1", [
        reviewId,
      ]),
      repository.listRunEvents(run.id, 0),
    ]);
    expect(storedRun).toMatchObject({ status: "failed", error: "provider failed" });
    expect(review.rows[0]?.status).toBe("failed");
    expect(events).toEqual([
      { sequence: expect.any(Number), event: { type: "status", status: "failed" } },
    ]);
  });
});
