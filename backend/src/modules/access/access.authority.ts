import { accessAllows, accessDenialReason } from "./access.matrix.js";
import type { AccessRepository } from "./access.repository.js";
import type {
  AccessActor,
  AccessDecision,
  AccessGrant,
  AccessRequest,
  AccessResource,
} from "./access.types.js";

export class AccessAuthority {
  constructor(private readonly repository: AccessRepository) {}

  async decide(request: AccessRequest): Promise<AccessDecision> {
    const grant = await this.repository.findGrant(request.actor, request.resource);
    if (!grant) return { allowed: false, reason: "not-found" };
    return this.decideKnownGrant(request, grant);
  }

  decideKnownGrant(request: AccessRequest, grant: AccessGrant): AccessDecision {
    return accessAllows(grant, request)
      ? { allowed: true, grant }
      : { allowed: false, reason: accessDenialReason(grant, request) };
  }

  findGrant(actor: AccessActor, resource: AccessResource): Promise<AccessGrant | null> {
    return this.repository.findGrant(actor, resource);
  }

  isGlobalAdmin(userId: string): Promise<boolean> {
    return this.repository.isGlobalAdmin(userId);
  }

  listProjectGrants(actor: AccessActor): Promise<ReadonlyMap<string, AccessGrant>> {
    return this.repository.listProjectGrants(actor);
  }

  listWorkspaceGrants(actor: AccessActor): Promise<ReadonlyMap<string, AccessGrant>> {
    return this.repository.listWorkspaceGrants(actor);
  }

  listDocumentGrants(actor: AccessActor): Promise<ReadonlyMap<string, AccessGrant>> {
    return this.repository.listDocumentGrants(actor);
  }

  listTabularReviewGrants(actor: AccessActor): Promise<ReadonlyMap<string, AccessGrant>> {
    return this.repository.listTabularReviewGrants(actor);
  }

  listWorkflowGrants(actor: AccessActor): Promise<ReadonlyMap<string, AccessGrant>> {
    return this.repository.listWorkflowGrants(actor);
  }

  listTemplateGrants(actor: AccessActor): Promise<ReadonlyMap<string, AccessGrant>> {
    return this.repository.listTemplateGrants(actor);
  }

  async filterDocumentIds(actor: AccessActor, documentIds: readonly string[]): Promise<string[]> {
    const uniqueIds = [...new Set(documentIds)];
    const decisions = await Promise.all(
      uniqueIds.map(async (id) => ({
        id,
        decision: await this.decide({
          actor,
          resource: { kind: "document", id },
          action: "read_document",
        }),
      })),
    );
    return decisions.flatMap(({ id, decision }) => (decision.allowed ? [id] : []));
  }
}
