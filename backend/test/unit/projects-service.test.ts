import { describe, expect, it, vi } from "vitest";
import { ProjectsAuthorizationPolicy } from "../../src/modules/projects/projects.policy.js";
import type { ProjectsRepository } from "../../src/modules/projects/projects.repository.js";
import { ProjectsService } from "../../src/modules/projects/projects.service.js";
import type { AccessAuthority } from "../../src/modules/access/access.authority.js";
import { ownerGrant, stubAccessAuthority } from "./access-test-helpers.js";

const now = new Date("2026-09-02T00:00:00.000Z");
const actor = { userId: "user-1", email: "owner@example.com" };
const project = {
  id: "project-1",
  userId: actor.userId,
  name: "Matter",
  cmNumber: null,
  createdAt: now,
  updatedAt: now,
};

function repository(overrides: Partial<ProjectsRepository> = {}): ProjectsRepository {
  const base: ProjectsRepository = {
    findById: async () => project,
    listProjects: async () => [],
    createProject: async () => project,
    updateProject: async (value) => value,
    deleteOwnedProject: async () => undefined,
    listFolders: async () => [],
    createFolder: async (_projectId, userId, input) => ({
      id: "folder-1",
      projectId: project.id,
      userId,
      name: input.name,
      parentFolderId: input.parentFolderId ?? null,
      createdAt: now,
      updatedAt: now,
    }),
    updateFolder: async () => null,
    deleteFolder: async () => true,
    listChats: async () => [],
    getProjectOwner: async () => ({
      id: actor.userId,
      email: actor.email,
      fullName: "Owner",
    }),
    listPeople: async () => ({
      owner: { user_id: actor.userId, email: actor.email, display_name: "Owner" },
      members: [],
    }),
    listMembers: async () => [],
    listPendingInvitations: async () => [],
    updateMember: async () => null,
    removeMember: async () => true,
    getInviterName: async () => "Owner",
    getUserEmail: async () => actor.email,
    createInvitation: async () => {
      throw new Error("unused");
    },
  };
  return Object.assign(base, overrides);
}

function service(
  projectsRepository: ProjectsRepository,
  authority: AccessAuthority = stubAccessAuthority(),
): ProjectsService {
  return new ProjectsService(
    projectsRepository,
    new ProjectsAuthorizationPolicy(projectsRepository, authority),
    authority,
    {
      frontendUrl: "https://app.example.com",
      expiryDays: 7,
      createToken: () => "fixed-token",
      now: () => now,
    },
  );
}

describe("ProjectsService", () => {
  it("returns the canonical project detail DTO", async () => {
    const folder = {
      id: "folder-1",
      projectId: project.id,
      userId: actor.userId,
      name: "Evidence",
      parentFolderId: null,
      createdAt: now,
      updatedAt: now,
    };
    const instance = service(repository({ listFolders: async () => [folder] }));

    await expect(instance.get(actor, project.id)).resolves.toEqual({
      id: project.id,
      userId: actor.userId,
      name: "Matter",
      cmNumber: null,
      createdAt: now,
      updatedAt: now,
      is_owner: true,
      role: "owner",
      folders: [folder],
    });
  });

  it("loads the folder tree once when validating a move", async () => {
    const listFolders = vi.fn(async () => [
      {
        id: "parent",
        projectId: project.id,
        userId: actor.userId,
        name: "Parent",
        parentFolderId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "child",
        projectId: project.id,
        userId: actor.userId,
        name: "Child",
        parentFolderId: "parent",
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const updateFolder = vi.fn();
    const instance = service(repository({ listFolders, updateFolder }));

    await expect(
      instance.updateFolder(actor, project.id, "parent", { parentFolderId: "child" }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Cannot move a folder into itself or a descendant",
    });
    expect(listFolders).toHaveBeenCalledOnce();
    expect(updateFolder).not.toHaveBeenCalled();
  });

  it("keeps project updates separate from invitation creation", async () => {
    const updateProject = vi.fn(async (value) => value);
    const instance = service(repository({ updateProject }));

    const result = await instance.update(actor, project.id, { name: "Renamed" });

    expect(updateProject).toHaveBeenCalledWith(project, { name: "Renamed" });
    expect(result).not.toHaveProperty("invite_email_results");
  });

  it("checks write access before creating a folder", async () => {
    const createFolder = vi.fn();
    const projectsRepository = repository({ createFolder });
    const authority = stubAccessAuthority(() => ({ ...ownerGrant, role: "viewer" }));
    await expect(
      service(projectsRepository, authority).createFolder(actor, project.id, {
        name: "Evidence",
        parentFolderId: null,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(createFolder).not.toHaveBeenCalled();
  });
});
