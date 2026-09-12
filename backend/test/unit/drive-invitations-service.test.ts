import { describe, expect, it, vi } from "vitest";
import { DrizzleDriveAccessRequestRepository } from "../../src/modules/drive/drive.access-request-repository.js";
import { DrizzleDriveActivityRepository } from "../../src/modules/drive/drive.activity.js";
import { DriveInvitationsService } from "../../src/modules/drive/drive.invitations.service.js";
import { DriveAuthorizationPolicy } from "../../src/modules/drive/drive.policy.js";
import { DrizzleDriveWorkspaceRepository } from "../../src/modules/drive/drive.workspace-repository.js";

const access = {
  role: "admin" as const,
  workspace: {
    id: "workspace-1",
    ownerId: "owner-1",
    name: "Team",
    description: null,
    storageAllocatedBytes: 100n,
    storageUsedBytes: 0n,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe("DriveInvitationsService", () => {
  it("authorizes admins before creating the durable invitation", async () => {
    const workspaces: DrizzleDriveWorkspaceRepository = Object.create(
      DrizzleDriveWorkspaceRepository.prototype,
    );
    const accessRequests: DrizzleDriveAccessRequestRepository = Object.create(
      DrizzleDriveAccessRequestRepository.prototype,
    );
    const policy: DriveAuthorizationPolicy = Object.create(DriveAuthorizationPolicy.prototype);
    const activity: DrizzleDriveActivityRepository = Object.create(
      DrizzleDriveActivityRepository.prototype,
    );
    const authorize = vi.spyOn(policy, "workspace").mockResolvedValue(access);
    vi.spyOn(workspaces, "findUser").mockResolvedValue({
      id: access.workspace.ownerId,
      email: "owner@example.com",
      fullName: "Owner",
    });
    vi.spyOn(workspaces, "findUserByEmail").mockResolvedValue(null);
    vi.spyOn(workspaces, "listWorkspaceMembers").mockResolvedValue([]);
    vi.spyOn(activity, "recordWorkspace").mockResolvedValue();
    const create = vi.fn(async () => ({
      invitation: {
        id: "invitation-1",
        email: "new@example.com",
        role: "editor",
        status: "pending",
        expiresAt: new Date(),
        createdAt: new Date(),
      },
      delivery: { status: "queued" },
    }));
    const service = new DriveInvitationsService(
      workspaces,
      accessRequests,
      policy,
      activity,
      { list: vi.fn(), create },
      {
        create: vi.fn(),
        list: vi.fn(),
        approve: vi.fn(),
        reject: vi.fn(),
      },
    );

    await service.invite({ userId: "admin-1" }, access.workspace.id, {
      email: "new@example.com",
      role: "editor",
    });

    expect(authorize).toHaveBeenCalledWith({ userId: "admin-1" }, access.workspace.id, "admin");
    expect(authorize.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: access.workspace.id }),
    );
  });

  it("rejects an access-request id from another workspace before review", async () => {
    const workspaces: DrizzleDriveWorkspaceRepository = Object.create(
      DrizzleDriveWorkspaceRepository.prototype,
    );
    const accessRequests: DrizzleDriveAccessRequestRepository = Object.create(
      DrizzleDriveAccessRequestRepository.prototype,
    );
    const policy: DriveAuthorizationPolicy = Object.create(DriveAuthorizationPolicy.prototype);
    const activity: DrizzleDriveActivityRepository = Object.create(
      DrizzleDriveActivityRepository.prototype,
    );
    vi.spyOn(policy, "workspace").mockResolvedValue(access);
    vi.spyOn(accessRequests, "findWorkspaceId").mockResolvedValue("workspace-2");
    const approve = vi.fn();
    const service = new DriveInvitationsService(
      workspaces,
      accessRequests,
      policy,
      activity,
      { list: vi.fn(), create: vi.fn() },
      { create: vi.fn(), list: vi.fn(), approve, reject: vi.fn() },
    );

    await expect(
      service.decideAccessRequest(
        { userId: "admin-1" },
        access.workspace.id,
        "request-1",
        "approve",
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(approve).not.toHaveBeenCalled();
  });
});
