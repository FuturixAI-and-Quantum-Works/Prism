import assert from "node:assert/strict";
import test from "node:test";
import express, { type Express } from "express";
import type { AuthSession } from "../../src/auth/auth.js";
import { createAuthMiddleware, type AuthProfile } from "../../src/middleware/auth.js";

async function withServer(app: Express, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolveReady, reject) => {
    server.once("listening", resolveReady);
    server.once("error", reject);
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP test server");
    }
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolveClosed, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolveClosed();
      });
    });
  }
}

const session: AuthSession = {
  session: {
    id: "bf79db85-98a7-4298-bcab-c515564595b0",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    token: "test-session-token",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ipAddress: null,
    userAgent: null,
    userId: "091fea5d-4e37-41a6-bf29-1deee0f36b1b",
  },
  user: {
    id: "091fea5d-4e37-41a6-bf29-1deee0f36b1b",
    email: "USER@example.com",
    name: "User",
    emailVerified: true,
    image: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
};

test("requireSession extracts cookie sessions and never accepts bearer credentials", async () => {
  const profile: AuthProfile = {
    userId: session.user.id,
    role: "viewer",
    onboardingCompleted: false,
  };
  const middleware = createAuthMiddleware({
    async getSession(headers) {
      return headers.get("cookie")?.includes("better-auth.session_token=valid") ? session : null;
    },
    async getProfile() {
      return profile;
    },
  });
  const app = express();
  app.get("/session", middleware.requireSession, (_req, res) => {
    res.json({
      userId: res.locals.auth.user.id,
      userEmail: res.locals.auth.user.email,
      role: res.locals.auth.profile?.role,
    });
  });

  await withServer(app, async (baseUrl) => {
    const bearerOnly = await fetch(`${baseUrl}/session`, {
      headers: { Authorization: "Bearer legacy-token" },
    });
    assert.equal(bearerOnly.status, 401);

    const cookieSession = await fetch(`${baseUrl}/session`, {
      headers: { Cookie: "better-auth.session_token=valid" },
    });
    assert.equal(cookieSession.status, 200);
    assert.deepEqual(await cookieSession.json(), {
      userId: session.user.id,
      userEmail: session.user.email,
      role: "viewer",
    });
  });
});

test("requireAuth denies incomplete profiles and refreshes roles from storage", async () => {
  let role: AuthProfile["role"] = "viewer";
  const middleware = createAuthMiddleware({
    async getSession() {
      return session;
    },
    async getProfile() {
      return {
        userId: session.user.id,
        role,
        onboardingCompleted: true,
      };
    },
  });
  const app = express();
  app.get("/admin", middleware.requireRole("admin"), (_req, res) => res.sendStatus(204));

  const incomplete = createAuthMiddleware({
    async getSession() {
      return session;
    },
    async getProfile() {
      return null;
    },
  });
  app.get("/incomplete", incomplete.requireAuth, (_req, res) => res.sendStatus(204));

  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/incomplete`)).status, 403);
    assert.equal((await fetch(`${baseUrl}/admin`)).status, 403);
    role = "admin";
    assert.equal((await fetch(`${baseUrl}/admin`)).status, 204);
  });
});
