import { WorkflowError, type WorkflowActor } from "./workflows.types.js";

export type RulebookDocumentAccess = (
  documentIds: readonly string[],
  actor: WorkflowActor,
) => Promise<readonly string[]>;

export class RulebookAuthorizationPolicy {
  constructor(private readonly accessibleDocumentIds: RulebookDocumentAccess) {}

  async requireSampleAccess(documentId: string, actor: WorkflowActor): Promise<void> {
    const allowed = await this.accessibleDocumentIds([documentId], actor);
    if (!allowed.includes(documentId)) {
      throw new WorkflowError(404, "Sample document not found");
    }
  }
}
