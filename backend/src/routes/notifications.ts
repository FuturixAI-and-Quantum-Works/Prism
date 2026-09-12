import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../lib/notifications.js";

export const notificationsRouter = Router();

function userIdFrom(res: import("express").Response): string {
  return res.locals.auth.user.id;
}

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user notifications
 */
notificationsRouter.get("/", requireAuth, async (req, res) => {
  const userId = userIdFrom(res);
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const unreadOnly = req.query.unread_only === "true";

    const notificationsList = await getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
    });

    res.json({
      notifications: notificationsList.map((n) => ({
        id: n.id,
        icon: n.icon,
        title: n.title,
        description: n.description,
        read: n.read,
        link: n.link,
        resource_type: n.resourceType,
        resource_id: n.resourceId,
        actor_user_id: n.actorUserId,
        metadata: n.metadata,
        created_at: n.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ detail: "Failed to fetch notifications" });
  }
});

/**
 * @swagger
 * /notifications/count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 */
notificationsRouter.get("/count", requireAuth, async (req, res) => {
  const userId = userIdFrom(res);
  try {
    const count = await getUnreadNotificationCount(userId);
    res.json({ unread_count: count });
  } catch (error) {
    console.error("Error fetching notification count:", error);
    res.status(500).json({ detail: "Failed to fetch notification count" });
  }
});

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 */
notificationsRouter.patch("/:notificationId/read", requireAuth, async (req, res) => {
  const userId = userIdFrom(res);
  const { notificationId } = req.params;
  try {
    const updated = await markNotificationAsRead(notificationId, userId);
    if (!updated) {
      return void res.status(404).json({ detail: "Notification not found" });
    }
    res.json({
      id: updated.id,
      read: updated.read,
      updated_at: updated.updatedAt,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ detail: "Failed to mark notification as read" });
  }
});

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 */
notificationsRouter.patch("/read-all", requireAuth, async (req, res) => {
  const userId = userIdFrom(res);
  try {
    const count = await markAllNotificationsAsRead(userId);
    res.json({ marked_read: count });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ detail: "Failed to mark notifications as read" });
  }
});

/**
 * @swagger
 * /notifications/{notificationId}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 */
notificationsRouter.delete("/:notificationId", requireAuth, async (req, res) => {
  const userId = userIdFrom(res);
  const { notificationId } = req.params;
  try {
    const deleted = await deleteNotification(notificationId, userId);
    if (!deleted) {
      return void res.status(404).json({ detail: "Notification not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ detail: "Failed to delete notification" });
  }
});
