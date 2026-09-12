import { describe, expect, it } from "vitest";
import { parseAppConfig } from "../../src/config.js";

const aiCredentialKey = "fedcba9876543210".repeat(4);
const validProductionEnvironment = {
  NODE_ENV: "production",
  PORT: "3001",
  DATABASE_URL: "postgresql://prism:secret@database.example.com:5432/prism",
  FRONTEND_URL: "https://app.example.com",
  BETTER_AUTH_URL: "https://api.example.com",
  BETTER_AUTH_SECRET: "0123456789abcdef".repeat(4),
  AUTH_OTP_SECRET: "abcdef0123456789".repeat(4),
  AI_CREDENTIAL_ACTIVE_KEY_ID: "v1",
  AI_CREDENTIAL_ENCRYPTION_KEYS: JSON.stringify({ v1: aiCredentialKey }),
  DOWNLOAD_SIGNING_SECRET: "89abcdef01234567".repeat(4),
} as const;

describe("parseAppConfig", () => {
  it("returns one deeply immutable domain object", () => {
    const config = parseAppConfig(validProductionEnvironment);

    expect(config.runtime.kind).toBe("production");
    expect(config.auth.trustedOrigins).toEqual(["https://app.example.com"]);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.runtime)).toBe(true);
    expect(Object.isFrozen(config.runtime.rateLimits)).toBe(true);
    expect(Object.isFrozen(config.auth.trustedOrigins)).toBe(true);
    expect(config.conversion).toEqual({
      service: { kind: "disabled" },
      libreOfficePath: "libreoffice",
      maxInputBytes: 50 * 1024 * 1024,
      maxOutputBytes: 100 * 1024 * 1024,
      timeoutMs: 60_000,
      concurrency: 2,
      maxQueuedPerAdapter: 32,
      allowChromiumNoSandbox: false,
    });
    expect(config.worker).toEqual({
      concurrency: 4,
      pollIntervalMs: 1_000,
      leaseDurationMs: 60_000,
      shutdownTimeoutMs: 10_000,
      healthCheckUrl: "https://api.example.com/health",
      healthCheckIntervalMs: 6 * 60 * 60_000,
      healthCleanupIntervalMs: 7 * 24 * 60 * 60_000,
      healthRetentionDays: 120,
    });
    expect(config.ai.credentialEncryption).toEqual({
      activeKeyId: "v1",
      keys: { v1: aiCredentialKey },
    });
    expect(config.ai.allowLocalHttpCustomEndpoints).toBe(false);
  });

  it.each([
    [{ NODE_ENV: "prod" }, /NODE_ENV must be development, test, or production/],
    [{ FRONTEND_URL: undefined }, /required in production/],
    [{ TRUST_PROXY_HOPS: "2" }, /0 or 1 in production/],
    [{ STORAGE_PROVIDER: "local" }, /filesystem storage is not allowed/],
    [{ BETTER_AUTH_URL: "http://api.example.com" }, /must use HTTPS/],
    [{ BETTER_AUTH_URL: "https://api.example.com/auth" }, /invalid origin/],
    [{ QDRANT_URL: "http://qdrant.example.com", QDRANT_API_KEY: "test-api-key" }, /must use HTTPS/],
    [
      {
        QDRANT_URL: "https://qdrant.example.com?token=secret",
        QDRANT_API_KEY: "test-api-key",
      },
      /query or fragment/,
    ],
    [{ HEALTHCHECK_API_URL: "http://api.example.com/health" }, /must use HTTPS/],
    [{ CONVERSION_SERVICE_URL: "http://converter.example.com" }, /must use HTTPS/],
    [{ CONVERSION_CHROMIUM_SANDBOX_MODE: "relaxed" }, /must be enabled or disabled/],
    [{ CONVERSION_CHROMIUM_SANDBOX_MODE: "disabled" }, /requires.*ACKNOWLEDGED=true/],
    [{ CONVERSION_CHROMIUM_NO_SANDBOX_ACKNOWLEDGED: "true" }, /requires.*MODE=disabled/],
    [
      {
        STORAGE_PROVIDER: "s3",
        R2_ENDPOINT_URL: "http://storage.example.com",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret",
      },
      /must use HTTPS/,
    ],
    [{ GOOGLE_CLIENT_ID: "client" }, /configured together/],
    [{ R2_ACCESS_KEY_ID: "key", R2_SECRET_ACCESS_KEY: "secret" }, /R2_ENDPOINT_URL/],
  ])("rejects unsafe production configuration %#", (overrides, expected) => {
    expect(() => parseAppConfig({ ...validProductionEnvironment, ...overrides })).toThrow(expected);
  });

  it("allows loopback HTTP providers only in development", () => {
    const config = parseAppConfig({
      ...validProductionEnvironment,
      NODE_ENV: "development",
      BETTER_AUTH_URL: "http://localhost:3001",
      PUBLIC_API_URL: "http://localhost:3001",
      QDRANT_URL: "http://127.0.0.1:6333",
      QDRANT_API_KEY: "test-api-key",
    });

    expect(config.storage).toEqual({
      kind: "local",
      directory: "./data",
      publicApiUrl: "http://localhost:3001",
    });
    expect(config.rag).toEqual({
      kind: "qdrant",
      url: "http://127.0.0.1:6333",
      apiKey: "test-api-key",
      requestTimeoutMs: 15_000,
    });
    expect(config.mail).toEqual({ kind: "console", sendTimeoutMs: 10_000 });
  });

  it("allows a development worker to health-check another Compose service", () => {
    const config = parseAppConfig({
      ...validProductionEnvironment,
      NODE_ENV: "development",
      BETTER_AUTH_URL: "http://localhost:3001",
      HEALTHCHECK_API_URL: "http://backend:8003/health",
    });

    expect(config.worker.healthCheckUrl).toBe("http://backend:8003/health");
    expect(() =>
      parseAppConfig({
        ...validProductionEnvironment,
        NODE_ENV: "development",
        BETTER_AUTH_URL: "http://localhost:3001",
        QDRANT_URL: "http://qdrant:6333",
        QDRANT_API_KEY: "test-api-key",
      }),
    ).toThrow(/must use HTTPS/);
  });

  it("parses complete Resend and SMTP provider configurations", () => {
    expect(
      parseAppConfig({
        ...validProductionEnvironment,
        MAIL_PROVIDER: "resend",
        MAIL_FROM: "mail@example.com",
        RESEND_API_KEY: "re_test",
      }).mail,
    ).toMatchObject({
      kind: "resend",
      fromEmail: "mail@example.com",
      apiKey: "re_test",
    });

    expect(
      parseAppConfig({
        ...validProductionEnvironment,
        MAIL_PROVIDER: "smtp",
        MAIL_FROM: "mail@example.com",
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "465",
        SMTP_SECURE: "true",
        SMTP_USERNAME: "prism",
        SMTP_PASSWORD: "secret",
      }).mail,
    ).toMatchObject({
      kind: "smtp",
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: { kind: "credentials", username: "prism", password: "secret" },
    });
  });

  it("parses canonical AI provider credentials", () => {
    const config = parseAppConfig({
      ...validProductionEnvironment,
      ANTHROPIC_API_KEY: "anthropic-key",
      GOOGLE_GENERATIVE_AI_API_KEY: "google-key",
      OPENAI_API_KEY: "openai-key",
    });

    expect(config.ai).toMatchObject({
      anthropic: { kind: "configured", apiKey: "anthropic-key" },
      google: { kind: "configured", apiKey: "google-key" },
      openai: { kind: "configured", apiKey: "openai-key" },
    });
  });

  it("requires an explicit acknowledgement to disable the Chromium sandbox", () => {
    const config = parseAppConfig({
      ...validProductionEnvironment,
      CONVERSION_CHROMIUM_SANDBOX_MODE: "disabled",
      CONVERSION_CHROMIUM_NO_SANDBOX_ACKNOWLEDGED: "true",
    });

    expect(config.conversion.allowChromiumNoSandbox).toBe(true);
  });

  it("keeps storage disabled by default outside development", () => {
    const config = parseAppConfig({
      ...validProductionEnvironment,
      NODE_ENV: "test",
    });

    expect(config.storage).toEqual({ kind: "disabled" });
  });

  it("parses a versioned AI credential keyring for rotation", () => {
    const config = parseAppConfig({
      ...validProductionEnvironment,
      AI_CREDENTIAL_ACTIVE_KEY_ID: "v2",
      AI_CREDENTIAL_ENCRYPTION_KEYS: JSON.stringify({
        v1: "0123456789abcdefghijklmnoPQRSTUV",
        v2: "ZYXWVUTsrqponmlkjihgfedcba987654",
      }),
    });

    expect(config.ai.credentialEncryption).toEqual({
      activeKeyId: "v2",
      keys: {
        v1: "0123456789abcdefghijklmnoPQRSTUV",
        v2: "ZYXWVUTsrqponmlkjihgfedcba987654",
      },
    });
  });

  it("requires the AI credential keyring without a legacy fallback", () => {
    expect(() =>
      parseAppConfig({
        ...validProductionEnvironment,
        AI_CREDENTIAL_ENCRYPTION_KEYS: undefined,
      }),
    ).toThrow(/AI_CREDENTIAL_ENCRYPTION_KEYS is required/);
  });

  it("enables local HTTP AI endpoints only in development", () => {
    expect(
      parseAppConfig({
        ...validProductionEnvironment,
        AI_ALLOW_LOCAL_HTTP_ENDPOINTS: "true",
      }).ai.allowLocalHttpCustomEndpoints,
    ).toBe(false);
    expect(
      parseAppConfig({
        ...validProductionEnvironment,
        NODE_ENV: "development",
        BETTER_AUTH_URL: "http://localhost:3001",
        AI_ALLOW_LOCAL_HTTP_ENDPOINTS: "true",
      }).ai.allowLocalHttpCustomEndpoints,
    ).toBe(true);
  });

  it("rejects local storage whenever a Render runtime is detected", () => {
    expect(() =>
      parseAppConfig({
        ...validProductionEnvironment,
        NODE_ENV: "development",
        BETTER_AUTH_URL: "http://localhost:3001",
        STORAGE_PROVIDER: "local",
        RENDER: "true",
      }),
    ).toThrow(/filesystem storage is not allowed in production or on Render/);
  });

  it("parses provider-neutral S3 configuration", () => {
    const config = parseAppConfig({
      ...validProductionEnvironment,
      STORAGE_PROVIDER: "s3",
      OBJECT_STORE_ENDPOINT: "https://objects.example.com",
      OBJECT_STORE_REGION: "eu-west-1",
      OBJECT_STORE_BUCKET: "prism-documents",
      OBJECT_STORE_ACCESS_KEY_ID: "access",
      OBJECT_STORE_SECRET_ACCESS_KEY: "secret",
      OBJECT_STORE_FORCE_PATH_STYLE: "false",
      OBJECT_STORE_REQUEST_TIMEOUT_MS: "45000",
    });

    expect(config.storage).toEqual({
      kind: "s3",
      endpoint: "https://objects.example.com",
      region: "eu-west-1",
      bucket: "prism-documents",
      accessKeyId: "access",
      secretAccessKey: "secret",
      forcePathStyle: false,
      requestTimeoutMs: 45_000,
    });
  });
});
