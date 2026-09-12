/**
 * @swagger
 * /workflows:
 *   get:
 *     tags: [Workflows]
 *     summary: List workflows
 *     responses:
 *       200:
 *         description: Workflow list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Workflow'
 *   post:
 *     tags: [Workflows]
 *     summary: Create a workflow
 *     responses:
 *       201:
 *         description: Workflow created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workflow'
 *       400:
 *         description: Invalid input
 *
 * /workflows/hidden:
 *   get:
 *     tags: [Workflows]
 *     summary: List hidden workflow IDs
 *     responses:
 *       200:
 *         description: Hidden workflow IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *   post:
 *     tags: [Workflows]
 *     summary: Hide a workflow
 *     responses:
 *       204:
 *         description: Workflow hidden
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Workflow not found
 *
 * /workflows/hidden/{workflowId}:
 *   delete:
 *     tags: [Workflows]
 *     summary: Unhide a workflow
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Workflow unhidden
 *
 * /workflows/{workflowId}:
 *   get:
 *     tags: [Workflows]
 *     summary: Get a workflow
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workflow'
 *       404:
 *         description: Workflow not found
 *   put:
 *     tags: [Workflows]
 *     summary: Replace workflow fields
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow updated
 *       404:
 *         description: Workflow not editable
 *   patch:
 *     tags: [Workflows]
 *     summary: Update workflow fields
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow updated
 *       404:
 *         description: Workflow not editable
 *   delete:
 *     tags: [Workflows]
 *     summary: Delete an owned workflow
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Workflow deleted
 *
 * /workflows/{workflowId}/shares:
 *   get:
 *     tags: [Workflows]
 *     summary: List workflow shares
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow shares
 *       404:
 *         description: Workflow not editable
 *
 * /workflows/{workflowId}/share:
 *   post:
 *     tags: [Workflows]
 *     summary: Share a workflow
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Workflow shared
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Workflow not editable
 *
 * /workflows/{workflowId}/shares/{shareId}:
 *   delete:
 *     tags: [Workflows]
 *     summary: Remove a workflow share
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Share removed
 *       404:
 *         description: Workflow not found
 */
export {};
