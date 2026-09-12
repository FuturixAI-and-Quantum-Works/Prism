import { getUserAiRuntime } from "../../lib/aiRegistry.js";
import { loadAccessibleTemplates } from "../../lib/templateDocuments.js";
import { loadActiveInterview } from "../../lib/templateInterview.js";
import { composeChatContextPrompt } from "../ai/context/promptContext.js";
import type { DocIndex, DocStore } from "../ai/tools/runtimeTypes.js";
import { scopeForRecord } from "../retrieval/retrieval.query.js";
import { retrievalRepository } from "../retrieval/retrieval.repository.js";
import type { ChatContextRepository } from "./chat.context.repository.js";
import type {
  ActiveDocumentContext,
  AssembledChatContext,
  ChatMessage,
  ChatSession,
  OrchestratorRequest,
} from "./chat.types.js";

type LoadedDocuments = Readonly<{
  docIndex: DocIndex;
  docStore: DocStore;
  folderPaths: Map<string, string>;
}>;

type ChatContextDependencies = Readonly<{
  getUserAiRuntime: typeof getUserAiRuntime;
  loadAccessibleTemplates: typeof loadAccessibleTemplates;
  loadActiveInterview: typeof loadActiveInterview;
}>;

const defaultDependencies: ChatContextDependencies = {
  getUserAiRuntime,
  loadAccessibleTemplates,
  loadActiveInterview,
};

export class ChatContextAssembler {
  constructor(
    private readonly repository: Pick<
      ChatContextRepository,
      "loadPersonalDocuments" | "loadProjectDocuments" | "loadWorkspaceDocuments" | "loadWorkflows"
    >,
    private readonly dependencies: ChatContextDependencies = defaultDependencies,
  ) {}

  async assemble(
    req: OrchestratorRequest,
    session: ChatSession,
    lastUser: ChatMessage | undefined,
    activeDocumentContexts: readonly ActiveDocumentContext[],
  ): Promise<AssembledChatContext> {
    const { docIndex, docStore, folderPaths } = await this.loadDocuments(req, session.chatId);
    const ragScope = scopeForRecord({
      userId: req.userId,
      projectId: session.projectId,
      workspaceId: session.workspaceId,
    });
    const [templates, workflowStore, aiRuntime, ragCollection, indexedSourceCount, interviewState] =
      await Promise.all([
        this.dependencies.loadAccessibleTemplates(req.userId),
        this.repository.loadWorkflows(req.userId, req.userEmail),
        this.dependencies.getUserAiRuntime(req.userId),
        retrievalRepository.findCollectionSummary(ragScope),
        retrievalRepository.countIndexedSources(ragScope),
        this.dependencies.loadActiveInterview(session.chatId),
      ]);
    const ragStatus = { indexedSourceCount };
    return {
      req,
      session,
      lastUser,
      activeDocumentContexts,
      docIndex,
      docStore,
      folderPaths,
      templates,
      workflowStore,
      ragScope,
      ragCollection,
      ragStatus,
      interviewState,
      aiRuntime,
      baseSystemPromptExtra: composeChatContextPrompt({
        scope: req.scope,
        attachedItems: req.attachedItems,
        docIndex,
        folderPaths,
        lastUser,
        templates,
        workflowStore,
        ragScope,
        ragCollection,
        ragStatus,
        interviewState,
      }),
    };
  }

  private async loadDocuments(req: OrchestratorRequest, chatId: string): Promise<LoadedDocuments> {
    if (req.scope.type === "project") {
      return this.repository.loadProjectDocuments(req.scope.projectId);
    }
    if (req.scope.type === "workspace") {
      return this.repository.loadWorkspaceDocuments(req.scope.workspaceId);
    }
    return this.repository.loadPersonalDocuments(req.messages, req.userId, chatId);
  }
}
