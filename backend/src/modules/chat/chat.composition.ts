import { ChatContextAssembler } from "./chat.context.js";
import { ChatCoordinator } from "./chat.coordinator.js";
import {
  createChatController,
  createProjectChatController,
  createWorkspaceChatController,
} from "./chat.controller.js";
import { DrizzleChatContextRepository } from "./chat.context.repository.js";
import { ChatAiExecution } from "./chat.execution.js";
import { ChatManagementService } from "./chat.management.js";
import { ChatTurnPersistence } from "./chat.persistence.js";
import { ChatPolicy } from "./chat.policy.js";
import { DrizzleChatRepository } from "./chat.repository.js";
import { ChatSessionResolver } from "./chat.session.js";
import type { DocumentCreator } from "../documents/documents.service.js";

export function createChatComposition(documents: DocumentCreator) {
  const repository = new DrizzleChatRepository();
  const contextRepository = new DrizzleChatContextRepository();
  const policy = new ChatPolicy();
  const coordinator = new ChatCoordinator(
    policy,
    new ChatSessionResolver(repository, policy),
    new ChatContextAssembler(contextRepository),
    new ChatTurnPersistence(repository),
    new ChatAiExecution(contextRepository, documents),
  );
  const management = new ChatManagementService(repository, policy);
  return {
    controllers: {
      general: createChatController(coordinator, management),
      project: createProjectChatController(coordinator),
      workspace: createWorkspaceChatController(coordinator, management),
    },
    coordinator,
  };
}
