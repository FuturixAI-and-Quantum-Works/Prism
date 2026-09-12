import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  hashApprovalToken,
  publicApprovalItemDto,
  publicApprovalRequestDto,
} from "../../src/modules/approvals/approvals.service.js";
import { publicInvitationDto } from "../../src/routes/invitations.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));

test("approval tokens use deterministic SHA-256 digests", () => {
  const rawToken = "approval-token";
  const digest = hashApprovalToken(rawToken);

  assert.equal(digest, "b20f97ddb9eb4056e37a4ca473e8096484267452455b58e4fd756e75ab6d5bd5");
  assert.equal(digest.length, 64);
  assert.notEqual(digest, rawToken);
});

test("approval creation and public lookups use token digests", async () => {
  const governance = await readFile(
    resolve(testDirectory, "../../src/modules/approvals/approvals.service.ts"),
    "utf8",
  );

  assert.match(governance, /token: hashApprovalToken\(rawToken\)/);
  assert.match(governance, /hashApprovalToken\(input\.requestIdOrToken\)/);
  assert.match(governance, /findRequestByTokenHash\(hashApprovalToken\(token\)\)/);
  assert.doesNotMatch(governance, /request\.token|action_url/);
});

test("public approval DTOs expose only frontend fields", () => {
  const request = publicApprovalRequestDto(
    {
      role: "legal_reviewer",
      approverName: "Legal Reviewer",
      status: "pending",
    },
    "Legal reviewer",
  );
  const item = publicApprovalItemDto({
    id: "item-1",
    title: "Clause 4",
    reason: "Legal review required",
  });

  assert.deepEqual(Object.keys(request).sort(), ["approver_name", "role_label", "status"]);
  assert.deepEqual(Object.keys(item).sort(), ["id", "reason", "title"]);
  assert.doesNotMatch(JSON.stringify({ request, item }), /email|token|metadata|requested_by/);
});

test("public invitation DTO exposes only frontend fields", () => {
  const invitation = publicInvitationDto(
    {
      resourceType: "document",
      documentId: "document-1",
      projectId: null,
      workspaceId: null,
      role: "viewer",
      status: "pending",
    },
    "Contract",
  );

  assert.deepEqual(Object.keys(invitation).sort(), [
    "resource_id",
    "resource_name",
    "resource_type",
    "role",
    "status",
  ]);
  assert.doesNotMatch(JSON.stringify(invitation), /email|token|invited_by|accepted_at/);
});
