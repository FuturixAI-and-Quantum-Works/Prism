import type {
  Project,
  ProjectChat,
  ProjectFolder,
  ProjectInvitationResult,
  ProjectListItem,
  ProjectMember,
  ProjectMemberDto,
} from "./projects.types.js";

export function projectDto(project: Project) {
  return {
    id: project.id,
    userId: project.userId,
    name: project.name,
    cmNumber: project.cmNumber,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function projectListItemDto(project: ProjectListItem) {
  return {
    ...projectDto(project),
    is_owner: project.is_owner,
    role: project.role,
    document_count: project.document_count,
    chat_count: project.chat_count,
    review_count: project.review_count,
    collaborators: project.collaborators,
  };
}

export function projectFolderDto(folder: ProjectFolder) {
  return {
    id: folder.id,
    projectId: folder.projectId,
    userId: folder.userId,
    name: folder.name,
    parentFolderId: folder.parentFolderId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

export function projectChatDto(chat: ProjectChat) {
  return {
    id: chat.id,
    sessionId: chat.sessionId,
    userId: chat.userId,
    projectId: chat.projectId,
    workspaceId: chat.workspaceId,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

export function projectMemberDto(member: ProjectMember): ProjectMemberDto {
  return {
    id: member.id,
    project_id: member.projectId,
    user_id: member.userId,
    email: member.email,
    role: member.role,
    created_at: member.createdAt,
    updated_at: member.updatedAt,
  };
}

export function projectMemberUpdateDto(member: ProjectMember) {
  return {
    id: member.id,
    projectId: member.projectId,
    userId: member.userId,
    email: member.email,
    role: member.role,
    invitedByUserId: member.invitedByUserId,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

export function projectInvitationDto(result: ProjectInvitationResult) {
  return {
    invitation: {
      id: result.invitation.id,
      email: result.invitation.email,
      role: result.invitation.role,
      status: result.invitation.status,
      expires_at: result.invitation.expiresAt,
      created_at: result.invitation.createdAt,
    },
    delivery: result.delivery,
  };
}
