import { describe, expect, it } from "vitest";
import { accessAllows, accessDenialReason } from "../../src/modules/access/access.matrix.js";
import type {
  AccessGrant,
  AccessRequest,
  AccessRole,
  AccessSource,
} from "../../src/modules/access/access.types.js";
import {
  DOCUMENT_ACCESS_ACTIONS,
  type DocumentAccessAction,
} from "../../src/modules/access/access.types.js";

const actor = { userId: "user-1", email: "user@example.com" };
const roles: readonly AccessRole[] = ["owner", "admin", "editor", "viewer"];
const workflowActions = ["read", "edit", "manage-sharing", "delete"] as const;

function grant(role: AccessRole, source: AccessSource = "member"): AccessGrant {
  return {
    role,
    source,
    documentRole: null,
    documentLifecycle: null,
  };
}

function request(
  resource:
    | "project"
    | "workspace"
    | "tabular-review"
    | "compliance-review"
    | "chat"
    | "workflow"
    | "template",
  action: string,
): AccessRequest {
  if (resource === "project") {
    if (action === "read" || action === "write" || action === "manage") {
      return { actor, resource: { kind: resource, id: "resource-1" }, action };
    }
  }
  if (resource === "workspace") {
    if (action === "read" || action === "write" || action === "manage" || action === "delete") {
      return { actor, resource: { kind: resource, id: "resource-1" }, action };
    }
  }
  if (resource === "tabular-review") {
    if (
      action === "read" ||
      action === "edit-review" ||
      action === "edit-cells" ||
      action === "generate" ||
      action === "regenerate" ||
      action === "manage-sharing" ||
      action === "assign-project" ||
      action === "delete" ||
      action === "use-chat"
    ) {
      return { actor, resource: { kind: resource, id: "resource-1" }, action };
    }
  }
  if (resource === "chat") {
    if (action === "read" || action === "write" || action === "delete") {
      return { actor, resource: { kind: resource, id: "resource-1" }, action };
    }
  }
  if (resource === "compliance-review") {
    if (action === "read" || action === "edit" || action === "run") {
      return { actor, resource: { kind: resource, id: "resource-1" }, action };
    }
  }
  if (resource === "workflow") {
    if (
      action === "read" ||
      action === "edit" ||
      action === "manage-sharing" ||
      action === "delete"
    ) {
      return { actor, resource: { kind: resource, id: "resource-1" }, action };
    }
  }
  if (action === "read" || action === "edit" || action === "delete" || action === "clone") {
    return { actor, resource: { kind: "template", id: "resource-1" }, action };
  }
  throw new Error(`Unsupported matrix case ${resource}.${action}`);
}

describe("access role-resource-action matrix", () => {
  it.each([
    ["project", "read", ["owner", "admin", "editor", "viewer"]],
    ["project", "write", ["owner", "admin", "editor"]],
    ["project", "manage", ["owner", "admin"]],
    ["workspace", "read", ["owner", "admin", "editor", "viewer"]],
    ["workspace", "write", ["owner", "admin", "editor"]],
    ["workspace", "manage", ["owner", "admin"]],
    ["workspace", "delete", ["owner"]],
    ["tabular-review", "read", ["owner", "admin", "editor", "viewer"]],
    ["tabular-review", "edit-review", ["owner", "admin", "editor"]],
    ["tabular-review", "edit-cells", ["owner", "admin", "editor"]],
    ["tabular-review", "generate", ["owner", "admin", "editor"]],
    ["tabular-review", "regenerate", ["owner", "admin", "editor"]],
    ["tabular-review", "manage-sharing", ["owner", "admin"]],
    ["tabular-review", "assign-project", ["owner", "admin"]],
    ["tabular-review", "delete", ["owner", "admin"]],
    ["tabular-review", "use-chat", ["owner", "admin", "editor", "viewer"]],
    ["compliance-review", "read", ["owner", "admin", "editor", "viewer"]],
    ["compliance-review", "edit", ["owner", "admin", "editor"]],
    ["compliance-review", "run", ["owner", "admin", "editor"]],
    ["chat", "read", ["owner", "admin", "editor", "viewer"]],
    ["chat", "write", ["owner"]],
    ["chat", "delete", ["owner"]],
    ["workflow", "read", ["owner", "admin", "editor", "viewer"]],
    ["workflow", "edit", ["owner", "admin", "editor"]],
    ["workflow", "manage-sharing", ["owner"]],
    ["workflow", "delete", ["owner"]],
    ["template", "read", ["owner", "admin", "editor", "viewer"]],
    ["template", "clone", ["owner", "admin", "editor", "viewer"]],
    ["template", "edit", ["owner"]],
    ["template", "delete", ["owner"]],
  ] as const)("%s.%s has an explicit role set", (resource, action, allowedRoles) => {
    const allowed = new Set<AccessRole>(allowedRoles);
    for (const role of roles) {
      expect(accessAllows(grant(role), request(resource, action))).toBe(allowed.has(role));
    }
  });

  it("keeps system workflows and templates immutable", () => {
    expect(accessAllows(grant("viewer", "system"), request("workflow", "read"))).toBe(true);
    expect(accessAllows(grant("owner", "system"), request("workflow", "edit"))).toBe(false);
    expect(accessAllows(grant("viewer", "system"), request("template", "clone"))).toBe(true);
    expect(accessAllows(grant("owner", "system"), request("template", "delete"))).toBe(false);
  });

  it.each([
    ["owner", "owner", workflowActions],
    ["admin", "member", ["read", "edit"]],
    ["editor", "direct-share", ["read", "edit"]],
    ["viewer", "direct-share", ["read"]],
    ["owner", "system", ["read"]],
  ] as const)(
    "evaluates workflow %s grants from %s through the complete action matrix",
    (role, source, expected) => {
      const allowed = new Set<string>(expected);
      for (const action of workflowActions) {
        expect(accessAllows(grant(role, source), request("workflow", action))).toBe(
          allowed.has(action),
        );
      }
    },
  );

  it("combines product roles, document roles, and lifecycle locks", () => {
    const base = {
      source: "member",
      documentLifecycle: "DRAFT",
    } satisfies Pick<AccessGrant, "source" | "documentLifecycle">;
    const reviewer: AccessGrant = {
      ...base,
      role: "viewer",
      documentRole: "REVIEWER",
    };
    const drafter: AccessGrant = {
      ...base,
      role: "editor",
      documentRole: "DRAFTER",
    };
    const finalizedOwner: AccessGrant = {
      role: "owner",
      source: "owner",
      documentRole: null,
      documentLifecycle: "FINALIZED",
    };
    expect(
      accessAllows(reviewer, {
        actor,
        resource: { kind: "document", id: "document-1" },
        action: "prism_risk_scan",
      }),
    ).toBe(true);
    expect(
      accessAllows(reviewer, {
        actor,
        resource: { kind: "document", id: "document-1" },
        action: "edit_document",
      }),
    ).toBe(false);
    expect(
      accessAllows(drafter, {
        actor,
        resource: { kind: "document", id: "document-1" },
        action: "edit_document",
      }),
    ).toBe(true);
    expect(
      accessAllows(finalizedOwner, {
        actor,
        resource: { kind: "document", id: "document-1" },
        action: "delete_document",
      }),
    ).toBe(false);
  });

  it.each([
    ["owner", null, DOCUMENT_ACCESS_ACTIONS],
    [
      "admin",
      null,
      DOCUMENT_ACCESS_ACTIONS.filter(
        (action) =>
          action !== "update_document" &&
          action !== "list_change_requests" &&
          action !== "review_change_request",
      ),
    ],
    [
      "editor",
      null,
      [
        "list_documents",
        "read_document",
        "find_in_document",
        "generate_docx",
        "edit_document",
        "suggest_edit",
        "get_document_version",
        "revert_to_version",
        "extract_placeholders",
        "set_placeholder_value",
        "fill_placeholders",
        "add_comment",
        "resolve_comment",
        "compare_documents",
        "extract_clauses",
        "create_approval_request",
        "get_approval_status",
        "export_document",
        "send_mention_email",
        "set_cell_value",
        "send_review",
        "send_approval",
      ],
    ],
    [
      "viewer",
      null,
      [
        "list_documents",
        "read_document",
        "find_in_document",
        "get_document_version",
        "extract_placeholders",
        "add_comment",
        "compare_documents",
        "extract_clauses",
        "get_approval_status",
        "export_document",
        "send_mention_email",
      ],
    ],
    [
      "viewer",
      "REVIEWER",
      [
        "list_documents",
        "read_document",
        "find_in_document",
        "get_document_version",
        "extract_placeholders",
        "add_comment",
        "resolve_comment",
        "prism_risk_scan",
        "prism_missing_clauses",
        "prism_benchmark",
        "prism_jurisdiction_check",
        "prism_obligation_map",
        "compare_documents",
        "extract_clauses",
        "get_approval_status",
        "send_mention_email",
      ],
    ],
    [
      "viewer",
      "APPROVER",
      [
        "list_documents",
        "read_document",
        "find_in_document",
        "get_document_version",
        "extract_placeholders",
        "add_comment",
        "resolve_comment",
        "prism_risk_scan",
        "prism_missing_clauses",
        "prism_benchmark",
        "prism_jurisdiction_check",
        "prism_obligation_map",
        "compare_documents",
        "extract_clauses",
        "get_approval_status",
        "approve_document",
        "reject_document",
        "finalize_document",
        "export_document",
        "send_mention_email",
        "request_clarification",
      ],
    ],
  ] as const)("enumerates every document action for %s/%s", (role, documentRole, expected) => {
    const currentGrant: AccessGrant = {
      role,
      source: "member",
      documentRole,
      documentLifecycle: "DRAFT",
    };
    const allowed = DOCUMENT_ACCESS_ACTIONS.filter((action: DocumentAccessAction) =>
      accessAllows(currentGrant, {
        actor,
        resource: { kind: "document", id: "document-1" },
        action,
      }),
    );
    expect(allowed).toEqual(expected);
  });

  it("requires invitation identity grants for acceptance and decline", () => {
    const invitationGrant = grant("viewer", "invitation");
    const memberGrant = grant("viewer", "member");
    for (const action of ["accept", "decline"] as const) {
      const invitationRequest = {
        actor,
        resource: { kind: "invitation" as const, id: "invitation-1" },
        action,
      };
      expect(accessAllows(invitationGrant, invitationRequest)).toBe(true);
      expect(accessAllows(memberGrant, invitationRequest)).toBe(false);
    }
  });

  it("conceals owner-only metadata updates without hiding ordinary role denials", () => {
    const editor = grant("editor");
    expect(
      accessDenialReason(editor, {
        actor,
        resource: { kind: "document", id: "document-1" },
        action: "update_document",
      }),
    ).toBe("not-found");
    expect(
      accessDenialReason(editor, {
        actor,
        resource: { kind: "document", id: "document-1" },
        action: "list_change_requests",
      }),
    ).toBe("forbidden");
  });
});
