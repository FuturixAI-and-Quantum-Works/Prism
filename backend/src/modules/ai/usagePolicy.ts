export type ReviewUsagePlan = Readonly<{
  concurrency: number;
  modelCalls: number;
  outputTokens: number;
}>;

export class UsagePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsagePolicyError";
  }
}

export class ReviewUsageBudget {
  private usedCalls = 0;
  private usedOutputTokens = 0;

  constructor(readonly plan: ReviewUsagePlan) {}

  reserve(outputTokens: number): void {
    const nextCalls = this.usedCalls + 1;
    const nextTokens = this.usedOutputTokens + outputTokens;
    if (nextCalls > this.plan.modelCalls || nextTokens > this.plan.outputTokens) {
      throw new UsagePolicyError("Compliance review AI budget exhausted");
    }
    this.usedCalls = nextCalls;
    this.usedOutputTokens = nextTokens;
  }

  snapshot(): Readonly<{ usedCalls: number; usedOutputTokens: number }> {
    return {
      usedCalls: this.usedCalls,
      usedOutputTokens: this.usedOutputTokens,
    };
  }
}

export class UsagePolicyService {
  constructor(
    private readonly limits: ReviewUsagePlan = {
      concurrency: 3,
      modelCalls: 64,
      outputTokens: 70_000,
    },
  ) {}

  createComplianceReviewBudget(ruleCount: number, questionCount: number): ReviewUsageBudget {
    const requestedCalls = ruleCount + questionCount + 3;
    const requestedTokens = (ruleCount + questionCount) * 1_024 + 4_024;
    if (requestedCalls > this.limits.modelCalls || requestedTokens > this.limits.outputTokens) {
      throw new UsagePolicyError("Compliance review exceeds the per-review AI budget");
    }
    return new ReviewUsageBudget({
      concurrency: this.limits.concurrency,
      modelCalls: requestedCalls,
      outputTokens: requestedTokens,
    });
  }

  createTabularReviewBudget(documentCount: number, columnCount: number): ReviewUsageBudget {
    const requestedCalls = documentCount;
    const requestedTokens = documentCount * Math.min(Math.max(columnCount, 1) * 1_024, 8_192);
    if (requestedCalls > this.limits.modelCalls || requestedTokens > this.limits.outputTokens) {
      throw new UsagePolicyError("Tabular review exceeds the per-review AI budget");
    }
    return new ReviewUsageBudget({
      concurrency: this.limits.concurrency,
      modelCalls: requestedCalls,
      outputTokens: requestedTokens,
    });
  }

  tabularPlan(documentCount: number, targetCellCount: number): ReviewUsagePlan {
    const requestedCalls = documentCount;
    const requestedTokens =
      documentCount === 0
        ? 0
        : Math.min(Math.max(Math.ceil(targetCellCount / documentCount), 1) * 1_024, 8_192) *
          documentCount;
    if (requestedCalls > this.limits.modelCalls || requestedTokens > this.limits.outputTokens) {
      throw new UsagePolicyError("Tabular review exceeds the per-review AI budget");
    }
    return {
      concurrency: this.limits.concurrency,
      modelCalls: this.limits.modelCalls,
      outputTokens: this.limits.outputTokens,
    };
  }

  assertTabularRequest(documentCount: number, targetCellCount: number): void {
    this.tabularPlan(documentCount, targetCellCount);
  }
}

export async function mapWithConcurrency<Input, Output>(
  values: readonly Input[],
  concurrency: number,
  mapper: (value: Input, index: number) => Promise<Output>,
): Promise<Output[]> {
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error("Concurrency must be a positive integer");
  }
  const output = new Array<Output>(values.length);
  const entries = values.entries();
  const worker = async (): Promise<void> => {
    for (const [index, value] of entries) {
      output[index] = await mapper(value, index);
    }
  };
  const workerCount = Math.min(concurrency, values.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return output;
}
