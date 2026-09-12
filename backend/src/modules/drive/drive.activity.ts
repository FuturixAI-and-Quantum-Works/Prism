import { desc, eq } from "drizzle-orm";
import { db, fileActivity, users, workspaceActivity, type Database } from "../../db/index.js";
import type { ActivityTarget, FileActivityRecord, WorkspaceActivityRecord } from "./drive.types.js";

export interface DriveActivityRepository {
  recordFile(
    fileId: string | null,
    userId: string,
    action: string,
    details?: Readonly<Record<string, unknown>>,
  ): Promise<void>;
  recordWorkspace(
    workspaceId: string | null,
    userId: string,
    action: string,
    target?: ActivityTarget,
    details?: Readonly<Record<string, unknown>>,
  ): Promise<void>;
  listFile(fileId: string): Promise<readonly FileActivityRecord[]>;
  listWorkspace(workspaceId: string): Promise<readonly WorkspaceActivityRecord[]>;
}

export type DriveActivityWriter = Pick<DriveActivityRepository, "recordFile" | "recordWorkspace">;

export class DrizzleDriveActivityRepository implements DriveActivityRepository {
  constructor(private readonly database: Database = db) {}

  async recordFile(
    fileId: string | null,
    userId: string,
    action: string,
    details?: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    await this.database.insert(fileActivity).values({
      fileId,
      userId,
      action,
      details: details ? { ...details } : null,
    });
  }

  async recordWorkspace(
    workspaceId: string | null,
    userId: string,
    action: string,
    target?: ActivityTarget,
    details?: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    if (!workspaceId) return;
    await this.database.insert(workspaceActivity).values({
      workspaceId,
      userId,
      action,
      targetType: target?.type ?? null,
      targetId: target?.id ?? null,
      targetName: target?.name ?? null,
      details: details ? { ...details } : null,
    });
  }

  async listFile(fileId: string): Promise<readonly FileActivityRecord[]> {
    return this.database
      .select({
        id: fileActivity.id,
        fileId: fileActivity.fileId,
        userId: fileActivity.userId,
        action: fileActivity.action,
        details: fileActivity.details,
        createdAt: fileActivity.createdAt,
        userEmail: users.email,
        userName: users.fullName,
      })
      .from(fileActivity)
      .leftJoin(users, eq(fileActivity.userId, users.id))
      .where(eq(fileActivity.fileId, fileId))
      .orderBy(desc(fileActivity.createdAt));
  }

  async listWorkspace(workspaceId: string): Promise<readonly WorkspaceActivityRecord[]> {
    return this.database
      .select({
        id: workspaceActivity.id,
        workspaceId: workspaceActivity.workspaceId,
        userId: workspaceActivity.userId,
        action: workspaceActivity.action,
        targetType: workspaceActivity.targetType,
        targetId: workspaceActivity.targetId,
        targetName: workspaceActivity.targetName,
        details: workspaceActivity.details,
        createdAt: workspaceActivity.createdAt,
        userEmail: users.email,
        userName: users.fullName,
      })
      .from(workspaceActivity)
      .leftJoin(users, eq(workspaceActivity.userId, users.id))
      .where(eq(workspaceActivity.workspaceId, workspaceId))
      .orderBy(desc(workspaceActivity.createdAt));
  }
}
