import { pgEnum } from "drizzle-orm/pg-core";

export const approvalSubjectTypeEnum = pgEnum("approval_subject_type", [
  "document",
  "drive_file",
  "workspace",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const documentLifecycleStatusEnum = pgEnum("document_lifecycle_status", [
  "DRAFT",
  "IN_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "FINALIZED",
]);

export const documentRoleEnum = pgEnum("document_role", ["DRAFTER", "REVIEWER", "APPROVER"]);

export const documentChatRoleBadgeEnum = pgEnum("document_chat_role_badge", [
  "DRAFTER",
  "REVIEWER",
  "APPROVER",
  "OWNER_ADMIN",
  "AI",
]);

export const documentAiLabelEnum = pgEnum("document_ai_label", ["AI_LUNA", "AI_LUNA_PRISM"]);

export const documentEmailStatusEnum = pgEnum("document_email_status", [
  "pending",
  "sent",
  "failed",
  "suppressed",
]);

export const shareResourceTypeEnum = pgEnum("share_resource_type", [
  "document",
  "project",
  "workspace",
]);

export const shareRoleEnum = pgEnum("share_role", ["admin", "editor", "viewer"]);

export const shareInvitationStatusEnum = pgEnum("share_invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

export const documentChangeRequestStatusEnum = pgEnum("document_change_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const accessRequestStatusEnum = pgEnum("access_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const authEmailStatusEnum = pgEnum("auth_email_status", [
  "pending",
  "sent",
  "failed",
  "suppressed",
]);

export const ragScopeTypeEnum = pgEnum("rag_scope_type", ["personal", "project", "workspace"]);

export const ragSourceTypeEnum = pgEnum("rag_source_type", ["document", "drive_file"]);

export const ragSourceStatusEnum = pgEnum("rag_source_status", [
  "pending",
  "indexed",
  "failed",
  "skipped_unsupported",
]);

export const complianceReviewStatusEnum = pgEnum("compliance_review_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const complianceRuleStatusEnum = pgEnum("compliance_rule_status", [
  "pending",
  "compliant",
  "non_compliant",
  "partial",
  "error",
]);

export const healthCheckStatusEnum = pgEnum("health_check_status", [
  "operational",
  "degraded",
  "down",
]);

export const attentionItemSourceTypeEnum = pgEnum("attention_item_source_type", [
  "document_risk",
  "compliance_issue",
  "compliance_question",
  "project_invitation",
  "document_invitation",
  "approval_request",
  "workspace_invitation",
  "document_change_request",
  "access_request",
]);

export const attentionItemStatusEnum = pgEnum("attention_item_status", [
  "pending",
  "viewed",
  "resolved",
  "dismissed",
]);

export const notificationIconTypeEnum = pgEnum("notification_icon_type", [
  "document",
  "compliance",
  "comment",
  "approval",
  "workspace",
  "alert",
  "share",
  "mention",
  "system",
]);

export const approvalRuleMatchTargetEnum = pgEnum("approval_rule_match_target", [
  "section",
  "content",
]);

export const aiModelTaskEnum = pgEnum("ai_model_task", ["main", "title", "tabular"]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const jobAttemptStatusEnum = pgEnum("job_attempt_status", [
  "running",
  "succeeded",
  "failed",
]);

export const outboxStatusEnum = pgEnum("outbox_status", [
  "pending",
  "processing",
  "published",
  "failed",
]);
