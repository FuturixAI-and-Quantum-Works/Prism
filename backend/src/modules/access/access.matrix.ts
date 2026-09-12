import type {
  AccessGrant,
  AccessRequest,
  AccessRole,
  DocumentAccessAction,
  DocumentRole,
} from "./access.types.js";

const writeRoles = new Set<AccessRole>(["owner", "admin", "editor"]);
const manageRoles = new Set<AccessRole>(["owner", "admin"]);

const documentReadActions = new Set<string>([
  "list_documents",
  "read_document",
  "find_in_document",
  "get_document_version",
  "extract_placeholders",
  "compare_documents",
  "extract_clauses",
  "get_approval_status",
  "send_mention_email",
]);

const documentEditorActions = new Set<string>([
  ...documentReadActions,
  "generate_docx",
  "edit_document",
  "suggest_edit",
  "revert_to_version",
  "set_placeholder_value",
  "fill_placeholders",
  "add_comment",
  "resolve_comment",
  "create_approval_request",
  "export_document",
  "set_cell_value",
  "send_review",
  "send_approval",
]);

const documentReviewerActions = new Set<string>([
  ...documentReadActions,
  "add_comment",
  "resolve_comment",
  "prism_risk_scan",
  "prism_missing_clauses",
  "prism_benchmark",
  "prism_jurisdiction_check",
  "prism_obligation_map",
]);

const documentApproverActions = new Set<string>([
  ...documentReviewerActions,
  "approve_document",
  "reject_document",
  "finalize_document",
  "export_document",
  "request_clarification",
]);

const documentOwnerActions = new Set<string>([
  ...documentEditorActions,
  ...documentReviewerActions,
  ...documentApproverActions,
  "update_document",
  "get_audit_trail",
  "assign_document_role",
  "delete_document",
  "list_change_requests",
  "review_change_request",
]);

const strictDocumentOwnerActions = new Set<string>([
  "update_document",
  "list_change_requests",
  "review_change_request",
]);

const finalizedLocks = new Set<string>([
  "update_document",
  "generate_docx",
  "edit_document",
  "suggest_edit",
  "revert_to_version",
  "set_placeholder_value",
  "fill_placeholders",
  "create_approval_request",
  "approve_document",
  "reject_document",
  "finalize_document",
  "set_cell_value",
  "assign_document_role",
  "delete_document",
  "send_review",
  "send_approval",
  "request_clarification",
]);

const pendingApprovalLocks = new Set<string>([
  "generate_docx",
  "edit_document",
  "suggest_edit",
  "revert_to_version",
  "set_placeholder_value",
  "fill_placeholders",
  "create_approval_request",
  "set_cell_value",
  "send_review",
  "send_approval",
]);

function documentRoleActions(role: DocumentRole | null): ReadonlySet<string> {
  if (role === "DRAFTER") return documentEditorActions;
  if (role === "REVIEWER") return documentReviewerActions;
  if (role === "APPROVER") return documentApproverActions;
  return new Set();
}

function documentAllows(grant: AccessGrant, action: string): boolean {
  if (grant.documentLifecycle === "FINALIZED" && finalizedLocks.has(action)) return false;
  if (grant.documentLifecycle === "PENDING_APPROVAL" && pendingApprovalLocks.has(action)) {
    return false;
  }
  if (strictDocumentOwnerActions.has(action)) return grant.role === "owner";
  if (manageRoles.has(grant.role)) return documentOwnerActions.has(action);
  if (grant.source !== "member") {
    if (grant.role === "editor") return documentEditorActions.has(action);
    if (grant.role === "viewer") {
      return (
        documentReadActions.has(action) || action === "export_document" || action === "add_comment"
      );
    }
  }
  if (grant.documentRole) return documentRoleActions(grant.documentRole).has(action);
  if (grant.role === "editor") return documentEditorActions.has(action);
  return (
    documentReadActions.has(action) || action === "export_document" || action === "add_comment"
  );
}

export function documentAccessAllows(grant: AccessGrant, action: DocumentAccessAction): boolean {
  return documentAllows(grant, action);
}

export function documentRequiredRole(action: DocumentAccessAction): string {
  if (strictDocumentOwnerActions.has(action)) return "Owner";
  if (
    documentOwnerActions.has(action) &&
    !documentEditorActions.has(action) &&
    !documentReviewerActions.has(action) &&
    !documentApproverActions.has(action)
  ) {
    return "Owner/Admin";
  }
  if (
    documentApproverActions.has(action) &&
    !documentEditorActions.has(action) &&
    !documentReviewerActions.has(action)
  ) {
    return "Approver";
  }
  if (documentReviewerActions.has(action) && !documentEditorActions.has(action)) {
    return "Reviewer or Approver";
  }
  if (documentEditorActions.has(action)) return "Drafter";
  return "Authorized";
}

export function accessAllows(grant: AccessGrant, request: AccessRequest): boolean {
  switch (request.resource.kind) {
    case "project":
      if (request.action === "read") return true;
      if (request.action === "write") return writeRoles.has(grant.role);
      return manageRoles.has(grant.role);
    case "workspace":
      if (request.action === "read") return true;
      if (request.action === "write") return writeRoles.has(grant.role);
      if (request.action === "manage") return manageRoles.has(grant.role);
      return grant.role === "owner";
    case "document":
      return documentAllows(grant, request.action);
    case "tabular-review":
      if (request.action === "read" || request.action === "use-chat") return true;
      if (
        request.action === "edit-review" ||
        request.action === "edit-cells" ||
        request.action === "generate" ||
        request.action === "regenerate"
      ) {
        return writeRoles.has(grant.role);
      }
      return manageRoles.has(grant.role);
    case "compliance-review":
      if (request.action === "read") return true;
      return documentAllows(grant, "edit_document");
    case "chat":
      if (request.action === "read") return true;
      return grant.role === "owner";
    case "workflow":
      if (request.action === "read") return true;
      if (grant.source === "system") return false;
      if (request.action === "edit") return writeRoles.has(grant.role);
      return grant.role === "owner";
    case "template":
      if (request.action === "read" || request.action === "clone") return true;
      return grant.source !== "system" && grant.role === "owner";
    case "invitation":
      return grant.source === "invitation";
  }
}

export function accessDenialReason(
  grant: AccessGrant,
  request: AccessRequest,
): "not-found" | "forbidden" {
  if (
    request.resource.kind === "document" &&
    request.action === "update_document" &&
    grant.role !== "owner"
  ) {
    return "not-found";
  }
  return "forbidden";
}
