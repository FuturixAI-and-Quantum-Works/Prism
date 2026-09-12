export type AccessActor = Readonly<{
  userId: string;
  email: string;
}>;

export type AccessRole = "owner" | "admin" | "editor" | "viewer";
export type ShareRole = Exclude<AccessRole, "owner">;
export type AccessSource =
  | "owner"
  | "global-admin"
  | "project"
  | "workspace"
  | "direct-share"
  | "member"
  | "system"
  | "invitation";

export type DocumentRole = "DRAFTER" | "REVIEWER" | "APPROVER";
export type DocumentLifecycleStatus =
  "DRAFT" | "IN_REVIEW" | "PENDING_APPROVAL" | "APPROVED" | "FINALIZED";

export type DocumentAccessAction =
  | "list_documents"
  | "read_document"
  | "update_document"
  | "find_in_document"
  | "generate_docx"
  | "edit_document"
  | "suggest_edit"
  | "get_document_version"
  | "revert_to_version"
  | "extract_placeholders"
  | "set_placeholder_value"
  | "fill_placeholders"
  | "add_comment"
  | "resolve_comment"
  | "prism_risk_scan"
  | "prism_missing_clauses"
  | "prism_benchmark"
  | "prism_jurisdiction_check"
  | "prism_obligation_map"
  | "compare_documents"
  | "extract_clauses"
  | "create_approval_request"
  | "get_approval_status"
  | "approve_document"
  | "reject_document"
  | "finalize_document"
  | "export_document"
  | "get_audit_trail"
  | "send_mention_email"
  | "set_cell_value"
  | "assign_document_role"
  | "delete_document"
  | "list_change_requests"
  | "review_change_request"
  | "send_review"
  | "send_approval"
  | "request_clarification";

export const DOCUMENT_ACCESS_ACTIONS: readonly DocumentAccessAction[] = [
  "list_documents",
  "read_document",
  "update_document",
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
  "prism_risk_scan",
  "prism_missing_clauses",
  "prism_benchmark",
  "prism_jurisdiction_check",
  "prism_obligation_map",
  "compare_documents",
  "extract_clauses",
  "create_approval_request",
  "get_approval_status",
  "approve_document",
  "reject_document",
  "finalize_document",
  "export_document",
  "get_audit_trail",
  "send_mention_email",
  "set_cell_value",
  "assign_document_role",
  "delete_document",
  "list_change_requests",
  "review_change_request",
  "send_review",
  "send_approval",
  "request_clarification",
];

export type AccessResource =
  | Readonly<{ kind: "project"; id: string }>
  | Readonly<{ kind: "workspace"; id: string }>
  | Readonly<{ kind: "document"; id: string }>
  | Readonly<{ kind: "tabular-review"; id: string }>
  | Readonly<{ kind: "compliance-review"; id: string }>
  | Readonly<{ kind: "chat"; id: string }>
  | Readonly<{ kind: "workflow"; id: string }>
  | Readonly<{ kind: "template"; id: string }>
  | Readonly<{ kind: "invitation"; id: string }>;

export type AccessRequest =
  | Readonly<{
      actor: AccessActor;
      resource: Extract<AccessResource, { kind: "project" }>;
      action: "read" | "write" | "manage";
    }>
  | Readonly<{
      actor: AccessActor;
      resource: Extract<AccessResource, { kind: "workspace" }>;
      action: "read" | "write" | "manage" | "delete";
    }>
  | Readonly<{
      actor: AccessActor;
      resource: Extract<AccessResource, { kind: "document" }>;
      action: DocumentAccessAction;
    }>
  | Readonly<{
      actor: AccessActor;
      resource: Extract<AccessResource, { kind: "tabular-review" }>;
      action:
        | "read"
        | "edit-review"
        | "edit-cells"
        | "generate"
        | "regenerate"
        | "manage-sharing"
        | "assign-project"
        | "delete"
        | "use-chat";
    }>
  | Readonly<{
      actor: AccessActor;
      resource: Extract<AccessResource, { kind: "compliance-review" }>;
      action: "read" | "edit" | "run";
    }>
  | Readonly<{
      actor: AccessActor;
      resource: Extract<AccessResource, { kind: "chat" }>;
      action: "read" | "write" | "delete";
    }>
  | Readonly<{
      actor: AccessActor;
      resource: Extract<AccessResource, { kind: "workflow" }>;
      action: "read" | "edit" | "manage-sharing" | "delete";
    }>
  | Readonly<{
      actor: AccessActor;
      resource: Extract<AccessResource, { kind: "template" }>;
      action: "read" | "edit" | "delete" | "clone";
    }>
  | Readonly<{
      actor: AccessActor;
      resource: Extract<AccessResource, { kind: "invitation" }>;
      action: "accept" | "decline";
    }>;

export type AccessGrant = Readonly<{
  role: AccessRole;
  source: AccessSource;
  documentRole: DocumentRole | null;
  documentLifecycle: DocumentLifecycleStatus | null;
}>;

export type AccessDecision =
  | Readonly<{ allowed: true; grant: AccessGrant }>
  | Readonly<{ allowed: false; reason: "not-found" | "forbidden" }>;
