import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  compileApprovalPolicy,
  getRequiredApprovers,
} from "../../src/modules/approvals/approvals.policy.js";
import {
  ApprovalPolicyConfigurationError,
  type ApprovalRoleDefinition,
  type ApprovalRuleDefinition,
} from "../../src/modules/approvals/approvals.types.js";

const enabledRole = (key: string, sortOrder = 0): ApprovalRoleDefinition => ({
  key,
  label: key,
  description: null,
  enabled: true,
  sortOrder,
});

const rule = (
  key: string,
  roleKey: string,
  pattern: string,
  overrides: Partial<ApprovalRuleDefinition> = {},
): ApprovalRuleDefinition => ({
  key,
  roleKey,
  matchTarget: "content",
  pattern,
  flags: "iu",
  description: key,
  priority: 0,
  enabled: true,
  ...overrides,
});

describe("approval policy compilation", () => {
  it("supports enabled role keys that were not known at build time", () => {
    const policy = compileApprovalPolicy(
      [enabledRole("risk_reviewer")],
      [rule("risk.material_change", "risk_reviewer", "\\bmaterial change\\b")],
    );

    expect(
      getRequiredApprovers(policy, [
        {
          decision: "pending",
          newText: "This amendment is a material change.",
        },
      ]),
    ).toEqual(["risk_reviewer"]);
  });

  it("ignores disabled rules and rules assigned to disabled roles", () => {
    const policy = compileApprovalPolicy(
      [enabledRole("legal_reviewer"), { ...enabledRole("retired_reviewer"), enabled: false }],
      [
        rule("legal.disabled", "legal_reviewer", "\\bliability\\b", { enabled: false }),
        rule("retired.enabled", "retired_reviewer", "\\bliability\\b"),
      ],
    );

    expect(
      getRequiredApprovers(policy, [{ decision: "pending", newText: "Liability changed." }]),
    ).toEqual([]);
  });

  it.each([
    ["invalid pattern", rule("legal.invalid_pattern", "legal_reviewer", "[")],
    [
      "invalid flag",
      rule("legal.invalid_flag", "legal_reviewer", "\\bliability\\b", { flags: "g" }),
    ],
    [
      "duplicate flag",
      rule("legal.duplicate_flag", "legal_reviewer", "\\bliability\\b", { flags: "ii" }),
    ],
  ])("rejects %s", (_name, invalidRule) => {
    expect(() => compileApprovalPolicy([enabledRole("legal_reviewer")], [invalidRule])).toThrow(
      ApprovalPolicyConfigurationError,
    );
  });
});

describe("approval policy source", () => {
  it("contains no customer-specific identity or retired role keys", async () => {
    const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
    const files = [
      "backend/src/db/schema/approvals.ts",
      "backend/src/db/schema/enums.ts",
      "backend/src/modules/approvals/approvals.policy.ts",
      "backend/src/modules/approvals/approvals.service.ts",
      "backend/src/routes/approvals.ts",
      "backend/src/scripts/seedApprovalPolicies.ts",
      "frontend/src/client/store/api/approvalsApi.ts",
      "frontend/src/client/components/pages/ApprovalDecisionPage.tsx",
    ];
    const source = (
      await Promise.all(files.map((file) => readFile(path.join(repositoryRoot, file), "utf8")))
    ).join("\n");

    const retiredTerms = [
      ["ceo", "yum"].join("_"),
      ["bd", "head"].join("_"),
      ["legal", "head"].join("_"),
      ["brand", "head"].join("_"),
      ["brand", "ceo"].join("_"),
      ["finance", "head"].join("_"),
      ["it", "head"].join("_"),
      ["Yum", "Brands"].join(" "),
    ];
    for (const retiredTerm of retiredTerms) {
      expect(source).not.toContain(retiredTerm);
    }
  });
});
