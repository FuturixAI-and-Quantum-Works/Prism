import { db } from "../../db/index.js";
import { accessAuthority } from "../access/access.composition.js";
import { DrizzleDriveActivityRepository } from "./drive.activity.js";
import { DrizzleDriveFileRepository } from "./drive.file-repository.js";
import { DrizzleDriveFolderRepository } from "./drive.folder-repository.js";
import { DriveAuthorizationPolicy, type DriveFileAuthorizationPolicy } from "./drive.policy.js";
import { DriveError } from "./drive.types.js";
import { DrizzleDriveWorkspaceRepository } from "./drive.workspace-repository.js";

export class DriveFileAccessPolicy implements DriveFileAuthorizationPolicy {
  constructor(private readonly policy: DriveFileAuthorizationPolicy) {}

  async file(...input: Parameters<DriveFileAuthorizationPolicy["file"]>) {
    try {
      return await this.policy.file(...input);
    } catch (error) {
      if (error instanceof DriveError && error.message !== "File not found") {
        throw new DriveError(error.status, "You do not have permission to access this file", {
          cause: error,
        });
      }
      throw error;
    }
  }
}

export function createProductionDriveAccess() {
  const workspaces = new DrizzleDriveWorkspaceRepository();
  const folders = new DrizzleDriveFolderRepository();
  const files = new DrizzleDriveFileRepository(db, folders);
  const policy = new DriveAuthorizationPolicy({ workspaces, files, folders }, accessAuthority);
  const activity = new DrizzleDriveActivityRepository();
  const filePolicy = new DriveFileAccessPolicy(policy);
  return { files, filePolicy, activity };
}
