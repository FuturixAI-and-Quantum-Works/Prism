import assert from "node:assert/strict";
import test from "node:test";
import { configureEmail, getEmailConfigHealth, sendRawEmail } from "../../src/lib/email.js";
import { parseAppConfig } from "../../src/config.js";

const baseEnvironment = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://prism:secret@localhost:5432/prism",
  PUBLIC_API_URL: "http://localhost:3001",
  BETTER_AUTH_SECRET: "0123456789abcdef".repeat(4),
  AUTH_OTP_SECRET: "abcdef0123456789".repeat(4),
  AI_CREDENTIAL_ACTIVE_KEY_ID: "v1",
  AI_CREDENTIAL_ENCRYPTION_KEYS: JSON.stringify({
    v1: "fedcba9876543210".repeat(4),
  }),
  DOWNLOAD_SIGNING_SECRET: "89abcdef01234567".repeat(4),
} as const;

test("development defaults to explicit console suppression", async () => {
  const config = parseAppConfig(baseEnvironment);
  configureEmail({
    mail: config.mail,
    trustedActionOrigins: config.auth.trustedOrigins,
  });
  const health = await getEmailConfigHealth();
  assert.equal(health.fromEmail, null);
  assert.equal(health.senderConfigured, false);
  assert.equal(health.provider, "console");

  const result = await sendRawEmail({
    to: "recipient@example.com",
    subject: "Test",
    text: "Test",
  });
  assert.equal(result.success, false);
  assert.equal(result.status, "suppressed");
});

test("enabled email requires a valid configured sender", () => {
  assert.throws(
    () =>
      parseAppConfig({
        ...baseEnvironment,
        MAIL_PROVIDER: "resend",
        RESEND_API_KEY: "test-key",
      }),
    /MAIL_FROM/,
  );
  assert.throws(
    () =>
      parseAppConfig({
        ...baseEnvironment,
        MAIL_PROVIDER: "resend",
        RESEND_API_KEY: "test-key",
        MAIL_FROM: "invalid",
      }),
    /email/,
  );
});

test("smtp credentials must be configured as a pair", () => {
  assert.throws(
    () =>
      parseAppConfig({
        ...baseEnvironment,
        MAIL_PROVIDER: "smtp",
        MAIL_FROM: "sender@example.com",
        SMTP_HOST: "smtp.example.com",
        SMTP_USERNAME: "user",
      }),
    /configured together/,
  );
});
