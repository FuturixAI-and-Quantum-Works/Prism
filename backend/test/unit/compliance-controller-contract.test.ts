import type { Server } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createComplianceController } from "../../src/modules/compliance/compliance.controller.js";
import { ComplianceService } from "../../src/modules/compliance/compliance.service.js";
import type {
  ComplianceRun,
  PersistedComplianceEvent,
} from "../../src/modules/compliance/compliance.types.js";

const servers: Server[] = [];
const run: ComplianceRun = {
  id: "run-7",
  reviewId: "review-1",
  userId: "user-1",
  jobId: "job-1",
  idempotencyKey: "request-1",
  status: "running",
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  cancelledAt: null,
};

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

async function listen(service: ComplianceService): Promise<string> {
  const app = express();
  const controller = createComplianceController(service);
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.auth = {
      session: {
        id: "session-1",
        token: "token-1",
        userId: "user-1",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "user-1",
        email: "USER@EXAMPLE.COM",
        emailVerified: true,
        name: "User",
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      profile: {
        userId: "user-1",
        role: "admin",
        onboardingCompleted: true,
      },
    };
    next();
  });
  app.post("/compliance-review/:reviewId/run", controller.startRun);
  app.delete("/compliance-review/:reviewId/run", controller.cancelRun);

  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP server address");
  return `http://127.0.0.1:${address.port}`;
}

describe("compliance controller durable-run contract", () => {
  it("returns the canonical run header and ordered SSE event ids", async () => {
    const streamRun = vi.fn(
      async (
        _actor: unknown,
        _reviewId: string,
        input: {
          onEvent: (event: PersistedComplianceEvent, sequence: number) => void;
        },
      ) => {
        input.onEvent({ type: "status", status: "running" }, 4);
        input.onEvent({ type: "status", status: "completed" }, 5);
        return { kind: "completed" as const };
      },
    );
    const service: ComplianceService = Object.create(ComplianceService.prototype);
    service.enqueueRun = vi.fn(async () => run);
    service.streamRun = streamRun;
    const baseUrl = await listen(service);

    const response = await fetch(`${baseUrl}/compliance-review/review-1/run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "request-1",
      },
      body: "{}",
    });

    expect(response.headers.get("x-compliance-run-id")).toBe(run.id);
    await expect(response.text()).resolves.toBe(
      [
        "id: 4",
        'data: {"type":"status","status":"running"}',
        "",
        "id: 5",
        'data: {"type":"status","status":"completed"}',
        "",
        'data: {"type":"done"}',
        "",
        "",
      ].join("\n"),
    );
  });

  it("passes the requested run identity to cancellation", async () => {
    const cancelRun = vi.fn(async () => ({ ...run, status: "cancelled" as const }));
    const service: ComplianceService = Object.create(ComplianceService.prototype);
    service.cancelRun = cancelRun;
    const baseUrl = await listen(service);

    const response = await fetch(`${baseUrl}/compliance-review/review-1/run?run_id=requested-run`, {
      method: "DELETE",
    });

    expect(response.status).toBe(200);
    expect(cancelRun).toHaveBeenCalledWith(
      { userId: "user-1", email: "user@example.com" },
      "review-1",
      "requested-run",
    );
  });
});
