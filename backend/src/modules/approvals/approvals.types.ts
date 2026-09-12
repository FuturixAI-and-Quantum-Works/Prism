export type ApprovalSubjectType = "document" | "drive_file" | "workspace";
export type ApproverRole = string;
export type ApprovalChangeDecision = "accepted" | "pending" | "rejected";
export type ApprovalRuleMatchTarget = "section" | "content";

export type ApprovalChange = Readonly<{
  id?: string | null;
  decision: ApprovalChangeDecision;
  sectionName?: string | null;
  originalText?: string | null;
  newText?: string | null;
  aiSummary?: string | null;
}>;

export type ApprovalRoleDefinition = Readonly<{
  key: ApproverRole;
  label: string;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
}>;

export type ApprovalRuleDefinition = Readonly<{
  key: string;
  roleKey: ApproverRole;
  matchTarget: ApprovalRuleMatchTarget;
  pattern: string;
  flags: string;
  description: string;
  priority: number;
  enabled: boolean;
}>;

export type CompiledApprovalRule = ApprovalRuleDefinition &
  Readonly<{
    expression: RegExp;
  }>;

export type ApprovalPolicy = Readonly<{
  roles: readonly ApprovalRoleDefinition[];
  roleByKey: ReadonlyMap<ApproverRole, ApprovalRoleDefinition>;
  rules: readonly CompiledApprovalRule[];
}>;

export type ApprovalRoleOption = Readonly<{
  role: ApproverRole;
  label: string;
}>;

export type ApprovalActor = Readonly<{
  userId: string;
  email: string;
}>;

export type ApprovalSubject = Readonly<{
  subjectType: ApprovalSubjectType;
  subjectId: string;
  label: string;
  ownerId: string | null;
}>;

export class ApprovalError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApprovalError";
  }
}

export class ApprovalPolicyConfigurationError extends Error {
  readonly statusCode = 503;
}

export function approvalStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode || 500;
  }
  return 500;
}

export function approvalMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
