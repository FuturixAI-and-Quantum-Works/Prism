import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  backfillRetrievalSources,
  retryRetrievalSource,
} from "../modules/retrieval/retrieval.indexing.js";
import { retrievalProvider } from "../modules/retrieval/retrieval.composition.js";
import { listRetrievalSourcesForUser } from "../modules/retrieval/retrieval.query.js";

export const sourcesRouter = Router();

function authContext(res: import("express").Response) {
  return {
    userId: res.locals.auth.user.id,
    userEmail: res.locals.auth.user.email.toLowerCase(),
  };
}

function errorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const status = Number(Reflect.get(error, "statusCode"));
    if (Number.isFinite(status)) return status;
  }
  return 500;
}

sourcesRouter.get("/", requireAuth, async (_req, res) => {
  try {
    const { userId, userEmail } = authContext(res);
    const sources = await listRetrievalSourcesForUser(userId, userEmail);
    res.json({ sources });
  } catch (error) {
    res.status(errorStatus(error)).json({
      detail: error instanceof Error ? error.message : "Failed to list sources",
    });
  }
});

sourcesRouter.get("/health", requireAuth, async (_req, res) => {
  const { userId, userEmail } = authContext(res);
  const health = await retrievalProvider.health();
  const sources = await listRetrievalSourcesForUser(userId, userEmail);
  const failedSources = sources.filter((source) => source.status === "failed");
  const retryableFailures = failedSources.filter((source) => source.retryable);
  const indexingStatus = !health.ok
    ? "unavailable"
    : retryableFailures.length > 0
      ? "degraded"
      : "healthy";
  res.status(health.ok ? 200 : 503).json({
    ok: health.ok,
    status: indexingStatus,
    api_status: health.status ?? null,
    error: health.error ?? null,
    failed_sources: failedSources.length,
    retryable_failures: retryableFailures.length,
    skipped_sources: sources.filter((source) => source.status === "skipped_unsupported").length,
  });
});

sourcesRouter.post("/backfill", requireAuth, async (_req, res) => {
  try {
    const { userId, userEmail } = authContext(res);
    const result = await backfillRetrievalSources(userId, userEmail);
    res.status(202).json(result);
  } catch (error) {
    res.status(errorStatus(error)).json({
      detail: error instanceof Error ? error.message : "Failed to backfill sources",
    });
  }
});

sourcesRouter.post("/:sourceId/retry", requireAuth, async (req, res) => {
  try {
    const { userId, userEmail } = authContext(res);
    const source = await retryRetrievalSource(req.params.sourceId, userId, userEmail);
    res.status(202).json({ source });
  } catch (error) {
    res.status(errorStatus(error)).json({
      detail: error instanceof Error ? error.message : "Failed to retry source",
    });
  }
});

sourcesRouter.post("/retry-all-failed", requireAuth, async (_req, res) => {
  try {
    const { userId, userEmail } = authContext(res);
    const sources = await listRetrievalSourcesForUser(userId, userEmail);
    const failedSources = sources.filter((source) => source.status === "failed");

    let retried = 0;
    let errors = 0;

    for (const source of failedSources) {
      try {
        await retryRetrievalSource(source.id, userId, userEmail);
        retried++;
      } catch {
        errors++;
      }
    }

    res.status(202).json({
      total_failed: failedSources.length,
      retried,
      errors,
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      detail: error instanceof Error ? error.message : "Failed to retry sources",
    });
  }
});
