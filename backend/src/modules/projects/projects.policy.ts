import type { AccessAuthority } from "../access/access.authority.js";
import type { ProjectsRepository } from "./projects.repository.js";
import {
  ProjectError,
  type ProjectAccess,
  type ProjectActor,
  type ProjectPermission,
} from "./projects.types.js";

export class ProjectsAuthorizationPolicy {
  constructor(
    private readonly repository: Pick<ProjectsRepository, "findById">,
    private readonly authority: AccessAuthority,
  ) {}

  async require(
    projectId: string,
    actor: ProjectActor,
    permission: ProjectPermission,
  ): Promise<ProjectAccess> {
    const decision = await this.authority.decide({
      actor,
      resource: { kind: "project", id: projectId },
      action: permission,
    });
    if (!decision.allowed) {
      if (decision.reason === "not-found") throw new ProjectError(404, "Project not found");
      const detail =
        permission === "manage"
          ? "Only the project owner can manage sharing"
          : "You do not have permission to modify this project";
      throw new ProjectError(403, detail);
    }
    const project = await this.repository.findById(projectId);
    if (!project) throw new ProjectError(404, "Project not found");
    return { project, role: decision.grant.role };
  }

  async requireOwner(projectId: string, actor: ProjectActor): Promise<ProjectAccess> {
    const access = await this.require(projectId, actor, "read");
    if (access.role !== "owner") throw new ProjectError(404, "Project not found");
    return access;
  }
}
