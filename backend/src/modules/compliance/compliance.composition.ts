import { z } from "zod";
import { getQueueRepository } from "../../jobs/repository.js";
import type { ClaimedJob, WorkHandler, WorkOutcome } from "../../jobs/types.js";
import { completeText } from "../../lib/llm/index.js";
import { getUserModelSettings } from "../../lib/userSettings.js";
import { accessAuthority } from "../access/access.composition.js";
import { UsagePolicyService } from "../ai/usagePolicy.js";
import { createContentTextService } from "../content/contentText.service.js";
import { ComplianceAnalysisService, ComplianceRunCancelledError } from "./compliance.analysis.js";
import { ComplianceAuthorizationPolicy } from "./compliance.policy.js";
import {
  createDrizzleComplianceRepository,
  type ComplianceRunRepository,
} from "./compliance.repository.js";
import { createComplianceRouter } from "./compliance.routes.js";
import { ComplianceService } from "./compliance.service.js";

const jobPayloadSchema = z.object({
  runId: z.string().uuid(),
  reviewId: z.string().uuid(),
  userId: z.string().uuid(),
  requestedModel: z.string().nullable(),
});

function createRepositoryAndPolicy() {
  const repository = createDrizzleComplianceRepository();
  const policy = new ComplianceAuthorizationPolicy(
    (ids) => repository.findDocuments(ids),
    accessAuthority,
  );
  return { repository, policy };
}

export function createProductionComplianceService(): ComplianceService {
  const { repository, policy } = createRepositoryAndPolicy();
  return new ComplianceService(
    repository,
    policy,
    accessAuthority,
    {
      enqueueJob: (input) => getQueueRepository().enqueueJob(input),
      cancelJob: (jobId, now) => getQueueRepository().cancelJob(jobId, now),
    },
    new UsagePolicyService(),
  );
}

export const complianceRouter = createComplianceRouter(createProductionComplianceService());

export function createProductionComplianceJobHandler(): WorkHandler<ClaimedJob> {
  const repository = createDrizzleComplianceRepository();
  const analysis = new ComplianceAnalysisService({
    repository,
    content: createContentTextService(),
    usagePolicy: new UsagePolicyService(),
    getModelSettings: getUserModelSettings,
    completeText,
  });

  return createComplianceJobHandler({ analysis, repository });
}

export function createComplianceJobHandler(input: {
  analysis: Pick<ComplianceAnalysisService, "execute">;
  repository: Pick<ComplianceRunRepository, "failReviewRun" | "isRunCancelled">;
}): WorkHandler<ClaimedJob> {
  return async (claim, signal): Promise<WorkOutcome> => {
    const parsed = jobPayloadSchema.safeParse(claim.payload);
    if (!parsed.success) return { kind: "failed", error: "Invalid compliance job payload" };
    const payload = parsed.data;
    try {
      await input.analysis.execute({
        runId: payload.runId,
        reviewId: payload.reviewId,
        userId: payload.userId,
        requestedModel: payload.requestedModel ?? undefined,
        signal,
      });
      return { kind: "succeeded" };
    } catch (error) {
      const cancelled = await input.repository.isRunCancelled(payload.runId);
      if (cancelled || error instanceof ComplianceRunCancelledError) {
        return { kind: "failed", error: "Compliance run cancelled" };
      }
      const message = error instanceof Error ? error.message : String(error);
      if (claim.attemptNumber < claim.maxAttempts) return { kind: "retry", error: message };
      await input.repository.failReviewRun(payload.runId, payload.reviewId, message);
      return { kind: "failed", error: message };
    }
  };
}
