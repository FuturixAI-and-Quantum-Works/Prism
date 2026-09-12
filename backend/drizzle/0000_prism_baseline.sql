CREATE TYPE "public"."access_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ai_model_task" AS ENUM('main', 'title', 'tabular');--> statement-breakpoint
CREATE TYPE "public"."approval_rule_match_target" AS ENUM('section', 'content');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."approval_subject_type" AS ENUM('document', 'drive_file', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."attention_item_source_type" AS ENUM('document_risk', 'compliance_issue', 'compliance_question', 'project_invitation', 'document_invitation', 'approval_request', 'workspace_invitation', 'document_change_request', 'access_request');--> statement-breakpoint
CREATE TYPE "public"."attention_item_status" AS ENUM('pending', 'viewed', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."auth_email_status" AS ENUM('pending', 'sent', 'failed', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."compliance_review_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."compliance_rule_status" AS ENUM('pending', 'compliant', 'non_compliant', 'partial', 'error');--> statement-breakpoint
CREATE TYPE "public"."document_ai_label" AS ENUM('AI_LUNA', 'AI_LUNA_PRISM');--> statement-breakpoint
CREATE TYPE "public"."document_change_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."document_chat_role_badge" AS ENUM('DRAFTER', 'REVIEWER', 'APPROVER', 'OWNER_ADMIN', 'AI');--> statement-breakpoint
CREATE TYPE "public"."document_email_status" AS ENUM('pending', 'sent', 'failed', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."document_lifecycle_status" AS ENUM('DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'FINALIZED');--> statement-breakpoint
CREATE TYPE "public"."document_role" AS ENUM('DRAFTER', 'REVIEWER', 'APPROVER');--> statement-breakpoint
CREATE TYPE "public"."health_check_status" AS ENUM('operational', 'degraded', 'down');--> statement-breakpoint
CREATE TYPE "public"."job_attempt_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_icon_type" AS ENUM('document', 'compliance', 'comment', 'approval', 'workspace', 'alert', 'share', 'mention', 'system');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rag_scope_type" AS ENUM('personal', 'project', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."rag_source_status" AS ENUM('pending', 'indexed', 'failed', 'skipped_unsupported');--> statement-breakpoint
CREATE TYPE "public"."rag_source_type" AS ENUM('document', 'drive_file');--> statement-breakpoint
CREATE TYPE "public"."share_invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."share_resource_type" AS ENUM('document', 'project', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."share_role" AS ENUM('admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"issuer" text NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"template" varchar(120) NOT NULL,
	"trigger_type" varchar(120) NOT NULL,
	"status" "auth_email_status" DEFAULT 'pending' NOT NULL,
	"resend_message_id" varchar(255),
	"error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(255),
	"country" varchar(100),
	"jurisdiction" varchar(255),
	"organization" varchar(255),
	"professional_role" varchar(100),
	"role" varchar(20) DEFAULT 'viewer' NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"storage_limit_bytes" bigint DEFAULT 16106127360 NOT NULL,
	"storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	"message_credits_used" integer DEFAULT 0 NOT NULL,
	"credits_reset_date" timestamp,
	"tier" varchar(50) DEFAULT 'Free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_role_check" CHECK ("user_profiles"."role" in ('admin', 'editor', 'viewer')),
	CONSTRAINT "user_profiles_storage_used_check" CHECK ("user_profiles"."storage_used_bytes" >= 0),
	CONSTRAINT "user_profiles_storage_limit_check" CHECK ("user_profiles"."storage_limit_bytes" >= 0),
	CONSTRAINT "user_profiles_message_credits_used_check" CHECK ("user_profiles"."message_credits_used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid,
	"email" varchar(255) NOT NULL,
	"role" "share_role" NOT NULL,
	"invited_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_subfolders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_folder_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"cm_number" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid,
	"folder_id" uuid,
	"name" varchar(500) NOT NULL,
	"description" text,
	"storage_path" varchar(1000) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"extension" varchar(32),
	"checksum" varchar(128),
	"version" integer DEFAULT 1 NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "files_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid,
	"parent_folder_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"storage_path" varchar(1000) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum" varchar(128),
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"target_name" varchar(500),
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"storage_allocated_bytes" bigint DEFAULT 16106127360 NOT NULL,
	"storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(80) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"target_name" varchar(500),
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid,
	"user_name" varchar(255),
	"user_email" varchar(255),
	"role_badge" "document_chat_role_badge" NOT NULL,
	"ai_label" "document_ai_label",
	"content" text NOT NULL,
	"metadata" jsonb,
	"email_notification" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_id" uuid,
	"user_id" uuid,
	"parent_comment_id" uuid,
	"body" text NOT NULL,
	"anchor_text" text,
	"anchor_start" integer,
	"anchor_end" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_context_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"context_document_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_id" uuid,
	"change_id" varchar(100) NOT NULL,
	"del_w_id" varchar(100),
	"ins_w_id" varchar(100),
	"deleted_text" text,
	"inserted_text" text,
	"context_before" text,
	"context_after" text,
	"reason" text,
	"status" varchar(50) DEFAULT 'pending',
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"template" varchar(120) NOT NULL,
	"trigger_type" varchar(120) NOT NULL,
	"status" "document_email_status" DEFAULT 'pending' NOT NULL,
	"resend_message_id" varchar(255),
	"error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid,
	"email" varchar(255),
	"role" "document_role" NOT NULL,
	"assigned_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_placeholder_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"field_key" varchar(120) NOT NULL,
	"value" text NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid,
	"email" varchar(255) NOT NULL,
	"role" "share_role" NOT NULL,
	"invited_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_state_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"from_status" "document_lifecycle_status",
	"to_status" "document_lifecycle_status" NOT NULL,
	"user_id" uuid,
	"note" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"storage_path" varchar(1000) NOT NULL,
	"pdf_storage_path" varchar(1000),
	"source" varchar(50),
	"version_number" integer,
	"display_name" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"workspace_id" uuid,
	"user_id" uuid NOT NULL,
	"folder_id" uuid,
	"filename" varchar(500) NOT NULL,
	"file_type" varchar(20),
	"size_bytes" integer,
	"page_count" integer,
	"structure_tree" jsonb,
	"status" varchar(50) DEFAULT 'processing',
	"lifecycle_status" "document_lifecycle_status" DEFAULT 'DRAFT' NOT NULL,
	"current_version_id" uuid,
	"attached" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documents_project_workspace_exclusive_chk" CHECK ("documents"."project_id" IS NULL OR "documents"."workspace_id" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "share_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"resource_type" "share_resource_type" NOT NULL,
	"document_id" uuid,
	"project_id" uuid,
	"workspace_id" uuid,
	"email" varchar(255) NOT NULL,
	"role" "share_role" NOT NULL,
	"status" "share_invitation_status" DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"accepted_by_user_id" uuid,
	"accepted_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "share_invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "share_invitations_one_resource_chk" CHECK ((
        "share_invitations"."resource_type" = 'document'
        AND "share_invitations"."document_id" IS NOT NULL
        AND "share_invitations"."project_id" IS NULL
        AND "share_invitations"."workspace_id" IS NULL
      ) OR (
        "share_invitations"."resource_type" = 'project'
        AND "share_invitations"."document_id" IS NULL
        AND "share_invitations"."project_id" IS NOT NULL
        AND "share_invitations"."workspace_id" IS NULL
      ) OR (
        "share_invitations"."resource_type" = 'workspace'
        AND "share_invitations"."document_id" IS NULL
        AND "share_invitations"."project_id" IS NULL
        AND "share_invitations"."workspace_id" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "rag_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" "rag_scope_type" NOT NULL,
	"scope_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"collection_name" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rag_collections_collection_name_unique" UNIQUE("collection_name")
);
--> statement-breakpoint
CREATE TABLE "rag_source_index_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid,
	"scope_type" "rag_scope_type" NOT NULL,
	"scope_id" uuid NOT NULL,
	"source_type" "rag_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"user_id" uuid,
	"project_id" uuid,
	"workspace_id" uuid,
	"filename" varchar(500) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"storage_path" varchar(1000) NOT NULL,
	"checksum" varchar(128),
	"status" "rag_source_status" DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"last_error_code" varchar(80),
	"last_error_category" varchar(80),
	"last_error_details" jsonb,
	"retryable" boolean DEFAULT false NOT NULL,
	"retry_after_seconds" integer,
	"indexed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_approvers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" "approval_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"role" varchar(80) NOT NULL,
	"approver_name" varchar(255) NOT NULL,
	"approver_email" varchar(255) NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"subject_type" "approval_subject_type" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_policies_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "approval_policy_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(120) NOT NULL,
	"policy_id" uuid NOT NULL,
	"role" varchar(80) NOT NULL,
	"match_target" "approval_rule_match_target" NOT NULL,
	"pattern" text NOT NULL,
	"flags" varchar(10) DEFAULT 'i' NOT NULL,
	"description" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_policy_rules_key_unique" UNIQUE("key"),
	CONSTRAINT "approval_policy_rules_key_chk" CHECK ("approval_policy_rules"."key" ~ '^[a-z][a-z0-9_.-]{0,119}$'),
	CONSTRAINT "approval_policy_rules_pattern_length_chk" CHECK (char_length("approval_policy_rules"."pattern") BETWEEN 1 AND 2000),
	CONSTRAINT "approval_policy_rules_flags_chk" CHECK ("approval_policy_rules"."flags" ~ '^[imsu]*$'),
	CONSTRAINT "approval_policy_rules_priority_chk" CHECK ("approval_policy_rules"."priority" >= 0)
);
--> statement-breakpoint
CREATE TABLE "approval_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"subject_type" "approval_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"role" varchar(80) NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"item_id" uuid,
	"title" varchar(500) NOT NULL,
	"original_text" text,
	"new_text" text,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" "approval_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"approver_id" uuid,
	"role" varchar(80) NOT NULL,
	"approver_name" varchar(255) NOT NULL,
	"approver_email" varchar(255) NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"token" varchar(128) NOT NULL,
	"decision_note" text,
	"requested_by_user_id" uuid,
	"decided_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_requests_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "approval_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"label" varchar(120) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_roles_key_unique" UNIQUE("key"),
	CONSTRAINT "approval_roles_key_chk" CHECK ("approval_roles"."key" ~ '^[a-z][a-z0-9_]{0,79}$'),
	CONSTRAINT "approval_roles_sort_order_chk" CHECK ("approval_roles"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_provider_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"name" varchar(120) NOT NULL,
	"credential_version" integer NOT NULL,
	"credential_key_id" varchar(80) NOT NULL,
	"encrypted_credential" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"base_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_provider_models" (
	"id" varchar(150) PRIMARY KEY NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_model_id" varchar(150) NOT NULL,
	"connection_id" uuid,
	"owner_user_id" uuid,
	"display_name" varchar(150) NOT NULL,
	"capabilities" jsonb NOT NULL,
	"tasks" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ai_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task" "ai_model_task" NOT NULL,
	"connection_id" varchar(150) NOT NULL,
	"model_id" varchar(150) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_interview_state" (
	"chat_id" uuid PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"status" varchar(50) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text,
	"files" jsonb,
	"workflow" jsonb,
	"annotations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"workspace_id" uuid,
	"title" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"workspace_id" uuid,
	"title" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hidden_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"shared_by_user_id" uuid NOT NULL,
	"shared_with_email" varchar(255) NOT NULL,
	"allow_edit" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_key" varchar(100),
	"user_id" uuid,
	"title" varchar(500) NOT NULL,
	"type" varchar(50) NOT NULL,
	"prompt_md" text,
	"columns_config" jsonb,
	"practice" varchar(255),
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflows_ownership_chk" CHECK (("workflows"."is_system" AND "workflows"."user_id" IS NULL AND "workflows"."stable_key" IS NOT NULL)
        OR (NOT "workflows"."is_system" AND "workflows"."user_id" IS NOT NULL AND "workflows"."stable_key" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "tabular_cells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"column_index" integer NOT NULL,
	"content" jsonb,
	"status" varchar(50) DEFAULT 'pending',
	"active_run_id" uuid,
	"active_run_epoch" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tabular_review_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text,
	"annotations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tabular_review_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tabular_review_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid,
	"email" varchar(255) NOT NULL,
	"role" "share_role" NOT NULL,
	"shared_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tabular_review_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tabular_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"workflow_id" uuid,
	"title" varchar(500),
	"columns_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tabular_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"event_key" varchar(255) NOT NULL,
	"event" jsonb NOT NULL,
	"error_kind" varchar(40),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tabular_run_events_error_kind_chk" CHECK ("tabular_run_events"."error_kind" IS NULL OR "tabular_run_events"."error_kind" IN ('extraction', 'unsupported-inline-pdf', 'missing-model-result'))
);
--> statement-breakpoint
CREATE TABLE "tabular_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid,
	"idempotency_key" varchar(255) NOT NULL,
	"operation" varchar(30) NOT NULL,
	"request" jsonb NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"error" text,
	"execution_epoch" integer DEFAULT 0 NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL,
	"used_model_calls" integer DEFAULT 0 NOT NULL,
	"used_output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	CONSTRAINT "tabular_runs_status_chk" CHECK ("tabular_runs"."status" IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
	CONSTRAINT "tabular_runs_operation_chk" CHECK ("tabular_runs"."operation" IN ('generate', 'regenerate-cell'))
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_key" varchar(120),
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"content_html" text NOT NULL,
	"fields" jsonb,
	"source_filename" varchar(500),
	"source_storage_path" varchar(1000),
	"source_mime_type" varchar(255),
	"source_checksum" varchar(128),
	"source_metadata" jsonb,
	"is_created_by_user" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "templates_ownership_chk" CHECK (("templates"."is_created_by_user" AND "templates"."user_id" IS NOT NULL AND "templates"."stable_key" IS NULL)
        OR (NOT "templates"."is_created_by_user" AND "templates"."user_id" IS NULL AND "templates"."stable_key" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "compliance_review_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"content" text NOT NULL,
	"status" "compliance_rule_status" DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_review_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"content" text NOT NULL,
	"status" "compliance_rule_status" DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_review_supporting_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"workspace_id" uuid,
	"primary_document_id" uuid,
	"title" varchar(255),
	"status" "compliance_review_status" DEFAULT 'pending' NOT NULL,
	"compliance_score" integer,
	"results" jsonb,
	"ai_insights" jsonb,
	"rag_collection_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_run_events" (
	"sequence" serial PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"event_key" varchar(255) NOT NULL,
	"event" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid,
	"idempotency_key" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	CONSTRAINT "compliance_runs_status_chk" CHECK ("compliance_runs"."status" IN ('queued', 'running', 'completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "service_health_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" varchar(100) NOT NULL,
	"status" "health_check_status" NOT NULL,
	"response_time_ms" integer,
	"error_message" text,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"requested_role" varchar(20) DEFAULT 'viewer' NOT NULL,
	"message" text,
	"status" "access_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attention_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" "attention_item_source_type" NOT NULL,
	"source_id" uuid,
	"secondary_source_id" uuid,
	"severity" varchar(20) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"status" "attention_item_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "document_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"version_id" uuid,
	"change_type" varchar(50) NOT NULL,
	"change_summary" text,
	"change_details" jsonb,
	"status" "document_change_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"icon" "notification_icon_type" DEFAULT 'system' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"read" boolean DEFAULT false NOT NULL,
	"on_email" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp,
	"link" text,
	"resource_type" varchar(50),
	"resource_id" uuid,
	"actor_user_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(80) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" uuid,
	"resource_name" varchar(500),
	"actor_user_id" uuid,
	"actor_name" varchar(255),
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drive_storage_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"state" varchar(32) DEFAULT 'prepared' NOT NULL,
	"payload" jsonb NOT NULL,
	"lease_generation" integer DEFAULT 0 NOT NULL,
	"locked_by" varchar(255),
	"locked_until" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"cleanup_grace_ms" integer DEFAULT 0 NOT NULL,
	"cleanup_until" timestamp,
	"completed_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drive_storage_operations_state_chk" CHECK ("drive_storage_operations"."state" IN ('prepared', 'cleanup', 'committed', 'completed')),
	CONSTRAINT "drive_storage_operations_attempts_chk" CHECK ("drive_storage_operations"."attempts" >= 0 AND "drive_storage_operations"."lease_generation" >= 0 AND "drive_storage_operations"."cleanup_grace_ms" >= 0),
	CONSTRAINT "drive_storage_operations_completion_chk" CHECK (("drive_storage_operations"."state" = 'completed' AND "drive_storage_operations"."completed_at" IS NOT NULL)
        OR ("drive_storage_operations"."state" <> 'completed' AND "drive_storage_operations"."completed_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "job_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" "job_attempt_status" NOT NULL,
	"worker_id" varchar(255) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"error_code" varchar(120),
	"error_message" text,
	"error_details" jsonb,
	CONSTRAINT "job_attempts_attempt_number_chk" CHECK ("job_attempts"."attempt_number" > 0),
	CONSTRAINT "job_attempts_finish_chk" CHECK (("job_attempts"."status" = 'running' AND "job_attempts"."finished_at" IS NULL)
        OR ("job_attempts"."status" IN ('succeeded', 'failed') AND "job_attempts"."finished_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(120) NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" varchar(255),
	"actor_user_id" uuid,
	"priority" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"locked_by" varchar(255),
	"locked_until" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_max_attempts_chk" CHECK ("jobs"."max_attempts" > 0),
	CONSTRAINT "jobs_priority_chk" CHECK ("jobs"."priority" >= 0),
	CONSTRAINT "jobs_terminal_time_chk" CHECK (("jobs"."status" = 'succeeded' AND "jobs"."completed_at" IS NOT NULL AND "jobs"."cancelled_at" IS NULL)
        OR ("jobs"."status" = 'cancelled' AND "jobs"."cancelled_at" IS NOT NULL AND "jobs"."completed_at" IS NULL)
        OR ("jobs"."status" IN ('queued', 'running', 'failed') AND "jobs"."completed_at" IS NULL AND "jobs"."cancelled_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" varchar(120) NOT NULL,
	"aggregate_type" varchar(120) NOT NULL,
	"aggregate_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 10 NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"locked_by" varchar(255),
	"locked_until" timestamp,
	"published_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_attempts_chk" CHECK ("outbox_events"."attempts" >= 0 AND "outbox_events"."max_attempts" > 0 AND "outbox_events"."attempts" <= "outbox_events"."max_attempts"),
	CONSTRAINT "outbox_events_publication_chk" CHECK (("outbox_events"."status" = 'published' AND "outbox_events"."published_at" IS NOT NULL)
        OR ("outbox_events"."status" <> 'published' AND "outbox_events"."published_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_subfolders" ADD CONSTRAINT "project_subfolders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_subfolders" ADD CONSTRAINT "project_subfolders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_subfolders" ADD CONSTRAINT "project_subfolders_parent_folder_id_project_subfolders_id_fk" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."project_subfolders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_folder_id_folders_id_fk" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_activity" ADD CONSTRAINT "file_activity_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_activity" ADD CONSTRAINT "file_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_activity" ADD CONSTRAINT "workspace_activity_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_activity" ADD CONSTRAINT "workspace_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chat_messages" ADD CONSTRAINT "document_chat_messages_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chat_messages" ADD CONSTRAINT "document_chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_version_id_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_parent_comment_id_document_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."document_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_context_files" ADD CONSTRAINT "document_context_files_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_context_files" ADD CONSTRAINT "document_context_files_context_document_id_documents_id_fk" FOREIGN KEY ("context_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_edits" ADD CONSTRAINT "document_edits_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_edits" ADD CONSTRAINT "document_edits_version_id_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_email_events" ADD CONSTRAINT "document_email_events_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_placeholder_values" ADD CONSTRAINT "document_placeholder_values_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_placeholder_values" ADD CONSTRAINT "document_placeholder_values_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_placeholder_values" ADD CONSTRAINT "document_placeholder_values_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_state_transitions" ADD CONSTRAINT "document_state_transitions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_state_transitions" ADD CONSTRAINT "document_state_transitions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_project_subfolders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."project_subfolders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_current_version_id_document_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."document_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_invitations" ADD CONSTRAINT "share_invitations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_invitations" ADD CONSTRAINT "share_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_invitations" ADD CONSTRAINT "share_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_invitations" ADD CONSTRAINT "share_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_invitations" ADD CONSTRAINT "share_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_collections" ADD CONSTRAINT "rag_collections_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_source_index_entries" ADD CONSTRAINT "rag_source_index_entries_collection_id_rag_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."rag_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_source_index_entries" ADD CONSTRAINT "rag_source_index_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_source_index_entries" ADD CONSTRAINT "rag_source_index_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_source_index_entries" ADD CONSTRAINT "rag_source_index_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_approvers" ADD CONSTRAINT "approval_approvers_role_approval_roles_key_fk" FOREIGN KEY ("role") REFERENCES "public"."approval_roles"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_approvers" ADD CONSTRAINT "approval_approvers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policy_rules" ADD CONSTRAINT "approval_policy_rules_policy_id_approval_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."approval_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policy_rules" ADD CONSTRAINT "approval_policy_rules_role_approval_roles_key_fk" FOREIGN KEY ("role") REFERENCES "public"."approval_roles"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_request_items" ADD CONSTRAINT "approval_request_items_request_id_approval_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."approval_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request_items" ADD CONSTRAINT "approval_request_items_role_approval_roles_key_fk" FOREIGN KEY ("role") REFERENCES "public"."approval_roles"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approver_id_approval_approvers_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."approval_approvers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_role_approval_roles_key_fk" FOREIGN KEY ("role") REFERENCES "public"."approval_roles"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_provider_connections" ADD CONSTRAINT "ai_provider_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_provider_models" ADD CONSTRAINT "ai_provider_models_connection_id_ai_provider_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."ai_provider_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_provider_models" ADD CONSTRAINT "ai_provider_models_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ai_preferences" ADD CONSTRAINT "user_ai_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ai_preferences" ADD CONSTRAINT "user_ai_preferences_model_id_ai_provider_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_provider_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_interview_state" ADD CONSTRAINT "chat_interview_state_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_workflows" ADD CONSTRAINT "hidden_workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_workflows" ADD CONSTRAINT "hidden_workflows_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_shares" ADD CONSTRAINT "workflow_shares_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_shares" ADD CONSTRAINT "workflow_shares_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_cells" ADD CONSTRAINT "tabular_cells_review_id_tabular_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."tabular_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_cells" ADD CONSTRAINT "tabular_cells_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_cells" ADD CONSTRAINT "tabular_cells_active_run_id_tabular_runs_id_fk" FOREIGN KEY ("active_run_id") REFERENCES "public"."tabular_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_review_chat_messages" ADD CONSTRAINT "tabular_review_chat_messages_chat_id_tabular_review_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."tabular_review_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_review_chats" ADD CONSTRAINT "tabular_review_chats_review_id_tabular_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."tabular_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_review_chats" ADD CONSTRAINT "tabular_review_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_review_shares" ADD CONSTRAINT "tabular_review_shares_review_id_tabular_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."tabular_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_review_shares" ADD CONSTRAINT "tabular_review_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_review_shares" ADD CONSTRAINT "tabular_review_shares_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_review_sources" ADD CONSTRAINT "tabular_review_sources_review_id_tabular_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."tabular_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_review_sources" ADD CONSTRAINT "tabular_review_sources_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_reviews" ADD CONSTRAINT "tabular_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_reviews" ADD CONSTRAINT "tabular_reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_reviews" ADD CONSTRAINT "tabular_reviews_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_run_events" ADD CONSTRAINT "tabular_run_events_run_id_tabular_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."tabular_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_runs" ADD CONSTRAINT "tabular_runs_review_id_tabular_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."tabular_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_runs" ADD CONSTRAINT "tabular_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabular_runs" ADD CONSTRAINT "tabular_runs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_review_questions" ADD CONSTRAINT "compliance_review_questions_review_id_compliance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."compliance_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_review_rules" ADD CONSTRAINT "compliance_review_rules_review_id_compliance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."compliance_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_review_supporting_docs" ADD CONSTRAINT "compliance_review_supporting_docs_review_id_compliance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."compliance_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_review_supporting_docs" ADD CONSTRAINT "compliance_review_supporting_docs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_primary_document_id_documents_id_fk" FOREIGN KEY ("primary_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_run_events" ADD CONSTRAINT "compliance_run_events_run_id_compliance_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."compliance_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_runs" ADD CONSTRAINT "compliance_runs_review_id_compliance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."compliance_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_runs" ADD CONSTRAINT "compliance_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_runs" ADD CONSTRAINT "compliance_runs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attention_items" ADD CONSTRAINT "attention_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_change_requests" ADD CONSTRAINT "document_change_requests_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_change_requests" ADD CONSTRAINT "document_change_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_change_requests" ADD CONSTRAINT "document_change_requests_version_id_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_change_requests" ADD CONSTRAINT "document_change_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_issuer_account_id_idx" ON "accounts" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_email_events_recipient_idx" ON "auth_email_events" USING btree ("recipient");--> statement-breakpoint
CREATE INDEX "auth_email_events_status_idx" ON "auth_email_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auth_email_events_created_idx" ON "auth_email_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_members_email_idx" ON "project_members" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_user_idx" ON "project_members" USING btree ("project_id","user_id") WHERE "project_members"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_email_idx" ON "project_members" USING btree ("project_id","email");--> statement-breakpoint
CREATE INDEX "project_subfolders_project_idx" ON "project_subfolders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_subfolders_parent_idx" ON "project_subfolders" USING btree ("parent_folder_id");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "files_user_idx" ON "files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "files_workspace_idx" ON "files" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "files_is_primary_idx" ON "files" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "files_folder_idx" ON "files" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "files_user_folder_idx" ON "files" USING btree ("user_id","folder_id");--> statement-breakpoint
CREATE INDEX "files_workspace_folder_idx" ON "files" USING btree ("workspace_id","folder_id");--> statement-breakpoint
CREATE INDEX "files_name_idx" ON "files" USING btree ("name");--> statement-breakpoint
CREATE INDEX "folders_user_idx" ON "folders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "folders_workspace_idx" ON "folders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "folders_parent_idx" ON "folders" USING btree ("parent_folder_id");--> statement-breakpoint
CREATE INDEX "folders_user_parent_idx" ON "folders" USING btree ("user_id","parent_folder_id");--> statement-breakpoint
CREATE INDEX "folders_workspace_parent_idx" ON "folders" USING btree ("workspace_id","parent_folder_id");--> statement-breakpoint
CREATE INDEX "file_activity_file_idx" ON "file_activity" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_activity_user_idx" ON "file_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "file_activity_action_idx" ON "file_activity" USING btree ("action");--> statement-breakpoint
CREATE INDEX "file_versions_file_idx" ON "file_versions" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "file_versions_unique_idx" ON "file_versions" USING btree ("file_id","version_number");--> statement-breakpoint
CREATE INDEX "workspace_activity_workspace_idx" ON "workspace_activity" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_activity_user_idx" ON "workspace_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_activity_action_idx" ON "workspace_activity" USING btree ("action");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_idx" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_unique_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspaces_owner_idx" ON "workspaces" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "document_activity_document_idx" ON "document_activity" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_activity_user_idx" ON "document_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_activity_action_idx" ON "document_activity" USING btree ("action");--> statement-breakpoint
CREATE INDEX "document_chat_messages_document_idx" ON "document_chat_messages" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_chat_messages_created_idx" ON "document_chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "document_comments_document_idx" ON "document_comments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_comments_version_idx" ON "document_comments" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "document_comments_parent_idx" ON "document_comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "document_comments_user_idx" ON "document_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_context_files_document_idx" ON "document_context_files" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_context_files_context_idx" ON "document_context_files" USING btree ("context_document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_context_files_unique_idx" ON "document_context_files" USING btree ("document_id","context_document_id");--> statement-breakpoint
CREATE INDEX "document_edits_document_idx" ON "document_edits" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_email_events_document_idx" ON "document_email_events" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_email_events_recipient_idx" ON "document_email_events" USING btree ("recipient");--> statement-breakpoint
CREATE INDEX "document_email_events_status_idx" ON "document_email_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_members_document_idx" ON "document_members" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_members_user_idx" ON "document_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_members_email_idx" ON "document_members" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "document_members_document_user_idx" ON "document_members" USING btree ("document_id","user_id") WHERE "document_members"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "document_members_document_email_idx" ON "document_members" USING btree ("document_id","email") WHERE "document_members"."email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "document_placeholder_values_document_idx" ON "document_placeholder_values" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_placeholder_values_field_idx" ON "document_placeholder_values" USING btree ("field_key");--> statement-breakpoint
CREATE UNIQUE INDEX "document_placeholder_values_document_field_idx" ON "document_placeholder_values" USING btree ("document_id","field_key");--> statement-breakpoint
CREATE INDEX "document_shares_document_idx" ON "document_shares" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_shares_user_idx" ON "document_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_shares_email_idx" ON "document_shares" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "document_shares_document_user_idx" ON "document_shares" USING btree ("document_id","user_id") WHERE "document_shares"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "document_shares_document_email_idx" ON "document_shares" USING btree ("document_id","email");--> statement-breakpoint
CREATE INDEX "document_state_transitions_document_idx" ON "document_state_transitions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_state_transitions_created_idx" ON "document_state_transitions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "document_versions_document_idx" ON "document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_project_idx" ON "documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "documents_workspace_idx" ON "documents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "documents_user_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_attached_idx" ON "documents" USING btree ("attached");--> statement-breakpoint
CREATE INDEX "documents_is_primary_idx" ON "documents" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "share_invitations_token_idx" ON "share_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "share_invitations_document_idx" ON "share_invitations" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "share_invitations_project_idx" ON "share_invitations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "share_invitations_workspace_idx" ON "share_invitations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "share_invitations_email_idx" ON "share_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "share_invitations_status_idx" ON "share_invitations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "rag_collections_scope_idx" ON "rag_collections" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "rag_collections_owner_idx" ON "rag_collections" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "rag_source_index_entries_collection_idx" ON "rag_source_index_entries" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "rag_source_index_entries_scope_idx" ON "rag_source_index_entries" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "rag_source_index_entries_source_idx" ON "rag_source_index_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "rag_source_index_entries_project_idx" ON "rag_source_index_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "rag_source_index_entries_workspace_idx" ON "rag_source_index_entries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "rag_source_index_entries_status_idx" ON "rag_source_index_entries" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "rag_source_index_entries_source_version_idx" ON "rag_source_index_entries" USING btree ("source_type","source_id","version_id");--> statement-breakpoint
CREATE INDEX "approval_approvers_subject_idx" ON "approval_approvers" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "approval_approvers_role_idx" ON "approval_approvers" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_approvers_subject_role_idx" ON "approval_approvers" USING btree ("subject_type","subject_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_policies_default_subject_idx" ON "approval_policies" USING btree ("subject_type") WHERE "approval_policies"."is_default";--> statement-breakpoint
CREATE INDEX "approval_policies_creator_idx" ON "approval_policies" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "approval_policy_rules_policy_idx" ON "approval_policy_rules" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "approval_policy_rules_role_idx" ON "approval_policy_rules" USING btree ("role");--> statement-breakpoint
CREATE INDEX "approval_request_items_request_idx" ON "approval_request_items" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "approval_request_items_subject_idx" ON "approval_request_items" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "approval_request_items_role_idx" ON "approval_request_items" USING btree ("role");--> statement-breakpoint
CREATE INDEX "approval_requests_subject_idx" ON "approval_requests" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "approval_requests_status_idx" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_requests_token_idx" ON "approval_requests" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_provider_connections_user_name_idx" ON "ai_provider_connections" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "ai_provider_connections_user_provider_idx" ON "ai_provider_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "ai_provider_models_provider_idx" ON "ai_provider_models" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ai_provider_models_connection_idx" ON "ai_provider_models" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "ai_provider_models_owner_idx" ON "ai_provider_models" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_ai_preferences_user_task_idx" ON "user_ai_preferences" USING btree ("user_id","task");--> statement-breakpoint
CREATE INDEX "user_ai_preferences_connection_idx" ON "user_ai_preferences" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "user_ai_preferences_model_idx" ON "user_ai_preferences" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "chat_messages_chat_idx" ON "chat_messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_idx" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_project_idx" ON "chat_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_workspace_idx" ON "chat_sessions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_updated_at_idx" ON "chat_sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "chats_user_idx" ON "chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chats_project_idx" ON "chats" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "chats_workspace_idx" ON "chats" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "chats_session_idx" ON "chats" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hidden_workflows_unique_idx" ON "hidden_workflows" USING btree ("user_id","workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_shares_workflow_idx" ON "workflow_shares" USING btree ("workflow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_shares_unique_idx" ON "workflow_shares" USING btree ("workflow_id","shared_with_email");--> statement-breakpoint
CREATE INDEX "workflows_user_idx" ON "workflows" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_stable_key_unique_idx" ON "workflows" USING btree ("stable_key");--> statement-breakpoint
CREATE INDEX "tabular_cells_review_idx" ON "tabular_cells" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "tabular_cells_document_idx" ON "tabular_cells" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_cells_review_document_column_idx" ON "tabular_cells" USING btree ("review_id","document_id","column_index");--> statement-breakpoint
CREATE INDEX "tabular_review_chat_messages_chat_idx" ON "tabular_review_chat_messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "tabular_review_chats_review_idx" ON "tabular_review_chats" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "tabular_review_shares_review_idx" ON "tabular_review_shares" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "tabular_review_shares_user_idx" ON "tabular_review_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tabular_review_shares_email_idx" ON "tabular_review_shares" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_review_shares_review_user_idx" ON "tabular_review_shares" USING btree ("review_id","user_id") WHERE "tabular_review_shares"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_review_shares_review_email_idx" ON "tabular_review_shares" USING btree ("review_id","email");--> statement-breakpoint
CREATE INDEX "tabular_review_sources_review_idx" ON "tabular_review_sources" USING btree ("review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_review_sources_unique_idx" ON "tabular_review_sources" USING btree ("review_id","document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_review_sources_order_idx" ON "tabular_review_sources" USING btree ("review_id","sort_order");--> statement-breakpoint
CREATE INDEX "tabular_reviews_user_idx" ON "tabular_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tabular_reviews_project_idx" ON "tabular_reviews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tabular_reviews_workflow_idx" ON "tabular_reviews" USING btree ("workflow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_run_events_run_event_key_idx" ON "tabular_run_events" USING btree ("run_id","event_key");--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_run_events_run_sequence_idx" ON "tabular_run_events" USING btree ("run_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_runs_idempotency_idx" ON "tabular_runs" USING btree ("review_id","user_id","operation","idempotency_key");--> statement-breakpoint
CREATE INDEX "tabular_runs_review_created_idx" ON "tabular_runs" USING btree ("review_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_runs_active_review_idx" ON "tabular_runs" USING btree ("review_id") WHERE "tabular_runs"."status" IN ('queued', 'running');--> statement-breakpoint
CREATE UNIQUE INDEX "tabular_runs_job_idx" ON "tabular_runs" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "templates_stable_key_idx" ON "templates" USING btree ("stable_key");--> statement-breakpoint
CREATE INDEX "templates_user_idx" ON "templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "templates_source_filename_idx" ON "templates" USING btree ("source_filename");--> statement-breakpoint
CREATE INDEX "templates_is_created_by_user_idx" ON "templates" USING btree ("is_created_by_user");--> statement-breakpoint
CREATE INDEX "compliance_review_questions_review_idx" ON "compliance_review_questions" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "compliance_review_questions_status_idx" ON "compliance_review_questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "compliance_review_rules_review_idx" ON "compliance_review_rules" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "compliance_review_rules_status_idx" ON "compliance_review_rules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "compliance_review_supporting_docs_review_idx" ON "compliance_review_supporting_docs" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "compliance_review_supporting_docs_document_idx" ON "compliance_review_supporting_docs" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_review_supporting_docs_unique_idx" ON "compliance_review_supporting_docs" USING btree ("review_id","document_id");--> statement-breakpoint
CREATE INDEX "compliance_reviews_user_idx" ON "compliance_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "compliance_reviews_project_idx" ON "compliance_reviews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "compliance_reviews_workspace_idx" ON "compliance_reviews" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "compliance_reviews_primary_doc_idx" ON "compliance_reviews" USING btree ("primary_document_id");--> statement-breakpoint
CREATE INDEX "compliance_reviews_status_idx" ON "compliance_reviews" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_run_events_run_event_key_idx" ON "compliance_run_events" USING btree ("run_id","event_key");--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_runs_idempotency_idx" ON "compliance_runs" USING btree ("review_id","user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "compliance_runs_review_created_idx" ON "compliance_runs" USING btree ("review_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_runs_job_idx" ON "compliance_runs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "service_health_checks_service_name_idx" ON "service_health_checks" USING btree ("service_name");--> statement-breakpoint
CREATE INDEX "service_health_checks_checked_at_idx" ON "service_health_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "service_health_checks_service_checked_idx" ON "service_health_checks" USING btree ("service_name","checked_at");--> statement-breakpoint
CREATE INDEX "access_requests_workspace_idx" ON "access_requests" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "access_requests_requester_idx" ON "access_requests" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "access_requests_status_idx" ON "access_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "access_requests_created_idx" ON "access_requests" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "access_requests_workspace_requester_pending_idx" ON "access_requests" USING btree ("workspace_id","requested_by_user_id") WHERE "access_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "attention_items_user_idx" ON "attention_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attention_items_user_status_idx" ON "attention_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "attention_items_source_idx" ON "attention_items" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "attention_items_created_idx" ON "attention_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "document_change_requests_document_idx" ON "document_change_requests" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_change_requests_requester_idx" ON "document_change_requests" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "document_change_requests_status_idx" ON "document_change_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_change_requests_created_idx" ON "document_change_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_resource_idx" ON "notifications" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "user_activity_user_idx" ON "user_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_activity_user_created_idx" ON "user_activity" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_activity_resource_idx" ON "user_activity" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drive_storage_operations_idempotency_idx" ON "drive_storage_operations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "drive_storage_operations_claim_idx" ON "drive_storage_operations" USING btree ("state","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_attempts_job_attempt_idx" ON "job_attempts" USING btree ("job_id","attempt_number");--> statement-breakpoint
CREATE INDEX "job_attempts_status_idx" ON "job_attempts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_idempotency_idx" ON "jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "jobs_claim_idx" ON "jobs" USING btree ("status","available_at","priority");--> statement-breakpoint
CREATE INDEX "jobs_actor_idx" ON "jobs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_events_idempotency_idx" ON "outbox_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_events_dispatch_idx" ON "outbox_events" USING btree ("status","available_at");