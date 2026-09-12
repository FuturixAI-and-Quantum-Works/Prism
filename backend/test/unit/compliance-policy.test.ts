import { describe, expect, it } from "vitest";
import {
  ComplianceAuthorizationPolicy,
  documentBelongsToComplianceScope,
  getComplianceScope,
} from "../../src/modules/compliance/compliance.policy.js";
import type { ComplianceDocument } from "../../src/modules/compliance/compliance.types.js";
import { stubAccessAuthority } from "./access-test-helpers.js";

const document: ComplianceDocument = {
  id: "document-1",
  userId: "owner-1",
  projectId: "project-1",
  workspaceId: null,
  filename: "contract.docx",
  fileType: "docx",
};

describe("compliance scope policy", () => {
  it("models mutually exclusive container scopes", () => {
    expect(getComplianceScope("project-1", "workspace-1")).toBeNull();
    expect(getComplianceScope("project-1", undefined)).toEqual({
      kind: "project",
      projectId: "project-1",
    });
    expect(
      documentBelongsToComplianceScope(document, { kind: "project", projectId: "project-1" }),
    ).toBe(true);
  });

  it("requires write-capable roles and every referenced document", async () => {
    const policy = new ComplianceAuthorizationPolicy(
      async (ids) => (ids.includes(document.id) ? [document] : []),
      stubAccessAuthority((_actor, resource) => ({
        role: resource.kind === "project" ? "viewer" : "editor",
        source: "member",
        documentRole: null,
        documentLifecycle: null,
      })),
    );
    const actor = { userId: "member-1", email: "member@example.com" };

    await expect(
      policy.allowsScope({ kind: "project", projectId: "project-1" }, actor, "write"),
    ).resolves.toBe(false);
    await expect(
      policy.allowsDocuments([document.id], { kind: "document" }, actor, "write"),
    ).resolves.toBe(true);
    await expect(
      policy.allowsDocuments(["missing"], { kind: "document" }, actor, "read"),
    ).resolves.toBe(false);
  });
});
