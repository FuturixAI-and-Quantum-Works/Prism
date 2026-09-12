/**
 * @swagger
 * /templates:
 *   get:
 *     tags: [Templates]
 *     summary: List templates
 *     responses:
 *       200:
 *         description: Template list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Template'
 *   post:
 *     tags: [Templates]
 *     summary: Create a user template
 *     responses:
 *       201:
 *         description: Template created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Template'
 *       400:
 *         description: Invalid input
 *
 * /templates/{templateId}:
 *   get:
 *     tags: [Templates]
 *     summary: Get a template
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Template'
 *       404:
 *         description: Template not found
 *   patch:
 *     tags: [Templates]
 *     summary: Update a user template
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Template'
 *       404:
 *         description: Template not editable
 *   delete:
 *     tags: [Templates]
 *     summary: Delete a user template
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Template deleted
 *       404:
 *         description: Template not deletable
 *
 * /templates/{templateId}/create-document:
 *   post:
 *     tags: [Templates]
 *     summary: Create a document from a template
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Document created
 *       400:
 *         description: Required template fields are missing
 *       404:
 *         description: Template not found
 *
 * /templates/{templateId}/clone:
 *   post:
 *     tags: [Templates]
 *     summary: Clone a template
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Template cloned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Template'
 *       404:
 *         description: Template not found
 */
export {};
