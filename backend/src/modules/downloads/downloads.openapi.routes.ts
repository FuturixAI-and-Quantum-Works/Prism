/**
 * @swagger
 * /download/{token}:
 *   get:
 *     tags: [Downloads]
 *     summary: Download file by token
 *     description: Downloads a file using a signed download token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File content
 *       404:
 *         description: Invalid link or file not found
 */
export {};
