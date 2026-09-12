import type { AccessAuthority } from "../access/access.authority.js";
import type {
  ComplianceActor,
  ComplianceDocument,
  CompliancePermission,
  ComplianceScope,
} from "./compliance.types.js";

export function getComplianceScope(
  projectId: string | null | undefined,
  workspaceId: string | null | undefined,
): ComplianceScope | null {
  if (projectId && workspaceId) return null;
  if (workspaceId) return { kind: "workspace", workspaceId };
  if (projectId) return { kind: "project", projectId };
  return { kind: "document" };
}

export function documentBelongsToComplianceScope(
  document: Pick<ComplianceDocument, "projectId" | "workspaceId">,
  scope: ComplianceScope,
): boolean {
  if (scope.kind === "workspace") return document.workspaceId === scope.workspaceId;
  if (scope.kind === "project") return document.projectId === scope.projectId;
  return true;
}

export class ComplianceAuthorizationPolicy {
  constructor(
    private readonly findDocuments: (
      documentIds: readonly string[],
    ) => Promise<readonly ComplianceDocument[]>,
    private readonly authority: AccessAuthority,
  ) {}

  async allowsScope(
    scope: ComplianceScope,
    actor: ComplianceActor,
    permission: CompliancePermission,
  ): Promise<boolean> {
    if (scope.kind === "document") return true;
    if (scope.kind === "workspace") {
      return (
        await this.authority.decide({
          actor,
          resource: { kind: "workspace", id: scope.workspaceId },
          action: permission,
        })
      ).allowed;
    }
    return (
      await this.authority.decide({
        actor,
        resource: { kind: "project", id: scope.projectId },
        action: permission,
      })
    ).allowed;
  }

  async allowsDocuments(
    documentIds: readonly string[],
    scope: ComplianceScope,
    actor: ComplianceActor,
    permission: CompliancePermission,
  ): Promise<boolean> {
    const uniqueIds = [...new Set(documentIds)];
    if (uniqueIds.length === 0) return true;
    const documents = await this.findDocuments(uniqueIds);
    if (documents.length !== uniqueIds.length) return false;
    for (const document of documents) {
      if (!documentBelongsToComplianceScope(document, scope)) return false;
      if (scope.kind !== "document") continue;
      const decision = await this.authority.decide({
        actor,
        resource: { kind: "document", id: document.id },
        action: permission === "read" ? "read_document" : "edit_document",
      });
      if (!decision.allowed) return false;
    }
    return true;
  }
}
