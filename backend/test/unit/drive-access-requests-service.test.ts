import { describe, expect, it, vi } from "vitest";
import type {
  DriveAccessRequest,
  DriveAccessRequestRepository,
} from "../../src/modules/drive/drive.access-request-repository.js";
import {
  DriveAccessRequestsService,
  type DriveAccessRequestEvents,
} from "../../src/modules/drive/drive.access-requests.service.js";
import { ownerGrant, stubAccessAuthority } from "./access-test-helpers.js";

const now = new Date("2026-09-02T00:00:00.000Z");
const request: DriveAccessRequest = {
  id: "request-1",
  workspaceId: "workspace-1",
  requestedByUserId: "requester-1",
  requestedRole: "editor",
  message: "Need contract access",
  status: "pending",
  reviewedByUserId: null,
  reviewedAt: null,
  createdAt: now,
  updatedAt: now,
};

function repository(
  overrides: Partial<DriveAccessRequestRepository> = {},
): DriveAccessRequestRepository {
  return {
    findWorkspace: async () => ({
      id: "workspace-1",
      name: "Contracts",
      ownerId: "owner-1",
    }),
    findUser: async () => ({ fullName: "Requester", email: "requester@example.com" }),
    create: async () => request,
    listWorkspaceAdminUserIds: async () => ["owner-1", "admin-1"],
    find: async () => request,
    findWorkspaceId: async () => request.workspaceId,
    upsertWorkspaceMember: async () => undefined,
    markReviewed: async (input) => ({
      ...request,
      status: input.status,
      reviewedByUserId: input.reviewedByUserId,
      reviewedAt: input.reviewedAt,
      updatedAt: input.reviewedAt,
    }),
    listPending: async () => [],
    ...overrides,
  };
}

function events(overrides: Partial<DriveAccessRequestEvents> = {}): DriveAccessRequestEvents {
  return {
    requested: async () => undefined,
    resolve: async () => undefined,
    approved: async () => undefined,
    rejected: async () => undefined,
    ...overrides,
  };
}

describe("DriveAccessRequestsService", () => {
  it("owns request validation and emits one event for unique workspace admins", async () => {
    const requested = vi.fn();
    const create = vi.fn(async () => request);
    const service = new DriveAccessRequestsService(
      repository({ create }),
      stubAccessAuthority(() => null),
      events({ requested }),
    );

    await expect(
      service.create({
        workspaceId: request.workspaceId,
        requestedByUserId: request.requestedByUserId,
        requestedRole: "editor",
        message: request.message ?? undefined,
      }),
    ).resolves.toEqual(request);
    expect(create).toHaveBeenCalledWith({
      workspaceId: request.workspaceId,
      requestedByUserId: request.requestedByUserId,
      requestedRole: "editor",
      message: request.message,
    });
    expect(requested).toHaveBeenCalledWith(
      expect.objectContaining({ adminUserIds: ["owner-1", "admin-1"] }),
    );
  });

  it("maps an existing owner grant to the drive error contract", async () => {
    const create = vi.fn();
    const service = new DriveAccessRequestsService(
      repository({ create }),
      stubAccessAuthority(() => ownerGrant),
      events(),
    );

    await expect(
      service.create({
        workspaceId: request.workspaceId,
        requestedByUserId: request.requestedByUserId,
        requestedRole: "viewer",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "You are the owner of this workspace",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("grants membership before marking an approval reviewed", async () => {
    const upsertWorkspaceMember = vi.fn(async () => undefined);
    const markReviewed = vi.fn(async (input) => ({
      ...request,
      status: input.status,
      reviewedByUserId: input.reviewedByUserId,
      reviewedAt: input.reviewedAt,
      updatedAt: input.reviewedAt,
    }));
    const resolve = vi.fn(async () => undefined);
    const approved = vi.fn(async () => undefined);
    const service = new DriveAccessRequestsService(
      repository({ upsertWorkspaceMember, markReviewed }),
      stubAccessAuthority(() => null),
      events({ resolve, approved }),
    );

    await expect(
      service.approve({ requestId: request.id, reviewedByUserId: "admin-1" }),
    ).resolves.toMatchObject({ status: "approved", reviewedByUserId: "admin-1" });
    expect(upsertWorkspaceMember).toHaveBeenCalledWith({
      workspaceId: request.workspaceId,
      userId: request.requestedByUserId,
      role: request.requestedRole,
    });
    expect(upsertWorkspaceMember.mock.invocationCallOrder[0]).toBeLessThan(
      markReviewed.mock.invocationCallOrder[0],
    );
    expect(resolve).toHaveBeenCalledWith(request.id);
    expect(approved).toHaveBeenCalledWith(
      expect.objectContaining({ approverUserId: "admin-1", grantedRole: "editor" }),
    );
  });
});
