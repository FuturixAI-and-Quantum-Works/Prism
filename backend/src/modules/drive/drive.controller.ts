import type { Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { bufferToArrayBuffer } from "./drive.helpers.js";
import {
  collaboratorDto,
  fileActivityDto,
  fileDto,
  folderDto,
  memberDto,
  versionDto,
  versionWithAuthorDto,
  workspaceActivityDto,
  workspaceDto,
} from "./drive.dto.js";
import type { DriveFilesService } from "./drive.files.service.js";
import type { DriveFoldersService } from "./drive.folders.service.js";
import type { DriveInvitationsService } from "./drive.invitations.service.js";
import { DriveError, toDriveError, type DriveActor } from "./drive.types.js";
import type { DriveVersionsService } from "./drive.versions.service.js";
import {
  accessRequestParamsSchema,
  copyFilesBodySchema,
  createFileBodySchema,
  createFolderBodySchema,
  createWorkspaceBodySchema,
  decideAccessRequestBodySchema,
  deleteItemsBodySchema,
  downloadQuerySchema,
  fileIdParamsSchema,
  folderIdParamsSchema,
  invitationBodySchema,
  listFilesQuerySchema,
  listFoldersQuerySchema,
  memberBodySchema,
  moveItemsBodySchema,
  parseUploadedName,
  requestAccessBodySchema,
  updateFileBodySchema,
  updateFolderBodySchema,
  updateWorkspaceBodySchema,
  workspaceIdParamsSchema,
} from "./drive.validators.js";
import type { DriveWorkspacesService } from "./drive.workspaces.service.js";

export type DriveServices = Readonly<{
  files: DriveFilesService;
  folders: DriveFoldersService;
  versions: DriveVersionsService;
  workspaces: DriveWorkspacesService;
  invitations: DriveInvitationsService;
}>;

function actor(res: Response): DriveActor {
  return { userId: res.locals.auth.user.id };
}

function errorResponse(error: unknown, res: Response): void {
  if (error instanceof ZodError) {
    res.status(400).json({ detail: error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const driveError = toDriveError(error);
  res.status(driveError.status).json({ detail: driveError.message });
}

function endpoint(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => errorResponse(error, res));
  };
}

function uploadedFile(req: Request): {
  name: string;
  content: ArrayBuffer;
  suppliedMimeType: string | null;
} {
  if (!req.file) throw new DriveError(400, "file is required");
  return {
    name: parseUploadedName(req.file.originalname),
    content: bufferToArrayBuffer(req.file.buffer),
    suppliedMimeType: req.file.mimetype || null,
  };
}

export function createDriveController(services: DriveServices) {
  return {
    listFiles: endpoint(async (req, res) => {
      const query = listFilesQuerySchema.parse(req.query);
      const page = await services.files.list(actor(res), query);
      res.json({
        files: page.items.map(fileDto),
        total: page.total,
        limit: page.limit,
        offset: page.offset,
        has_more: page.offset + page.items.length < page.total,
      });
    }),
    uploadFile: endpoint(async (req, res) => {
      const body = createFileBodySchema.parse(req.body);
      const file = await services.files.upload(actor(res), {
        workspaceId: body.workspace_id ?? null,
        folderId: body.folder_id ?? null,
        description: body.description ?? null,
        isPrimary: body.is_primary !== "false" && body.is_primary !== false,
        ...uploadedFile(req),
      });
      res.status(201).json(fileDto(file));
    }),
    copyFiles: endpoint(async (req, res) => {
      const body = copyFilesBodySchema.parse(req.body);
      const files = await services.files.copy(actor(res), {
        fileIds: body.file_ids,
        targetWorkspaceId: body.target_workspace_id ?? null,
        targetFolderId: body.target_folder_id ?? null,
      });
      res.status(201).json({
        copied_files: files.map(fileDto),
        copied_count: files.length,
        total_requested: body.file_ids.length,
      });
    }),
    moveItems: endpoint(async (req, res) => {
      const body = moveItemsBodySchema.parse(req.body);
      const result = await services.folders.moveItems(actor(res), {
        fileIds: body.file_ids ?? [],
        folderIds: body.folder_ids ?? [],
        targetWorkspaceId: body.target_workspace_id ?? null,
        targetFolderId: body.target_folder_id ?? null,
      });
      res.json({
        files_moved: result.files.length,
        folders_moved: result.folders.length,
        files: result.files.map(fileDto),
        folders: result.folders.map(folderDto),
      });
    }),
    deleteItems: endpoint(async (req, res) => {
      const body = deleteItemsBodySchema.parse(req.body);
      const result = await services.folders.deleteItems(actor(res), {
        fileIds: body.file_ids ?? [],
        folderIds: body.folder_ids ?? [],
      });
      res.json({
        success: true,
        files_deleted: result.filesDeleted,
        folders_deleted: result.foldersDeleted,
      });
    }),
    getFile: endpoint(async (req, res) => {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      res.json(fileDto(await services.files.get(actor(res), fileId)));
    }),
    updateFile: endpoint(async (req, res) => {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      const body = updateFileBodySchema.parse(req.body);
      const updates = {
        ...(Object.hasOwn(body, "name") ? { name: body.name } : {}),
        ...(Object.hasOwn(body, "description") ? { description: body.description } : {}),
        ...(Object.hasOwn(body, "folder_id") ? { folderId: body.folder_id } : {}),
      };
      if (Object.keys(updates).length === 0) {
        throw new DriveError(400, "No valid fields to update");
      }
      res.json(fileDto(await services.files.update(actor(res), fileId, updates)));
    }),
    deleteFile: endpoint(async (req, res) => {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      await services.files.remove(actor(res), fileId);
      res.status(204).send();
    }),
    fileUrl: endpoint(async (req, res) => {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      const { inline } = downloadQuerySchema.parse(req.query);
      const result = await services.files.downloadUrl(actor(res), fileId, inline);
      res.json({
        url: result.url,
        file_id: result.fileId,
        filename: result.filename,
        expires_in: result.expiresIn,
      });
    }),
    previewFile: endpoint(async (req, res) => {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      res.json(await services.files.preview(actor(res), fileId));
    }),
    listVersions: endpoint(async (req, res) => {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      const result = await services.versions.list(actor(res), fileId);
      res.json({
        current_version: result.currentVersion,
        versions: result.versions.map(versionWithAuthorDto),
      });
    }),
    createVersion: endpoint(async (req, res) => {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      const version = await services.versions.create(actor(res), fileId, uploadedFile(req));
      res.status(201).json(versionDto(version));
    }),
    fileActivity: endpoint(async (req, res) => {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      const events = await services.files.activityFeed(actor(res), fileId);
      res.json(events.map(fileActivityDto));
    }),
    listFolders: endpoint(async (req, res) => {
      const query = listFoldersQuerySchema.parse(req.query);
      const page = await services.folders.list(actor(res), query);
      res.json({
        folders: page.items.map(folderDto),
        total: page.total,
        limit: page.limit,
        offset: page.offset,
        has_more: page.offset + page.items.length < page.total,
      });
    }),
    createFolder: endpoint(async (req, res) => {
      const body = createFolderBodySchema.parse(req.body);
      const folder = await services.folders.create(actor(res), {
        workspaceId: body.workspace_id ?? null,
        parentFolderId: body.parent_folder_id ?? null,
        name: body.name,
        description: body.description ?? null,
      });
      res.status(201).json(folderDto(folder));
    }),
    getFolder: endpoint(async (req, res) => {
      const { folderId } = folderIdParamsSchema.parse(req.params);
      res.json(folderDto(await services.folders.get(actor(res), folderId)));
    }),
    updateFolder: endpoint(async (req, res) => {
      const { folderId } = folderIdParamsSchema.parse(req.params);
      const body = updateFolderBodySchema.parse(req.body);
      const updates = {
        ...(Object.hasOwn(body, "name") ? { name: body.name } : {}),
        ...(Object.hasOwn(body, "description") ? { description: body.description } : {}),
        ...(Object.hasOwn(body, "parent_folder_id")
          ? { parentFolderId: body.parent_folder_id }
          : {}),
      };
      if (Object.keys(updates).length === 0) {
        throw new DriveError(400, "No valid fields to update");
      }
      res.json(folderDto(await services.folders.update(actor(res), folderId, updates)));
    }),
    deleteFolder: endpoint(async (req, res) => {
      const { folderId } = folderIdParamsSchema.parse(req.params);
      await services.folders.remove(actor(res), folderId);
      res.status(204).send();
    }),
    listWorkspaces: endpoint(async (_req, res) => {
      const workspaces = await services.workspaces.list(actor(res));
      res.json(
        workspaces.map((item) => ({
          ...workspaceDto(item.workspace, item.role, item.ownerName),
          file_count: item.fileCount,
          collaborators: item.collaborators.map(collaboratorDto),
        })),
      );
    }),
    createWorkspace: endpoint(async (req, res) => {
      const body = createWorkspaceBodySchema.parse(req.body);
      const workspace = await services.workspaces.create(actor(res), {
        name: body.name,
        description: body.description ?? null,
      });
      res.status(201).json(workspaceDto(workspace));
    }),
    getWorkspace: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const result = await services.workspaces.get(actor(res), workspaceId);
      res.json({
        ...workspaceDto(result.workspace, result.role),
        collaborators: result.collaborators.map(collaboratorDto),
      });
    }),
    workspaceActivity: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const events = await services.workspaces.activityFeed(actor(res), workspaceId);
      res.json(events.map(workspaceActivityDto));
    }),
    updateWorkspace: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const body = updateWorkspaceBodySchema.parse(req.body);
      if (Object.keys(body).length === 0) {
        throw new DriveError(400, "No valid fields to update");
      }
      const result = await services.workspaces.update(actor(res), workspaceId, body);
      res.json(workspaceDto(result.workspace, result.role));
    }),
    deleteWorkspace: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      await services.workspaces.remove(actor(res), workspaceId);
      res.status(204).send();
    }),
    listMembers: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const result = await services.workspaces.members(actor(res), workspaceId);
      res.json({ owner_id: result.ownerId, members: result.members.map(memberDto) });
    }),
    upsertMember: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const body = memberBodySchema.parse(req.body);
      const result = await services.workspaces.upsertMember(actor(res), workspaceId, {
        userId: body.user_id,
        role: body.role,
      });
      res.status(result.created ? 201 : 200).json({
        id: result.member.id,
        workspace_id: result.member.workspaceId,
        user_id: result.member.userId,
        role: result.member.role,
        created_at: result.member.createdAt,
        updated_at: result.member.updatedAt,
      });
    }),
    removeMember: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const body = memberBodySchema.pick({ user_id: true }).parse(req.body);
      await services.workspaces.removeMember(actor(res), workspaceId, body.user_id);
      res.status(204).send();
    }),
    listInvitations: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const invitations = await services.invitations.list(actor(res), workspaceId);
      res.json({ pending_invitations: invitations });
    }),
    createInvitation: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const body = invitationBodySchema.parse(req.body);
      const result = await services.invitations.invite(actor(res), workspaceId, body);
      res.status(201).json({
        invitation: {
          id: result.invitation.id,
          email: result.invitation.email,
          role: result.invitation.role,
          status: result.invitation.status,
          expires_at: result.invitation.expiresAt,
          created_at: result.invitation.createdAt,
        },
        delivery: result.delivery,
      });
    }),
    requestAccess: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const body = requestAccessBodySchema.parse(req.body);
      const request = await services.invitations.requestAccess(actor(res), workspaceId, body);
      res.status(201).json({
        id: request.id,
        workspace_id: request.workspaceId,
        requested_role: request.requestedRole,
        message: request.message,
        status: request.status,
        created_at: request.createdAt,
      });
    }),
    listAccessRequests: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const requests = await services.invitations.listAccessRequests(actor(res), workspaceId);
      res.json({
        access_requests: requests.map((request) => ({
          id: request.id,
          workspace_id: request.workspaceId,
          requested_by_user_id: request.requestedByUserId,
          requester_email: request.requesterEmail,
          requester_name: request.requesterName,
          requested_role: request.requestedRole,
          message: request.message,
          status: request.status,
          created_at: request.createdAt,
        })),
      });
    }),
    decideAccessRequest: endpoint(async (req, res) => {
      const { workspaceId, requestId } = accessRequestParamsSchema.parse(req.params);
      const { action } = decideAccessRequestBodySchema.parse(req.body);
      const request = await services.invitations.decideAccessRequest(
        actor(res),
        workspaceId,
        requestId,
        action,
      );
      res.json({
        id: request.id,
        status: request.status,
        reviewed_at: request.reviewedAt,
      });
    }),
  };
}
