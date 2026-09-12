import { documentActor, documentEndpoint } from "./documents.http.js";
import type { DocumentInsightsService } from "./documents.insights.service.js";
import { documentIdParamsSchema } from "./documents.validators.js";

export function createDocumentsInsightsController(service: DocumentInsightsService) {
  return {
    generate: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      res.json(await service.generate(documentActor(res), documentId));
    }),
  };
}
