import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  attentionItems,
  chats,
  db,
  documents,
  outboxEvents,
  projectMembers,
  projects,
  projectSubfolders,
  shareInvitations,
  tabularReviews,
  userProfiles,
  users,
  type Database,
} from "../../db/index.js";
import type {
  CreateProjectInvitationInput,
  PendingProjectInvitationDto,
  Project,
  ProjectActor,
  ProjectChat,
  ProjectCollaborator,
  ProjectFolder,
  ProjectFolderMutationInput,
  ProjectInvitationResult,
  ProjectListItem,
  ProjectMember,
  ProjectMutationInput,
  ProjectPeopleDto,
} from "./projects.types.js";
import type { AccessGrant } from "../access/access.types.js";

type ProjectOwner = Readonly<{
  id: string;
  email: string | null;
  fullName: string | null;
}>;

export interface ProjectsRepository {
  findById(projectId: string): Promise<Project | null>;
  listProjects(
    actor: ProjectActor,
    grants: ReadonlyMap<string, AccessGrant>,
  ): Promise<readonly ProjectListItem[]>;
  createProject(actor: ProjectActor, input: ProjectMutationInput): Promise<Project>;
  updateProject(project: Project, input: ProjectMutationInput): Promise<Project>;
  deleteOwnedProject(projectId: string, userId: string): Promise<void>;
  listFolders(projectId: string): Promise<readonly ProjectFolder[]>;
  createFolder(
    projectId: string,
    userId: string,
    input: Required<Pick<ProjectFolderMutationInput, "name">> &
      Pick<ProjectFolderMutationInput, "parentFolderId">,
  ): Promise<ProjectFolder>;
  updateFolder(
    projectId: string,
    folderId: string,
    input: ProjectFolderMutationInput,
  ): Promise<ProjectFolder | null>;
  deleteFolder(projectId: string, folderId: string): Promise<boolean>;
  listChats(projectId: string): Promise<readonly ProjectChat[]>;
  getProjectOwner(project: Project): Promise<ProjectOwner>;
  listPeople(project: Project): Promise<ProjectPeopleDto>;
  listMembers(projectId: string): Promise<readonly ProjectMember[]>;
  listPendingInvitations(projectId: string): Promise<readonly PendingProjectInvitationDto[]>;
  updateMember(
    projectId: string,
    memberId: string,
    role: ProjectMember["role"],
  ): Promise<ProjectMember | null>;
  removeMember(projectId: string, memberId: string): Promise<boolean>;
  getInviterName(userId: string): Promise<string | null>;
  getUserEmail(userId: string): Promise<string | null>;
  createInvitation(
    project: Project,
    input: CreateProjectInvitationInput,
  ): Promise<ProjectInvitationResult>;
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class DrizzleProjectsRepository implements ProjectsRepository {
  constructor(private readonly database: Database = db) {}

  async findById(projectId: string): Promise<Project | null> {
    const [project] = await this.database
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return project ?? null;
  }

  async listProjects(
    actor: ProjectActor,
    grants: ReadonlyMap<string, AccessGrant>,
  ): Promise<readonly ProjectListItem[]> {
    const projectIds = [...grants.keys()];
    if (projectIds.length === 0) return [];
    const allProjects = await this.database
      .select()
      .from(projects)
      .where(inArray(projects.id, projectIds))
      .orderBy(desc(projects.createdAt));

    const members = await this.database
      .select({
        projectId: projectMembers.projectId,
        id: projectMembers.id,
        userId: projectMembers.userId,
        email: projectMembers.email,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .where(inArray(projectMembers.projectId, projectIds));
    const membersByProject = new Map<string, ProjectCollaborator[]>();
    for (const member of members) {
      const group = membersByProject.get(member.projectId) ?? [];
      group.push(member);
      membersByProject.set(member.projectId, group);
    }

    return Promise.all(
      allProjects.map(async (project) => {
        const [documentCount, chatCount, reviewCount] = await Promise.all([
          this.count(documents, documents.projectId, project.id),
          this.count(chats, chats.projectId, project.id),
          this.count(tabularReviews, tabularReviews.projectId, project.id),
        ]);
        return {
          ...project,
          is_owner: project.userId === actor.userId,
          role: grants.get(project.id)?.role ?? "viewer",
          document_count: documentCount,
          chat_count: chatCount,
          review_count: reviewCount,
          collaborators: membersByProject.get(project.id) ?? [],
        };
      }),
    );
  }

  async createProject(actor: ProjectActor, input: ProjectMutationInput): Promise<Project> {
    const [project] = await this.database
      .insert(projects)
      .values({
        userId: actor.userId,
        name: input.name ?? "",
        cmNumber: input.cmNumber ?? null,
      })
      .returning();
    if (!project) throw new Error("Failed to create project");
    return project;
  }

  async updateProject(project: Project, input: ProjectMutationInput): Promise<Project> {
    const [updated] = await this.database
      .update(projects)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.cmNumber === undefined ? {} : { cmNumber: input.cmNumber }),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id))
      .returning();
    if (!updated) throw new Error("Failed to update project");
    return updated;
  }

  async deleteOwnedProject(projectId: string, userId: string): Promise<void> {
    await this.database
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  }

  listFolders(projectId: string): Promise<readonly ProjectFolder[]> {
    return this.database
      .select()
      .from(projectSubfolders)
      .where(eq(projectSubfolders.projectId, projectId))
      .orderBy(asc(projectSubfolders.createdAt));
  }

  async createFolder(
    projectId: string,
    userId: string,
    input: Required<Pick<ProjectFolderMutationInput, "name">> &
      Pick<ProjectFolderMutationInput, "parentFolderId">,
  ): Promise<ProjectFolder> {
    const [folder] = await this.database
      .insert(projectSubfolders)
      .values({
        projectId,
        userId,
        name: input.name,
        parentFolderId: input.parentFolderId ?? null,
      })
      .returning();
    if (!folder) throw new Error("Failed to create project folder");
    return folder;
  }

  async updateFolder(
    projectId: string,
    folderId: string,
    input: ProjectFolderMutationInput,
  ): Promise<ProjectFolder | null> {
    const [folder] = await this.database
      .update(projectSubfolders)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.parentFolderId === undefined ? {} : { parentFolderId: input.parentFolderId }),
        updatedAt: new Date(),
      })
      .where(and(eq(projectSubfolders.id, folderId), eq(projectSubfolders.projectId, projectId)))
      .returning();
    return folder ?? null;
  }

  async deleteFolder(projectId: string, folderId: string): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const folders = await transaction
        .select({ id: projectSubfolders.id })
        .from(projectSubfolders)
        .where(and(eq(projectSubfolders.id, folderId), eq(projectSubfolders.projectId, projectId)))
        .limit(1);
      if (!folders[0]) return false;
      await transaction
        .update(documents)
        .set({ folderId: null })
        .where(and(eq(documents.folderId, folderId), eq(documents.projectId, projectId)));
      await transaction
        .delete(projectSubfolders)
        .where(and(eq(projectSubfolders.id, folderId), eq(projectSubfolders.projectId, projectId)));
      return true;
    });
  }

  listChats(projectId: string): Promise<readonly ProjectChat[]> {
    return this.database
      .select()
      .from(chats)
      .where(eq(chats.projectId, projectId))
      .orderBy(desc(chats.createdAt));
  }

  async getProjectOwner(project: Project): Promise<ProjectOwner> {
    const [owner] = await this.database
      .select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, project.userId))
      .limit(1);
    return {
      id: owner?.id ?? project.userId,
      email: owner?.email ?? null,
      fullName: owner?.fullName ?? null,
    };
  }

  async listPeople(project: Project): Promise<ProjectPeopleDto> {
    const members = await this.listMembers(project.id);
    const selectedUsers = await this.database
      .select({ id: users.id, email: users.email })
      .from(users);
    const profileIds = selectedUsers.map(({ id }) => id);
    const profiles =
      profileIds.length === 0
        ? []
        : await this.database
            .select({ userId: userProfiles.userId, displayName: userProfiles.displayName })
            .from(userProfiles)
            .where(inArray(userProfiles.userId, profileIds));
    const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
    const userByEmail = new Map(
      selectedUsers.flatMap((user) =>
        user.email ? [[user.email.toLowerCase(), user] as const] : [],
      ),
    );
    const owner = selectedUsers.find(({ id }) => id === project.userId);
    return {
      owner: {
        user_id: project.userId,
        email: owner?.email ?? null,
        display_name: profileByUserId.get(project.userId)?.displayName ?? null,
      },
      members: members.map((member) => {
        const user = member.userId
          ? selectedUsers.find(({ id }) => id === member.userId)
          : userByEmail.get(member.email);
        return {
          email: member.email,
          display_name: user ? (profileByUserId.get(user.id)?.displayName ?? null) : null,
        };
      }),
    };
  }

  listMembers(projectId: string): Promise<readonly ProjectMember[]> {
    return this.database
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(projectMembers.createdAt));
  }

  listPendingInvitations(projectId: string): Promise<readonly PendingProjectInvitationDto[]> {
    return this.database
      .select({
        id: shareInvitations.id,
        email: shareInvitations.email,
        role: shareInvitations.role,
        status: shareInvitations.status,
        expires_at: shareInvitations.expiresAt,
        created_at: shareInvitations.createdAt,
      })
      .from(shareInvitations)
      .where(
        and(
          eq(shareInvitations.resourceType, "project"),
          eq(shareInvitations.projectId, projectId),
          eq(shareInvitations.status, "pending"),
        ),
      );
  }

  async updateMember(
    projectId: string,
    memberId: string,
    role: ProjectMember["role"],
  ): Promise<ProjectMember | null> {
    const [member] = await this.database
      .update(projectMembers)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)))
      .returning();
    return member ?? null;
  }

  async removeMember(projectId: string, memberId: string): Promise<boolean> {
    const [deleted] = await this.database
      .delete(projectMembers)
      .where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)))
      .returning({ id: projectMembers.id });
    return Boolean(deleted);
  }

  async getInviterName(userId: string): Promise<string | null> {
    const owner = await this.getUser(userId);
    return owner?.fullName || owner?.email || null;
  }

  async getUserEmail(userId: string): Promise<string | null> {
    return (await this.getUser(userId))?.email ?? null;
  }

  async createInvitation(
    project: Project,
    input: CreateProjectInvitationInput,
  ): Promise<ProjectInvitationResult> {
    return this.database.transaction((transaction) =>
      this.persistInvitation(transaction, project, input),
    );
  }

  private async count(
    table: typeof documents | typeof chats | typeof tabularReviews,
    projectIdColumn:
      typeof documents.projectId | typeof chats.projectId | typeof tabularReviews.projectId,
    projectId: string,
  ): Promise<number> {
    const [result] = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(eq(projectIdColumn, projectId));
    return Number(result?.count ?? 0);
  }

  private async getUser(userId: string): Promise<ProjectOwner | null> {
    const [user] = await this.database
      .select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  }

  private async persistInvitation(
    transaction: Transaction,
    project: Project,
    input: CreateProjectInvitationInput,
  ): Promise<ProjectInvitationResult> {
    await transaction
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, project.id))
      .limit(1)
      .for("update");
    await transaction
      .update(shareInvitations)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(
        and(
          eq(shareInvitations.resourceType, "project"),
          eq(shareInvitations.projectId, project.id),
          eq(shareInvitations.email, input.email),
          eq(shareInvitations.status, "pending"),
        ),
      );
    const [invitation] = await transaction
      .insert(shareInvitations)
      .values({
        tokenHash: input.tokenHash,
        resourceType: "project",
        projectId: project.id,
        email: input.email,
        role: input.role,
        invitedByUserId: input.invitedByUserId,
        expiresAt: input.expiresAt,
      })
      .returning();
    if (!invitation) throw new Error("Failed to create project invitation");

    await transaction.insert(outboxEvents).values({
      topic: "email.template",
      aggregateType: "share_invitation",
      aggregateId: invitation.id,
      idempotencyKey: `share-invitation:${invitation.id}`,
      maxAttempts: 3,
      payload: {
        providerIdempotencyKey: `share-invitation:${invitation.id}`,
        email: {
          to: input.email,
          template: "project-invitation",
          category: "collaboration",
          data: {
            subject: `Invitation to collaborate on ${project.name}`,
            title: "Project invitation",
            body: `${input.senderName ?? "A teammate"} invited you to collaborate on "${project.name}" in Prism Legal.`,
            actionUrl: input.actionUrl,
            senderName: input.senderName,
            documentName: null,
            projectName: project.name,
            workspaceName: null,
            role: input.role === "editor" ? "Editor" : "Viewer",
            expiresAt: input.expiresAt.toISOString(),
          },
        },
      },
    });

    const [invitee] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${input.email}`)
      .limit(1);
    if (invitee) {
      await transaction.insert(attentionItems).values({
        userId: invitee.id,
        sourceType: "project_invitation",
        sourceId: invitation.id,
        secondarySourceId: project.id,
        severity: "medium",
        title: `Invitation to collaborate on "${project.name}"`,
        description: `${input.senderName ?? "A teammate"} invited you to join as ${input.role}`,
        metadata: {
          resourceType: "project",
          resourceId: project.id,
          resourceName: project.name,
          inviterName: input.senderName,
          role: input.role,
          createdAt: new Date().toISOString(),
        },
      });
    }
    return {
      invitation,
      delivery: { email: input.email, status: "queued", attempts: 0 },
    };
  }
}
