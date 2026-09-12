import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  isAttentionItemStatus,
  listAttentionItems,
  updateAttentionItemStatus,
  listUserActivity,
} from "../lib/attention.js";

export const attentionRouter = Router();

/**
 * @swagger
 * /attention-items:
 *   get:
 *     tags: [Attention]
 *     summary: List attention items for current user
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, viewed, resolved, dismissed]
 *         description: Filter by status (default returns pending and viewed)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of attention items
 */
attentionRouter.get("/", requireAuth, async (req, res) => {
  const userId = res.locals.auth.user.id;
  const { status, limit, offset } = req.query;

  if (status !== undefined && !isAttentionItemStatus(status)) {
    return void res.status(400).json({ detail: "Invalid status" });
  }
  const statusFilter = status
    ? status
    : (["pending", "viewed"] satisfies Array<"pending" | "viewed">);

  const items = await listAttentionItems(userId, {
    status: statusFilter,
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0,
  });

  res.json(
    items.map((item) => ({
      id: item.id,
      user_id: item.userId,
      source_type: item.sourceType,
      source_id: item.sourceId,
      secondary_source_id: item.secondarySourceId,
      severity: item.severity,
      title: item.title,
      description: item.description,
      metadata: item.metadata,
      status: item.status,
      created_at: item.createdAt?.toISOString(),
      updated_at: item.updatedAt?.toISOString(),
      resolved_at: item.resolvedAt?.toISOString() ?? null,
    })),
  );
});

/**
 * @swagger
 * /attention-items/{id}:
 *   patch:
 *     tags: [Attention]
 *     summary: Update attention item status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, viewed, resolved, dismissed]
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Item not found or access denied
 */
attentionRouter.patch("/:id", requireAuth, async (req, res) => {
  const userId = res.locals.auth.user.id;
  const { id } = req.params;
  const { status } = req.body;

  if (!isAttentionItemStatus(status)) {
    return void res.status(400).json({ detail: "Invalid status" });
  }

  const updated = await updateAttentionItemStatus(id, userId, status);

  if (!updated) {
    return void res.status(404).json({ detail: "Item not found or access denied" });
  }

  res.json({ ok: true, status });
});

/**
 * @swagger
 * /attention-items/activity:
 *   get:
 *     tags: [Activity]
 *     summary: List user's activity trail
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of activity entries
 */
attentionRouter.get("/activity", requireAuth, async (req, res) => {
  const userId = res.locals.auth.user.id;
  const { limit, offset } = req.query;

  const activities = await listUserActivity(userId, {
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0,
  });

  res.json(
    activities.map((activity) => ({
      id: activity.id,
      user_id: activity.userId,
      action: activity.action,
      resource_type: activity.resourceType,
      resource_id: activity.resourceId,
      resource_name: activity.resourceName,
      actor_user_id: activity.actorUserId,
      actor_name: activity.actorName,
      details: activity.details,
      created_at: activity.createdAt?.toISOString(),
    })),
  );
});
