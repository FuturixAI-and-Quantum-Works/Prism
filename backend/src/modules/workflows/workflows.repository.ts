import { and, desc, eq, inArray, or } from "drizzle-orm";
import {
  db,
  hiddenWorkflows,
  userProfiles,
  users,
  workflows,
  workflowShares,
  type Database,
} from "../../db/index.js";
import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  Workflow,
  WorkflowActor,
  WorkflowShare,
  WorkflowType,
} from "./workflows.types.js";

export type AccessibleWorkflow = Readonly<{
  workflow: Workflow;
  sharedByName: string | null;
}>;

export interface WorkflowsRepository {
  findByIdentifier(identifier: string): Promise<Workflow | null>;
  listAccessible(
    workflowIds: readonly string[],
    email: string,
    type?: WorkflowType,
  ): Promise<readonly AccessibleWorkflow[]>;
  create(userId: string, input: CreateWorkflowInput): Promise<Workflow>;
  update(id: string, input: UpdateWorkflowInput): Promise<Workflow | null>;
  delete(id: string): Promise<void>;
  listHidden(userId: string): Promise<readonly Workflow[]>;
  hide(userId: string, workflowId: string): Promise<void>;
  unhide(userId: string, workflowId: string): Promise<void>;
  listShares(workflowId: string): Promise<readonly WorkflowShare[]>;
  upsertShares(
    workflowId: string,
    actor: WorkflowActor,
    emails: readonly string[],
    allowEdit: boolean,
  ): Promise<void>;
  deleteShare(workflowId: string, shareId: string): Promise<void>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class DrizzleWorkflowsRepository implements WorkflowsRepository {
  constructor(private readonly database: Database = db) {}

  async findByIdentifier(identifier: string): Promise<Workflow | null> {
    const condition = UUID_PATTERN.test(identifier)
      ? or(eq(workflows.id, identifier), eq(workflows.stableKey, identifier))
      : eq(workflows.stableKey, identifier);
    const [workflow] = await this.database.select().from(workflows).where(condition).limit(1);
    return workflow ?? null;
  }

  async listAccessible(
    workflowIds: readonly string[],
    email: string,
    type?: WorkflowType,
  ): Promise<readonly AccessibleWorkflow[]> {
    if (workflowIds.length === 0) return [];
    const visible = await this.database
      .select()
      .from(workflows)
      .where(
        and(inArray(workflows.id, [...workflowIds]), type ? eq(workflows.type, type) : undefined),
      )
      .orderBy(desc(workflows.createdAt));
    if (visible.length === 0) return [];
    const shares = await this.database
      .select()
      .from(workflowShares)
      .where(
        and(
          inArray(
            workflowShares.workflowId,
            visible.map(({ id }) => id),
          ),
          eq(workflowShares.sharedWithEmail, email),
        ),
      );
    const sharerIds = [...new Set(shares.map(({ sharedByUserId }) => sharedByUserId))];
    const [profiles, sharers] =
      sharerIds.length === 0
        ? [[], []]
        : await Promise.all([
            this.database
              .select({ userId: userProfiles.userId, displayName: userProfiles.displayName })
              .from(userProfiles)
              .where(inArray(userProfiles.userId, sharerIds)),
            this.database
              .select({ id: users.id, email: users.email, fullName: users.fullName })
              .from(users)
              .where(inArray(users.id, sharerIds)),
          ]);
    const shareByWorkflow = new Map(shares.map((share) => [share.workflowId, share]));
    return visible.map((workflow) => {
      const share = shareByWorkflow.get(workflow.id);
      const profile = share
        ? profiles.find(({ userId }) => userId === share.sharedByUserId)
        : undefined;
      const user = share ? sharers.find(({ id }) => id === share.sharedByUserId) : undefined;
      return {
        workflow,
        sharedByName: profile?.displayName || user?.fullName || user?.email || null,
      };
    });
  }

  async create(userId: string, input: CreateWorkflowInput): Promise<Workflow> {
    const [workflow] = await this.database
      .insert(workflows)
      .values({
        userId,
        title: input.title,
        type: input.type,
        promptMd: input.promptMd ?? null,
        columnsConfig: input.columnsConfig ?? null,
        practice: input.practice ?? null,
        isSystem: false,
      })
      .returning();
    if (!workflow) throw new Error("Failed to create workflow");
    return workflow;
  }

  async update(id: string, input: UpdateWorkflowInput): Promise<Workflow | null> {
    const [workflow] = await this.database
      .update(workflows)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return workflow ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.database.delete(workflows).where(eq(workflows.id, id));
  }

  listHidden(userId: string): Promise<readonly Workflow[]> {
    return this.database
      .select({
        id: workflows.id,
        stableKey: workflows.stableKey,
        userId: workflows.userId,
        title: workflows.title,
        type: workflows.type,
        promptMd: workflows.promptMd,
        columnsConfig: workflows.columnsConfig,
        practice: workflows.practice,
        isSystem: workflows.isSystem,
        createdAt: workflows.createdAt,
        updatedAt: workflows.updatedAt,
      })
      .from(hiddenWorkflows)
      .innerJoin(workflows, eq(hiddenWorkflows.workflowId, workflows.id))
      .where(eq(hiddenWorkflows.userId, userId));
  }

  async hide(userId: string, workflowId: string): Promise<void> {
    await this.database
      .insert(hiddenWorkflows)
      .values({ userId, workflowId })
      .onConflictDoNothing();
  }

  async unhide(userId: string, workflowId: string): Promise<void> {
    await this.database
      .delete(hiddenWorkflows)
      .where(and(eq(hiddenWorkflows.userId, userId), eq(hiddenWorkflows.workflowId, workflowId)));
  }

  listShares(workflowId: string): Promise<readonly WorkflowShare[]> {
    return this.database
      .select()
      .from(workflowShares)
      .where(eq(workflowShares.workflowId, workflowId))
      .orderBy(workflowShares.createdAt);
  }

  async upsertShares(
    workflowId: string,
    actor: WorkflowActor,
    emails: readonly string[],
    allowEdit: boolean,
  ): Promise<void> {
    await this.database
      .insert(workflowShares)
      .values(
        emails.map((email) => ({
          workflowId,
          sharedByUserId: actor.userId,
          sharedWithEmail: email,
          allowEdit,
        })),
      )
      .onConflictDoUpdate({
        target: [workflowShares.workflowId, workflowShares.sharedWithEmail],
        set: { allowEdit, sharedByUserId: actor.userId },
      });
  }

  async deleteShare(workflowId: string, shareId: string): Promise<void> {
    await this.database
      .delete(workflowShares)
      .where(and(eq(workflowShares.id, shareId), eq(workflowShares.workflowId, workflowId)));
  }
}
