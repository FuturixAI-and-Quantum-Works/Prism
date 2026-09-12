import { describe, expect, it } from "vitest";
import {
  mapWithConcurrency,
  UsagePolicyError,
  UsagePolicyService,
} from "../../src/modules/ai/usagePolicy.js";

describe("UsagePolicyService", () => {
  it("rejects reviews that exceed the explicit model-call budget", () => {
    const policy = new UsagePolicyService({
      concurrency: 2,
      modelCalls: 5,
      outputTokens: 10_000,
    });

    expect(() => policy.createComplianceReviewBudget(2, 1)).toThrow(UsagePolicyError);
  });

  it("accounts for every reserved call and output token", () => {
    const budget = new UsagePolicyService({
      concurrency: 2,
      modelCalls: 4,
      outputTokens: 5_500,
    }).createComplianceReviewBudget(1, 0);

    budget.reserve(1_024);
    budget.reserve(1_000);
    expect(budget.snapshot()).toEqual({ usedCalls: 2, usedOutputTokens: 2_024 });
    expect(() => budget.reserve(4_000)).toThrow(UsagePolicyError);
  });
});

describe("mapWithConcurrency", () => {
  it("bounds active work while retaining input order", async () => {
    let active = 0;
    let maximum = 0;
    const values = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 2;
    });

    expect(maximum).toBe(2);
    expect(values).toEqual([2, 4, 6, 8, 10]);
  });
});
