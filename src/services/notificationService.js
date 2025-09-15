import db from '../database/connection.js';
import { notifications } from '../database/schema.js';
import { eq } from 'drizzle-orm';
import emailService from './emailService.js';
import smsService from './smsService.js';
import logger from '../utils/logger.js';

class NotificationService {
  async createNotification(userId, type, title, message, data = null) {
    try {
      const notification = await db
        .insert(notifications)
        .values({
          userId,
          type,
          title,
          message,
          data,
        })
        .returning();

      return notification[0];
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  async sendPickupRequestNotification(user, pickupRequest) {
    // Create in-app notification
    await this.createNotification(
      user.id,
      'pickup_request',
      'Pickup Request Created',
      `Your pickup request for ${pickupRequest.wasteType} has been created successfully.`,
      { pickupRequestId: pickupRequest.id }
    );

    // Send email
    await emailService.sendPickupRequestConfirmation(user, pickupRequest);

    // Send SMS if phone is verified
    if (user.isPhoneVerified && user.phone) {
      const message = `Your waste pickup request #${pickupRequest.id} has been created. We'll notify you when a waste picker accepts it.`;
      await smsService.sendSMS(user.phone, message);
    }
  }

  async sendPickupAcceptedNotification(user, pickupRequest, wastePicker) {
    // Create in-app notification
    await this.createNotification(
      user.id,
      'pickup_accepted',
      'Pickup Request Accepted',
      `${wastePicker.firstName} has accepted your pickup request.`,
      { 
        pickupRequestId: pickupRequest.id,
        wastePickerId: wastePicker.id 
      }
    );

    // Send email
    await emailService.sendPickupAcceptedEmail(user, pickupRequest, wastePicker);

    // Send SMS
    if (user.isPhoneVerified && user.phone) {
      await smsService.sendPickupNotification(user.phone, pickupRequest.id);
    }
  }

  async sendPickupCompletedNotification(user, pickupRequest) {
    // Create in-app notification
    await this.createNotification(
      user.id,
      'pickup_completed',
      'Pickup Completed',
      `Your pickup has been completed! You earned ${pickupRequest.pointsEarned} points.`,
      { 
        pickupRequestId: pickupRequest.id,
        pointsEarned: pickupRequest.pointsEarned 
      }
    );

    // Send email
    await emailService.sendPickupCompletedEmail(user, pickupRequest);
  }

  async sendRewardEarnedNotification(user, points, reason) {
    // Create in-app notification
    await this.createNotification(
      user.id,
      'reward_earned',
      'Points Earned!',
      `You earned ${points} points for ${reason}.`,
      { pointsEarned: points, reason }
    );
  }

  async sendPaymentReceivedNotification(user, transaction) {
    // Create in-app notification
    await this.createNotification(
      user.id,
      'payment_received',
      'Payment Received',
      `You received ₦${transaction.amount} for your services.`,
      { transactionId: transaction.id }
    );

    // Send email
    await emailService.sendPaymentReceivedEmail(user, transaction);
  }

  async markAsRead(notificationId, userId) {
    try {
      const result = await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date() 
        })
        .where(eq(notifications.id, notificationId))
        .returning();

      return result[0];
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date() 
        })
        .where(eq(notifications.userId, userId));

      return true;
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(notifications.createdAt)
        .limit(limit)
        .offset(offset);

      return userNotifications;
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }
}

export default new NotificationService();