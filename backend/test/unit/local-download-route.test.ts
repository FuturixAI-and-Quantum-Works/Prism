import express from "express";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installAppConfig, parseAppConfig } from "../../src/config.js";
import { closeStorage, configureStorage, getSignedUrl, uploadFile } from "../../src/lib/storage.js";
import { downloadsRouter } from "../../src/modules/downloads/downloads.composition.js";
import { signLocalRead } from "../../src/storage/localSignedRead.js";
import { parseObjectRef, parseSignedReadTtl } from "../../src/storage/types.js";

const signingSecret = "89abcdef01234567".repeat(4);
let directory = "";
let origin = "";
let closeServer: (() => Promise<void>) | undefined;

describe("local object download gateway", () => {
  beforeAll(async () => {
    installAppConfig(
      parseAppConfig({
        NODE_ENV: "development",
        PORT: "3001",
        DATABASE_URL: "postgresql://prism:secret@localhost:5432/prism",
        FRONTEND_URL: "http://localhost:5173",
        BETTER_AUTH_URL: "http://localhost:3001",
        BETTER_AUTH_SECRET: "0123456789abcdef".repeat(4),
        AUTH_OTP_SECRET: "abcdef0123456789".repeat(4),
        AI_CREDENTIAL_ACTIVE_KEY_ID: "v1",
        AI_CREDENTIAL_ENCRYPTION_KEYS: JSON.stringify({
          v1: "fedcba9876543210".repeat(4),
        }),
        DOWNLOAD_SIGNING_SECRET: signingSecret,
      }),
    );
    const app = express();
    app.use("/download", downloadsRouter);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server address");
    origin = `http://127.0.0.1:${address.port}`;
    closeServer = () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    directory = await mkdtemp(path.join(tmpdir(), "prism-local-download-"));
    configureStorage({ kind: "local", directory, publicApiUrl: origin }, signingSecret);
    await uploadFile(
      "documents/user/document/source.txt",
      new TextEncoder().encode("private contents").buffer,
      "text/plain",
    );
  });

  afterAll(async () => {
    closeStorage();
    await closeServer?.();
    await rm(directory, { recursive: true, force: true });
  });

  it("serves signed bytes with safe response headers", async () => {
    const url = await getSignedUrl(
      "documents/user/document/source.txt",
      60,
      "review.txt",
      "inline",
    );
    if (!url) throw new Error("Expected signed URL");

    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(response.headers.get("content-disposition")).toContain("inline;");
    await expect(response.text()).resolves.toBe("private contents");
  });

  it("rejects expired and tampered bearer tokens", async () => {
    const expired = signLocalRead({
      ref: parseObjectRef("documents/user/document/source.txt"),
      ttl: parseSignedReadTtl(1),
      filename: "review.txt",
      disposition: "attachment",
      secret: signingSecret,
      now: 1,
    });
    await expect(fetch(`${origin}/download/local/${expired}`)).resolves.toMatchObject({
      status: 404,
    });
    await expect(fetch(`${origin}/download/local/${expired}tampered`)).resolves.toMatchObject({
      status: 404,
    });
  });
});
