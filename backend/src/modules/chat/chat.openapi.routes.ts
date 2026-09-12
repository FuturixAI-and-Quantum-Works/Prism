/**
 * @swagger
 * /chat:
 *   get:
 *     tags: [Chat]
 *     summary: List user's chat sessions with their chats
 *     responses:
 *       200:
 *         description: List of sessions with chats
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Chat]
 *     summary: Send a chat message (streaming)
 *     responses:
 *       200:
 *         description: SSE stream of chat events
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Chat or project not found
 *       500:
 *         description: Server error
 *
 * /chat/session:
 *   post:
 *     tags: [Chat]
 *     summary: Create a new chat session
 *     responses:
 *       200:
 *         description: Session created
 *
 * /chat/create:
 *   post:
 *     tags: [Chat]
 *     summary: Create a new chat
 *     responses:
 *       200:
 *         description: Chat created successfully
 *       400:
 *         description: Invalid project_id format
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 *
 * /chat/{chatId}:
 *   get:
 *     tags: [Chat]
 *     summary: Get a chat with messages
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chat with messages
 *       404:
 *         description: Chat not found
 *   patch:
 *     tags: [Chat]
 *     summary: Update chat title
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chat updated successfully
 *       400:
 *         description: Title is required
 *       404:
 *         description: Chat not found
 *   delete:
 *     tags: [Chat]
 *     summary: Delete a chat
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Chat deleted successfully
 *       500:
 *         description: Server error
 *
 * /chat/{chatId}/generate-title:
 *   post:
 *     tags: [Chat]
 *     summary: Generate chat title using AI
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Title generated successfully
 *       400:
 *         description: Message is required
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Failed to generate title
 *
 * /projects/{projectId}/chat:
 *   post:
 *     tags: [Project Chat]
 *     summary: Send a project chat message (streaming)
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: SSE stream of chat events
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 *
 * /drive/workspaces/{workspaceId}/chat:
 *   post:
 *     tags: [Workspace Chat]
 *     summary: Send a workspace chat message (streaming)
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: SSE stream of chat events
 *       404:
 *         description: Workspace not found
 *       500:
 *         description: Server error
 *
 * /drive/workspaces/{workspaceId}/chats:
 *   get:
 *     tags: [Workspace Chat]
 *     summary: List workspace chats
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of workspace chats
 *       404:
 *         description: Workspace not found
 */
export {};
