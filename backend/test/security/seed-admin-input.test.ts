import assert from "node:assert/strict";
import test from "node:test";
import { parseSeedAdminEmail } from "../../src/scripts/seedAdminInput.js";

test("admin seed accepts a validated CLI email", () => {
  assert.equal(
    parseSeedAdminEmail([" Admin@Example.com "], {
      ADMIN_EMAIL: "ignored@example.com",
    }),
    "admin@example.com",
  );
});

test("admin seed falls back to ADMIN_EMAIL", () => {
  assert.equal(parseSeedAdminEmail([], { ADMIN_EMAIL: "owner@example.com" }), "owner@example.com");
});

test("admin seed accepts an explicit email flag with dry-run", () => {
  assert.equal(
    parseSeedAdminEmail(["--dry-run", "--email", "owner@example.com"], {}),
    "owner@example.com",
  );
});

test("admin seed rejects missing or invalid email input", () => {
  assert.throws(() => parseSeedAdminEmail([], {}), /Admin email is required/);
  assert.throws(() => parseSeedAdminEmail(["not-an-email"], {}), /valid email address/);
});
