import express from 'express';
import notificationController from '../controllers/notificationController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validatePagination } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 * @query   { page?, limit?, isRead?, type? }
 */
router.get('/', authenticateToken, validatePagination, notificationController.getNotifications);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, notificationController.getNotificationStats);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get single notification
 * @access  Private
 * @params  id - Notification ID
 */
router.get('/:id', authenticateToken, notificationController.getNotification);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 * @params  id - Notification ID
 */
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 * @params  id - Notification ID
 */
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all notifications
 * @access  Private
 */
router.delete('/', authenticateToken, notificationController.deleteAllNotifications);

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification (Admin only)
 * @access  Private (Admin only)
 * @body    { userId, type, title, message, data? }
 */
router.post('/test', authenticateToken, requireRole(['admin']), notificationController.sendTestNotification);

/**
 * @route   POST /api/notifications/broadcast
 * @desc    Broadcast notification to all users (Admin only)
 * @access  Private (Admin only)
 * @body    { type, title, message, data?, userRole? }
 */
router.post('/broadcast', authenticateToken, requireRole(['admin']), notificationController.broadcastNotification);

export default router;