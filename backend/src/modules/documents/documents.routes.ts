import { Router } from "express";
import { createDocumentsChangesRouter } from "./documents.changes.routes.js";
import type { DocumentChangesService } from "./documents.changes.service.js";
import { createDocumentsContextRouter } from "./documents.context.routes.js";
import type { DocumentContextService } from "./documents.context.service.js";
import { createDocumentsContentRouter } from "./documents.content.routes.js";
import { createDocumentsCoreRouter } from "./documents.core.routes.js";
import { createDocumentsGovernanceRouter } from "./documents.governance.routes.js";
import type { DocumentGovernanceService } from "./documents.governance.service.js";
import { createDocumentsInsightsRouter } from "./documents.insights.routes.js";
import type { DocumentInsightsService } from "./documents.insights.service.js";
import { createDocumentsPlaceholdersRouter } from "./documents.placeholders.routes.js";
import type { DocumentPlaceholdersService } from "./documents.placeholders.service.js";
import type { DocumentsService } from "./documents.service.js";

export type DocumentsRouteServices = Readonly<{
  documents: DocumentsService;
  context: DocumentContextService;
  insights: DocumentInsightsService;
  changes: DocumentChangesService;
  governance: DocumentGovernanceService;
  placeholders: DocumentPlaceholdersService;
}>;

export function createDocumentsRouter(services: DocumentsRouteServices): Router {
  const router = Router();
  router.use("/", createDocumentsContentRouter(services.documents));
  router.use("/", createDocumentsContextRouter(services.context));
  router.use("/", createDocumentsInsightsRouter(services.insights));
  router.use("/", createDocumentsChangesRouter(services.changes));
  router.use("/", createDocumentsGovernanceRouter(services.governance));
  router.use("/", createDocumentsPlaceholdersRouter(services.placeholders));
  router.use("/", createDocumentsCoreRouter(services.documents));
  return router;
}
