import db from '../database/connection.js';
import { notifications, users } from '../database/schema.js';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';

export default class NotificationController {
  // Get user notifications
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20, isRead, type } = req.query;
      const offset = (page - 1) * limit;
      const userId = req.user.id;

      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));

      // Apply filters
      const conditions = [eq(notifications.userId, userId)];
      if (isRead !== undefined) {
        conditions.push(eq(notifications.isRead, isRead === 'true'));
      }
      if (type) {
        conditions.push(eq(notifications.type, type));
      }

      if (conditions.length > 1) {
        query = query.where(and(...conditions));
      }

      const userNotifications = await query
        .orderBy(desc(notifications.createdAt))
        .limit(parseInt(limit))
        .offset(offset);

      // Get unread count
      const unreadCount = await db
        .select({ count: sql`count(*)` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      res.json({
        success: true,
        data: userNotifications,
        unreadCount: parseInt(unreadCount[0].count),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userNotifications.length
        }
      });

    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
        error: error.message
      });
    }
  }

  // Get notification statistics
  async getNotificationStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await db
        .select({
          total: sql`count(*)`,
          unread: sql`count(*) filter (where is_read = false)`,
          read: sql`count(*) filter (where is_read = true)`
        })
        .from(notifications)
        .where(eq(notifications.userId, userId));

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      logger.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics',
        error: error.message
      });
    }
  }

  // Get single notification
  async getNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        ))
        .limit(1);

      if (!notification.length) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        data: notification[0]
      });

    } catch (error) {
      logger.error('Get notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification',
        error: error.message
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const updatedNotification = await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date() 
        })
        .where(and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        ))
        .returning();

      if (!updatedNotification.length) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: updatedNotification[0]
      });

    } catch (error) {
      logger.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date() 
        })
        .where(eq(notifications.userId, userId));

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });

    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const deletedNotification = await db
        .delete(notifications)
        .where(and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        ))
        .returning();

      if (!deletedNotification.length) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });

    } catch (error) {
      logger.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message
      });
    }
  }

  // Delete all notifications
  async deleteAllNotifications(req, res) {
    try {
      const userId = req.user.id;

      await db
        .delete(notifications)
        .where(eq(notifications.userId, userId));

      res.json({
        success: true,
        message: 'All notifications deleted successfully'
      });

    } catch (error) {
      logger.error('Delete all notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete all notifications',
        error: error.message
      });
    }
  }

  // Send test notification (admin only)
  async sendTestNotification(req, res) {
    try {
      const { userId, type, title, message, data } = req.body;

      const notification = await notificationService.createNotification(
        userId,
        type,
        title,
        message,
        data
      );

      res.status(201).json({
        success: true,
        message: 'Test notification sent successfully',
        data: notification
      });

    } catch (error) {
      logger.error('Send test notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: error.message
      });
    }
  }

  // Broadcast notification to all users (admin only)
  async broadcastNotification(req, res) {
    try {
      const { type, title, message, data, userRole } = req.body;

      // Get users to notify
      let query = db.select({ id: users.id }).from(users);
      
      if (userRole) {
        query = query.where(eq(users.role, userRole));
      }

      const targetUsers = await query;

      // Send notification to all target users
      const notifications = [];
      for (const user of targetUsers) {
        const notification = await notificationService.createNotification(
          user.id,
          type,
          title,
          message,
          data
        );
        notifications.push(notification);
      }

      res.status(201).json({
        success: true,
        message: `Broadcast notification sent to ${notifications.length} users`,
        data: {
          totalSent: notifications.length,
          targetRole: userRole || 'all'
        }
      });

    } catch (error) {
      logger.error('Broadcast notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to broadcast notification',
        error: error.message
      });
    }
  }
}