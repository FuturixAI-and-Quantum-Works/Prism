import type { DocumentRole } from "../access/access.types.js";
import type { RejectionTarget } from "./documents.lifecycle.service.js";
import {
  normalizeInviteEmail,
  normalizeShareRole,
  type ShareRole,
} from "../sharing/sharing.types.js";

type ValidationError = Error & { statusCode: number };

export type DeferredValue<T> =
  Readonly<{ valid: true; value: T }> | Readonly<{ valid: false; message: string }>;

export type LifecycleAction =
  | "send_review"
  | "send_approval"
  | "approve_document"
  | "reject_document"
  | "finalize_document"
  | "request_clarification";

export const lifecycleRoutes: ReadonlyArray<readonly [string, LifecycleAction]> = [
  ["send-review", "send_review"],
  ["send-approval", "send_approval"],
  ["approve", "approve_document"],
  ["reject", "reject_document"],
  ["finalize", "finalize_document"],
  ["request-clarification", "request_clarification"],
];

function validationError(message: string): ValidationError {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && !Array.isArray(body)
    ? Object.fromEntries(Object.entries(body))
    : {};
}

function deferredCommentBody(value: unknown): DeferredValue<string> {
  if (typeof value !== "string" || !value.trim()) {
    return { valid: false, message: "body is required" };
  }
  return { valid: true, value: value.trim().slice(0, 8000) };
}

function nullableString(value: unknown, max = 4000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function nullableInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function parseAssignMember(body: unknown): {
  email: string | null;
  targetUserId: string | null;
  role: DocumentRole;
} {
  const input = bodyRecord(body);
  const role = input.role;
  if (role !== "DRAFTER" && role !== "REVIEWER" && role !== "APPROVER") {
    throw validationError("role must be DRAFTER, REVIEWER, or APPROVER");
  }
  return {
    email: typeof input.email === "string" ? input.email : null,
    targetUserId: typeof input.user_id === "string" ? input.user_id : null,
    role,
  };
}

export function parseInvitation(body: unknown): { email: string; role: ShareRole } {
  const input = bodyRecord(body);
  return {
    email: normalizeInviteEmail(input.email),
    role: normalizeShareRole(input.role),
  };
}

export function parseShareRole(body: unknown): ShareRole {
  return normalizeShareRole(bodyRecord(body).role);
}

export function parseLifecycle(body: unknown): {
  note: string | null;
  rejectionTarget: RejectionTarget | null;
} {
  const input = bodyRecord(body);
  const target = input.rejection_target;
  const rejectionTarget =
    target && typeof target === "object" && !Array.isArray(target)
      ? {
          page_number: Number.isInteger(Number(Reflect.get(target, "page_number")))
            ? Number(Reflect.get(target, "page_number"))
            : null,
          section_ref:
            typeof Reflect.get(target, "section_ref") === "string"
              ? String(Reflect.get(target, "section_ref"))
              : null,
          anchor_text:
            typeof Reflect.get(target, "anchor_text") === "string"
              ? String(Reflect.get(target, "anchor_text"))
              : null,
        }
      : null;
  return {
    note: typeof input.note === "string" ? input.note : null,
    rejectionTarget,
  };
}

export function parseCreateComment(body: unknown) {
  const input = bodyRecord(body);
  const versionId =
    typeof input.version_id === "string" && input.version_id.trim()
      ? input.version_id.trim()
      : null;
  const parentCommentId =
    typeof input.parent_comment_id === "string" ? input.parent_comment_id.trim() : null;
  return {
    versionId,
    parentCommentId,
    body: deferredCommentBody(input.body),
    anchorText: nullableString(input.anchor_text, 1000),
    anchorStart: nullableInteger(input.anchor_start),
    anchorEnd: nullableInteger(input.anchor_end),
  };
}

export function parseCommentUpdate(body: unknown) {
  const input = bodyRecord(body);
  return {
    body: "body" in input ? deferredCommentBody(input.body) : null,
    resolved: "resolved" in input ? Boolean(input.resolved) : null,
  };
}

export function requireDeferredValue<T>(value: DeferredValue<T>): T {
  if (!value.valid) throw validationError(value.message);
  return value.value;
}
