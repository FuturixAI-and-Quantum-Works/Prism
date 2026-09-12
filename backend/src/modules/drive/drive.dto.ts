import type {
  DriveFile,
  DriveFolder,
  DriveMember,
  DriveVersion,
  DriveVersionWithAuthor,
  DriveWorkspace,
  FileActivityRecord,
  WorkspaceActivityRecord,
  WorkspaceRole,
} from "./drive.types.js";

export function fileDto(file: DriveFile) {
  return {
    id: file.id,
    name: file.name,
    description: file.description,
    user_id: file.userId,
    folder_id: file.folderId,
    workspace_id: file.workspaceId,
    size_bytes: file.sizeBytes.toString(),
    mime_type: file.mimeType,
    extension: file.extension,
    checksum: file.checksum,
    version: file.version,
    is_primary: file.isPrimary,
    created_at: file.createdAt,
    updated_at: file.updatedAt,
    last_accessed_at: file.lastAccessedAt,
  };
}

export function folderDto(folder: DriveFolder) {
  return {
    id: folder.id,
    name: folder.name,
    description: folder.description,
    user_id: folder.userId,
    parent_folder_id: folder.parentFolderId,
    workspace_id: folder.workspaceId,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
  };
}

export function workspaceDto(
  workspace: DriveWorkspace,
  role: WorkspaceRole = "owner",
  ownerName: string | null = null,
) {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    owner_id: workspace.ownerId,
    owner_name: ownerName,
    role,
    storage_allocated_bytes: workspace.storageAllocatedBytes.toString(),
    storage_used_bytes: workspace.storageUsedBytes.toString(),
    created_at: workspace.createdAt,
    updated_at: workspace.updatedAt,
  };
}

export function memberDto(member: DriveMember) {
  return {
    id: member.id,
    user_id: member.userId,
    email: member.email,
    full_name: member.fullName,
    role: member.role,
    created_at: member.createdAt,
  };
}

export function collaboratorDto(member: DriveMember) {
  return {
    id: member.id,
    user_id: member.userId,
    email: member.email,
    full_name: member.fullName,
    role: member.role,
  };
}

export function versionDto(version: DriveVersion) {
  return {
    id: version.id,
    file_id: version.fileId,
    version_number: version.versionNumber,
    storage_path: version.storagePath,
    size_bytes: version.sizeBytes.toString(),
    checksum: version.checksum,
    created_by_user_id: version.createdByUserId,
    created_at: version.createdAt,
  };
}

export function versionWithAuthorDto(version: DriveVersionWithAuthor) {
  return {
    ...versionDto(version),
    created_by_email: version.userEmail,
    created_by_name: version.userName,
  };
}

export function fileActivityDto(activity: FileActivityRecord) {
  return {
    id: activity.id,
    file_id: activity.fileId,
    user_id: activity.userId,
    user_email: activity.userEmail,
    user_name: activity.userName,
    action: activity.action,
    details: activity.details,
    created_at: activity.createdAt,
  };
}

export function workspaceActivityDto(activity: WorkspaceActivityRecord) {
  return {
    id: activity.id,
    workspace_id: activity.workspaceId,
    user_id: activity.userId,
    user_email: activity.userEmail,
    user_name: activity.userName,
    action: activity.action,
    target_type: activity.targetType,
    target_id: activity.targetId,
    target_name: activity.targetName,
    details: activity.details,
    created_at: activity.createdAt,
  };
}
