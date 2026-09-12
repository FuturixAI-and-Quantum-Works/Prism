import assert from "node:assert/strict";
import test from "node:test";
import {
  documentBelongsToComplianceScope,
  getComplianceScope,
} from "../../src/modules/compliance/compliance.policy.js";

const document = {
  id: "document-1",
  userId: "user-1",
  projectId: "project-1",
  workspaceId: "workspace-1",
};

test("rejects a request that combines project and workspace scopes", () => {
  assert.equal(getComplianceScope("project-1", "workspace-1"), null);
});

test("preserves project-scoped document behavior", () => {
  const scope = getComplianceScope("project-1", undefined);

  assert.deepEqual(scope, { kind: "project", projectId: "project-1" });
  assert.equal(scope && documentBelongsToComplianceScope(document, scope), true);
});

test("rejects documents outside the selected container", () => {
  const workspaceScope = getComplianceScope(undefined, "workspace-2");
  const projectScope = getComplianceScope("project-2", undefined);

  assert.equal(workspaceScope && documentBelongsToComplianceScope(document, workspaceScope), false);
  assert.equal(projectScope && documentBelongsToComplianceScope(document, projectScope), false);
});

test("allows independently authorized documents in document scope", () => {
  const scope = getComplianceScope(undefined, undefined);

  assert.deepEqual(scope, { kind: "document" });
  assert.equal(scope && documentBelongsToComplianceScope(document, scope), true);
});
