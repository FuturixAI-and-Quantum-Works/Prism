/**
 * @swagger
 * /user/profile:
 *   post:
 *     tags: [User]
 *     summary: Ensure profile exists
 *     responses:
 *       200:
 *         description: Profile exists or was created
 *   get:
 *     tags: [User]
 *     summary: Get user profile
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *   patch:
 *     tags: [User]
 *     summary: Update user profile
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid field
 *
 * /user/account:
 *   delete:
 *     tags: [User]
 *     summary: Delete account
 *     responses:
 *       204:
 *         description: Account deleted successfully
 */
export {};
