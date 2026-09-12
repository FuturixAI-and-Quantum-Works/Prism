import type { DocumentConverter } from "../../lib/documentConverter.js";
import { enqueueDocumentArtifactCleanup } from "../../jobs/enqueue.js";
import { DocumentArtifactWriter } from "./documents.artifacts.js";
import { DocumentChangesService } from "./documents.changes.service.js";
import { DocumentContextService } from "./documents.context.service.js";
import { DocumentGovernanceRepository } from "./documents.governance.repository.js";
import { DocumentGovernanceService } from "./documents.governance.service.js";
import { DocumentInsightsService } from "./documents.insights.service.js";
import { DocumentPlaceholdersRepository } from "./documents.placeholders.repository.js";
import { DocumentPlaceholdersService } from "./documents.placeholders.service.js";
import { DocumentsRepository } from "./documents.repository.js";
import { createDocumentsRouter } from "./documents.routes.js";
import { DocumentsService, type DocumentCreator } from "./documents.service.js";

export type DocumentsComposition = Readonly<{
  service: DocumentsService;
  creator: DocumentCreator;
  router: ReturnType<typeof createDocumentsRouter>;
}>;

export function createDocumentsComposition(
  converter: Pick<DocumentConverter, "capabilities" | "convert">,
): DocumentsComposition {
  const repository = new DocumentsRepository();
  const service = new DocumentsService(
    repository,
    converter,
    new DocumentArtifactWriter(converter, enqueueDocumentArtifactCleanup),
  );
  const context = new DocumentContextService(repository);
  const insights = new DocumentInsightsService(repository, context);
  const changes = new DocumentChangesService(repository);
  const governance = new DocumentGovernanceService(new DocumentGovernanceRepository());
  const placeholders = new DocumentPlaceholdersService(new DocumentPlaceholdersRepository());
  return {
    service,
    creator: service,
    router: createDocumentsRouter({
      documents: service,
      context,
      insights,
      changes,
      governance,
      placeholders,
    }),
  };
}
