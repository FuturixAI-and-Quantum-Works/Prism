import type { DriveActivityRepository } from "./drive.activity.js";
import type {
  DriveAccessRequestRepository,
  PendingDriveAccessRequest,
} from "./drive.access-request-repository.js";
import type { DriveAccessRequests } from "./drive.access-requests.service.js";
import type { DriveAuthorizationPolicy } from "./drive.policy.js";
import type { DriveWorkspaceRepository } from "./drive.repository.js";
import { DriveError, type DriveActor, type WorkspaceMemberRole } from "./drive.types.js";

export type DriveInvitationGateway = Readonly<{
  list(workspaceId: string): Promise<readonly unknown[]>;
  create(input: {
    workspaceId: string;
    workspaceName: string;
    email: string;
    role: WorkspaceMemberRole;
    invitedByUserId: string;
  }): Promise<{
    invitation: {
      id: string;
      email: string;
      role: string;
      status: string;
      expiresAt: Date;
      createdAt: Date;
    };
    delivery: unknown;
  }>;
}>;

export class DriveInvitationsService {
  constructor(
    private readonly workspaces: Pick<
      DriveWorkspaceRepository,
      "findUser" | "findUserByEmail" | "listWorkspaceMembers"
    >,
    private readonly accessRequestRepository: Pick<DriveAccessRequestRepository, "findWorkspaceId">,
    private readonly policy: DriveAuthorizationPolicy,
    private readonly activity: DriveActivityRepository,
    private readonly invitations: DriveInvitationGateway,
    private readonly accessRequests: DriveAccessRequests,
  ) {}

  async list(actor: DriveActor, workspaceId: string) {
    const access = await this.policy.workspace(actor, workspaceId, "admin");
    return this.invitations.list(access.workspace.id);
  }

  async invite(
    actor: DriveActor,
    workspaceId: string,
    input: { email: string; role: WorkspaceMemberRole },
  ) {
    const access = await this.policy.workspace(actor, workspaceId, "admin");
    const owner = await this.workspaces.findUser(access.workspace.ownerId);
    if (owner?.email.toLowerCase() === input.email) {
      throw new DriveError(400, "Workspace owner already has access");
    }
    const target = await this.workspaces.findUserByEmail(input.email);
    if (target) {
      const members = await this.workspaces.listWorkspaceMembers(access.workspace.id);
      if (members.some(({ userId }) => userId === target.id)) {
        throw new DriveError(400, "User is already a member of this workspace");
      }
    }
    const result = await this.invitations.create({
      workspaceId: access.workspace.id,
      workspaceName: access.workspace.name,
      email: input.email,
      role: input.role,
      invitedByUserId: actor.userId,
    });
    await this.activity.recordWorkspace(
      access.workspace.id,
      actor.userId,
      "member_invited",
      { type: "email", id: input.email, name: input.email },
      { role: input.role, invitation_id: result.invitation.id },
    );
    return result;
  }

  requestAccess(
    actor: DriveActor,
    workspaceId: string,
    input: { role: WorkspaceMemberRole; message?: string },
  ) {
    return this.accessRequests.create({
      workspaceId,
      requestedByUserId: actor.userId,
      requestedRole: input.role,
      message: input.message,
    });
  }

  async listAccessRequests(
    actor: DriveActor,
    workspaceId: string,
  ): Promise<readonly PendingDriveAccessRequest[]> {
    const access = await this.policy.workspace(actor, workspaceId, "admin");
    return this.accessRequests.list(access.workspace.id);
  }

  async decideAccessRequest(
    actor: DriveActor,
    workspaceId: string,
    requestId: string,
    action: "approve" | "reject",
  ) {
    const access = await this.policy.workspace(actor, workspaceId, "admin");
    const requestWorkspaceId = await this.accessRequestRepository.findWorkspaceId(requestId);
    if (!requestWorkspaceId || requestWorkspaceId !== access.workspace.id) {
      throw new DriveError(404, "Access request not found");
    }
    const request =
      action === "approve"
        ? await this.accessRequests.approve({
            requestId,
            reviewedByUserId: actor.userId,
          })
        : await this.accessRequests.reject({
            requestId,
            reviewedByUserId: actor.userId,
          });
    await this.activity.recordWorkspace(
      access.workspace.id,
      actor.userId,
      action === "approve" ? "access_request_approved" : "access_request_rejected",
      { type: "user", id: request.requestedByUserId },
    );
    return request;
  }
}
