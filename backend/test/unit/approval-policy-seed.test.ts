import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CORE_APPROVAL_ROLES,
  CORE_APPROVAL_RULES,
  validateCoreApprovalPolicySeed,
} from "../../src/scripts/seedApprovalPolicies.js";

describe("core approval policy seed", () => {
  it("defines the neutral core roles", () => {
    expect(CORE_APPROVAL_ROLES.map((role) => role.key)).toEqual([
      "legal_reviewer",
      "business_owner",
      "finance_reviewer",
      "technical_reviewer",
      "executive_approver",
    ]);
    expect(() => validateCoreApprovalPolicySeed()).not.toThrow();
  });

  it("uses semantic rules without customer or clause-number coupling", () => {
    const serializedRules = JSON.stringify(CORE_APPROVAL_RULES);
    const roleKeys = new Set(CORE_APPROVAL_ROLES.map((role) => role.key));

    expect(CORE_APPROVAL_RULES.every((rule) => roleKeys.has(rule.roleKey))).toBe(true);
    expect(serializedRules).not.toMatch(/(?:clause|section|article)\\s\+?\\d/i);
  });

  it("upserts stable role, policy, and rule keys in one transaction", async () => {
    const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
    const seedSource = await readFile(
      path.join(repositoryRoot, "backend/src/scripts/seedApprovalPolicies.ts"),
      "utf8",
    );

    expect(seedSource).toContain("db.transaction");
    expect(seedSource.match(/onConflictDoUpdate/g)).toHaveLength(3);
    expect(seedSource).toContain("target: approvalRoles.key");
    expect(seedSource).toContain("target: approvalPolicies.key");
    expect(seedSource).toContain("target: approvalPolicyRules.key");
    expect(seedSource).toContain(".update(approvalPolicyRules)");
    expect(seedSource).toContain(".set({ enabled: false, updatedAt: new Date() })");
  });
});
