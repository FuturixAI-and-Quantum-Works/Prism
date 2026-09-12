import type { Server } from "node:http";
import { readFile } from "node:fs/promises";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createApplication, type ApplicationDependencies } from "../../src/app.js";
import { parseAppConfig } from "../../src/config.js";
import type { TemplateEmailInput } from "../../src/lib/email.js";

const config = parseAppConfig({
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://prism:secret@localhost:5432/prism",
  BETTER_AUTH_SECRET: "0123456789abcdef".repeat(4),
  AUTH_OTP_SECRET: "abcdef0123456789".repeat(4),
  AI_CREDENTIAL_ACTIVE_KEY_ID: "v1",
  AI_CREDENTIAL_ENCRYPTION_KEYS: JSON.stringify({
    v1: "fedcba9876543210".repeat(4),
  }),
  DOWNLOAD_SIGNING_SECRET: "89abcdef01234567".repeat(4),
});

const servers: Server[] = [];

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

function dependencies(
  authBodyStates: unknown[],
  queuedEmails: TemplateEmailInput[] = [],
): ApplicationDependencies {
  const probe = express.Router();
  probe.post("/body", (req, res) => res.json({ body: req.body }));
  return {
    authHandler(req, res) {
      authBodyStates.push(req.body);
      res.sendStatus(204);
    },
    authGuard(_req, res, next) {
      res.locals.auth = {
        user: {
          id: "00000000-0000-4000-8000-000000000002",
          email: "admin@example.com",
        },
      };
      next();
    },
    routes: [{ path: "/probe", router: probe }],
    isAdmin: async () => true,
    enqueueEmailTest: async (email) => {
      queuedEmails.push(email);
      return "00000000-0000-4000-8000-000000000001";
    },
    swagger: {
      serve: [],
      setup: (_req, _res, next) => next(),
    },
  };
}

async function listen(app: ReturnType<typeof createApplication>): Promise<string> {
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

describe("createApplication", () => {
  it("is import-safe and leaves process ownership to the entrypoint", async () => {
    const source = await readFile(new URL("../../src/app.ts", import.meta.url), "utf8");
    const entrypoint = await readFile(new URL("../../src/index.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/process\.env|\.listen\(|setTimeout\(|node-cron/);
    expect(entrypoint).not.toMatch(/healthScheduler|node-cron|queueRagIndex/);
  });

  it("keeps the worker separate from the HTTP listener", async () => {
    const source = await readFile(new URL("../../src/worker.ts", import.meta.url), "utf8");

    expect(source).toMatch(/startQueueWorker/);
    expect(source).not.toMatch(/\.listen\(/);
  });

  it("mounts auth before JSON parsing and preserves routes and health", async () => {
    const authBodyStates: unknown[] = [];
    const baseUrl = await listen(createApplication(config, dependencies(authBodyStates)));

    const authResponse = await fetch(`${baseUrl}/auth/sign-in`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });
    const routeResponse = await fetch(`${baseUrl}/probe/body`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: 42 }),
    });
    const healthResponse = await fetch(`${baseUrl}/health`);

    expect(authResponse.status).toBe(204);
    expect(authBodyStates).toEqual([undefined]);
    await expect(routeResponse.json()).resolves.toEqual({ body: { value: 42 } });
    await expect(healthResponse.json()).resolves.toEqual({ ok: true });
  });

  it("queues the admin email probe", async () => {
    const queuedEmails: TemplateEmailInput[] = [];
    const baseUrl = await listen(createApplication(config, dependencies([], queuedEmails)));
    const response = await fetch(`${baseUrl}/health/email/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "recipient@example.com" }),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "queued",
      outbox_event_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(queuedEmails[0]?.data.body).toBe(
      "This message tests the configured Prism Legal email provider.",
    );
  });
});
