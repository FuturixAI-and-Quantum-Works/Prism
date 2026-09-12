import type {
  ApprovalChange,
  ApprovalPolicy,
  ApprovalRoleDefinition,
  ApprovalRoleOption,
  ApprovalRuleDefinition,
  ApprovalRuleMatchTarget,
  ApproverRole,
} from "./approvals.types.js";
import { ApprovalPolicyConfigurationError } from "./approvals.types.js";

const ROLE_KEY_PATTERN = /^[a-z][a-z0-9_]{0,79}$/;
const RULE_KEY_PATTERN = /^[a-z][a-z0-9_.-]{0,119}$/;
const ALLOWED_REGEX_FLAGS = new Set(["i", "m", "s", "u"]);
const MAX_REGEX_PATTERN_LENGTH = 2000;

export function parseApproverRole(value: unknown): ApproverRole {
  if (typeof value !== "string" || !ROLE_KEY_PATTERN.test(value)) {
    throw new Error("Invalid approver role key");
  }
  return value;
}

export function validateApprovalRuleDefinition(
  rule: Pick<ApprovalRuleDefinition, "key" | "pattern" | "flags">,
): RegExp {
  if (!RULE_KEY_PATTERN.test(rule.key)) {
    throw new Error(`Invalid approval rule key: ${rule.key}`);
  }
  if (!rule.pattern || rule.pattern.length > MAX_REGEX_PATTERN_LENGTH) {
    throw new Error(`Invalid approval rule pattern length: ${rule.key}`);
  }
  const flags = [...rule.flags];
  if (
    flags.some((flag) => !ALLOWED_REGEX_FLAGS.has(flag)) ||
    new Set(flags).size !== flags.length
  ) {
    throw new Error(`Invalid approval rule flags: ${rule.key}`);
  }
  try {
    return new RegExp(rule.pattern, rule.flags);
  } catch {
    throw new Error(`Invalid approval rule pattern: ${rule.key}`);
  }
}

export function compileApprovalPolicy(
  roles: readonly ApprovalRoleDefinition[],
  rules: readonly ApprovalRuleDefinition[],
): ApprovalPolicy {
  const allRoles = new Map<ApproverRole, ApprovalRoleDefinition>();
  for (const role of roles) {
    const key = parseApproverRole(role.key);
    if (allRoles.has(key)) {
      throw new ApprovalPolicyConfigurationError(`Duplicate approval role: ${key}`);
    }
    allRoles.set(key, { ...role, key });
  }

  const enabledRoles = [...allRoles.values()]
    .filter((role) => role.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key));
  const roleByKey = new Map(enabledRoles.map((role) => [role.key, role]));
  const compiledRules = rules.flatMap((rule) => {
    if (!rule.enabled) return [];
    const role = allRoles.get(rule.roleKey);
    if (!role) {
      throw new ApprovalPolicyConfigurationError(
        `Approval rule ${rule.key} references an unknown role`,
      );
    }
    if (!role.enabled) return [];
    try {
      const expression = validateApprovalRuleDefinition(rule);
      return [{ ...rule, expression }];
    } catch (error) {
      throw new ApprovalPolicyConfigurationError(
        error instanceof Error ? error.message : "Invalid approval rule",
      );
    }
  });
  compiledRules.sort(
    (left, right) => left.priority - right.priority || left.key.localeCompare(right.key),
  );
  return { roles: enabledRoles, roleByKey, rules: compiledRules };
}

export function roleOptions(roles: readonly ApprovalRoleDefinition[]): ApprovalRoleOption[] {
  return roles
    .filter((role) => role.enabled)
    .map((role) => ({ role: role.key, label: role.label }));
}

export function getApproverRoleLabel(
  role: ApproverRole,
  roles: ReadonlyMap<ApproverRole, ApprovalRoleDefinition>,
): string {
  return roles.get(role)?.label ?? role;
}

function textForRule(change: ApprovalChange, target: ApprovalRuleMatchTarget): string {
  if (target === "section") return change.sectionName?.trim() ?? "";
  return [change.sectionName, change.originalText, change.newText, change.aiSummary]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

export function getApproversForChange(
  policy: ApprovalPolicy,
  change: ApprovalChange,
): ApproverRole[] {
  if (change.decision === "rejected") return [];
  const matched = new Set<ApproverRole>();
  for (const rule of policy.rules) {
    if (rule.expression.test(textForRule(change, rule.matchTarget))) {
      matched.add(rule.roleKey);
    }
  }
  return policy.roles.map((role) => role.key).filter((role) => matched.has(role));
}

export function getRequiredApprovers(
  policy: ApprovalPolicy,
  changes: readonly ApprovalChange[],
): ApproverRole[] {
  const required = new Set<ApproverRole>();
  for (const change of changes) {
    for (const role of getApproversForChange(policy, change)) required.add(role);
  }
  return policy.roles.map((role) => role.key).filter((role) => required.has(role));
}

export function getChangesByApprover(
  policy: ApprovalPolicy,
  changes: readonly ApprovalChange[],
): Record<ApproverRole, ApprovalChange[]> {
  const grouped: Record<ApproverRole, ApprovalChange[]> = Object.fromEntries(
    policy.roles.map((role) => [role.key, []]),
  );
  for (const change of changes) {
    for (const role of getApproversForChange(policy, change)) grouped[role].push(change);
  }
  return grouped;
}

export function getApprovalReason(
  policy: ApprovalPolicy,
  role: ApproverRole,
  changes: readonly ApprovalChange[],
): string {
  const relevantChanges = getChangesByApprover(policy, changes)[role] ?? [];
  if (relevantChanges.length === 0) return "Required for governance approval";
  const sections = relevantChanges
    .map((change) => change.sectionName)
    .filter((section): section is string => Boolean(section))
    .slice(0, 3);
  if (sections.length === 0) {
    return `Required for ${relevantChanges.length} change${relevantChanges.length === 1 ? "" : "s"}`;
  }
  const suffix =
    relevantChanges.length > sections.length
      ? ` and ${relevantChanges.length - sections.length} more`
      : "";
  return `Required for changes in: ${sections.join(", ")}${suffix}`;
}
