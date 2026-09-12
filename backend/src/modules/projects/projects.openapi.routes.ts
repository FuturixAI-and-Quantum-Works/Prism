/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: List projects
 *     responses:
 *       200:
 *         description: Projects owned by or shared with the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags: [Projects]
 *     summary: Create a project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               cm_number: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Invalid project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project details and folders
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Project'
 *                 - type: object
 *                   properties:
 *                     folders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ProjectFolder'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     tags: [Projects]
 *     summary: Update a project
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               cm_number: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Project updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: [Projects]
 *     summary: Delete a project
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       204:
 *         description: Project deleted
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /projects/{projectId}/people:
 *   get:
 *     tags: [Projects]
 *     summary: Get project collaborators
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Project owner and collaborators
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 owner:
 *                   type: object
 *                   properties:
 *                     user_id: { type: string, format: uuid }
 *                     email: { type: string, format: email, nullable: true }
 *                     display_name: { type: string, nullable: true }
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       email: { type: string, format: email }
 *                       display_name: { type: string, nullable: true }
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /projects/{projectId}/members:
 *   get:
 *     tags: [Projects]
 *     summary: Get project members and pending invitations
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Project membership
 *       403:
 *         description: Sharing management denied
 *
 * /projects/{projectId}/invitations:
 *   post:
 *     tags: [Projects]
 *     summary: Invite a project member
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [admin, editor, viewer] }
 *     responses:
 *       201:
 *         description: Invitation queued
 *
 * /projects/{projectId}/members/{memberId}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update a project member role
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: memberId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Project member updated
 *   delete:
 *     tags: [Projects]
 *     summary: Remove a project member
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: memberId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       204:
 *         description: Project member removed
 *
 * /projects/{projectId}/chats:
 *   get:
 *     tags: [Projects]
 *     summary: List project chats
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Project chats
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chat'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /projects/{projectId}/folders:
 *   post:
 *     tags: [Projects]
 *     summary: Create a project folder
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               parent_folder_id: { type: string, format: uuid, nullable: true }
 *     responses:
 *       201:
 *         description: Folder created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectFolder'
 *       400:
 *         description: Name is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Project or parent folder not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /projects/{projectId}/folders/{folderId}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update a project folder
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: folderId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Folder updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectFolder'
 *       400:
 *         description: Invalid folder move
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Project or folder not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: [Projects]
 *     summary: Delete a project folder
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: folderId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       204:
 *         description: Folder deleted
 *       404:
 *         description: Project or folder not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export {};
