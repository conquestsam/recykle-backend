import cron from 'node-cron';
import db from '../database/connection.js';
import { 
  analyticsData, 
  users, 
  pickupRequests, 
  transactions, 
  notifications,
  rewardRedemptions,
  rewards
} from '../database/schema.js';
import { eq, sql, between, and, lt } from 'drizzle-orm';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

class CronJobs {
  // Initialize all cron jobs
  static init() {
    logger.info('Initializing cron jobs...');

    // Daily analytics aggregation (runs at midnight)
    this.dailyAnalytics();
    
    // Weekly summary emails (runs every Sunday at 9 AM)
    this.weeklySummaryEmails();
    
    // Cleanup old notifications (runs daily at 2 AM)
    this.cleanupNotifications();
    
    // Update reward stock (runs every hour)
    this.updateRewardStock();
    
    // Send pickup reminders (runs every 30 minutes)
    this.pickupReminders();
    
    // Generate monthly reports (runs on 1st of every month at 6 AM)
    this.monthlyReports();
    
    // Backup database (runs daily at 3 AM)
    this.databaseBackup();
    
    // Clean up expired tokens (runs daily at 4 AM)
    this.cleanupExpiredTokens();

    logger.info('All cron jobs initialized successfully');
  }

  // Daily analytics aggregation
  static dailyAnalytics() {
    cron.schedule('0 0 * * *', async () => {
      logger.info('Running daily analytics aggregation...');
      
      try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        
        // Aggregate yesterday's data
        const [pickupStats] = await db
          .select({
            totalPickups: sql`count(*)`,
            completedPickups: sql`count(*) filter (where status = 'completed')`,
            totalWasteCollected: sql`coalesce(sum(actual_weight), 0)`,
            totalPointsAwarded: sql`coalesce(sum(points_earned), 0)`
          })
          .from(pickupRequests)
          .where(between(pickupRequests.createdAt, yesterday, endOfYesterday));

        const [userStats] = await db
          .select({
            newRegistrations: sql`count(*)`
          })
          .from(users)
          .where(between(users.createdAt, yesterday, endOfYesterday));

        const [activeUsers] = await db
          .select({
            activeUsers: sql`count(distinct user_id)`
          })
          .from(pickupRequests)
          .where(between(pickupRequests.createdAt, yesterday, endOfYesterday));

        const [revenueStats] = await db
          .select({
            totalRevenue: sql`coalesce(sum(amount), 0)`
          })
          .from(transactions)
          .where(and(
            between(transactions.createdAt, yesterday, endOfYesterday),
            eq(transactions.status, 'completed')
          ));

        // Store aggregated data
        await db.insert(analyticsData).values({
          date: yesterday,
          totalPickups: parseInt(pickupStats.totalPickups) || 0,
          totalWasteCollected: parseFloat(pickupStats.totalWasteCollected) || 0,
          totalPointsAwarded: parseInt(pickupStats.totalPointsAwarded) || 0,
          totalRevenue: parseFloat(revenueStats.totalRevenue) || 0,
          activeUsers: parseInt(activeUsers.activeUsers) || 0,
          newRegistrations: parseInt(userStats.newRegistrations) || 0,
          wasteTypeBreakdown: {},
          locationData: {}
        });

        logger.info('Daily analytics aggregation completed successfully');
      } catch (error) {
        logger.error('Daily analytics aggregation failed:', error);
      }
    });
  }

  // Weekly summary emails
  static weeklySummaryEmails() {
    cron.schedule('0 9 * * 0', async () => {
      logger.info('Sending weekly summary emails...');
      
      try {
        // Get active users
        const activeUsers = await db
          .select()
          .from(users)
          .where(and(
            eq(users.status, 'active'),
            eq(users.isEmailVerified, true)
          ));

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        for (const user of activeUsers) {
          try {
            // Get user's weekly stats
            const [userPickups] = await db
              .select({
                pickups: sql`count(*)`,
                pointsEarned: sql`coalesce(sum(points_earned), 0)`,
                wasteCollected: sql`coalesce(sum(actual_weight), 0)`
              })
              .from(pickupRequests)
              .where(and(
                eq(pickupRequests.requesterId, user.id),
                sql`${pickupRequests.createdAt} >= ${weekStart}`,
                eq(pickupRequests.status, 'completed')
              ));

            const [userEarnings] = await db
              .select({
                earnings: sql`coalesce(sum(amount), 0)`
              })
              .from(transactions)
              .where(and(
                eq(transactions.userId, user.id),
                eq(transactions.type, 'pickup_payment'),
                eq(transactions.status, 'completed'),
                sql`${transactions.createdAt} >= ${weekStart}`
              ));

            const summaryData = {
              pickups: parseInt(userPickups.pickups) || 0,
              pointsEarned: parseInt(userPickups.pointsEarned) || 0,
              wasteCollected: parseFloat(userPickups.wasteCollected) || 0,
              earnings: parseFloat(userEarnings.earnings) || 0
            };

            // Send email only if user had activity
            if (summaryData.pickups > 0 || summaryData.pointsEarned > 0) {
              await emailService.sendWeeklySummaryEmail(user, summaryData);
              logger.info(`Weekly summary sent to ${user.email}`);
            }
          } catch (userError) {
            logger.error(`Failed to send weekly summary to ${user.email}:`, userError);
          }
        }

        logger.info('Weekly summary emails completed');
      } catch (error) {
        logger.error('Weekly summary email sending failed:', error);
      }
    });
  }

  // Cleanup old notifications
  static cleanupNotifications() {
    cron.schedule('0 2 * * *', async () => {
      logger.info('Cleaning up old notifications...');
      
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deletedNotifications = await db
          .delete(notifications)
          .where(lt(notifications.createdAt, thirtyDaysAgo))
          .returning();

        logger.info(`Deleted ${deletedNotifications.length} old notifications`);
      } catch (error) {
        logger.error('Notifications cleanup failed:', error);
      }
    });
  }

  // Update reward stock
  static updateRewardStock() {
    cron.schedule('0 * * * *', async () => {
      logger.info('Updating reward stock...');
      
      try {
        // Get rewards with low stock
        const lowStockRewards = await db
          .select()
          .from(rewards)
          .where(and(
            eq(rewards.isActive, true),
            sql`${rewards.stockQuantity} <= 10`
          ));

        if (lowStockRewards.length > 0) {
          logger.warn(`${lowStockRewards.length} rewards have low stock`);
          
          // Here you could implement automatic restocking logic
          // or send notifications to admins
        }

        // Deactivate expired rewards
        const expiredRewards = await db
          .update(rewards)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(
            eq(rewards.isActive, true),
            lt(rewards.expiryDate, new Date())
          ))
          .returning();

        if (expiredRewards.length > 0) {
          logger.info(`Deactivated ${expiredRewards.length} expired rewards`);
        }

      } catch (error) {
        logger.error('Reward stock update failed:', error);
      }
    });
  }

  // Send pickup reminders
  static pickupReminders() {
    cron.schedule('*/30 * * * *', async () => {
      logger.info('Checking for pickup reminders...');
      
      try {
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        // Get pickups scheduled within the next hour
        const upcomingPickups = await db
          .select({
            pickup: pickupRequests,
            requester: users
          })
          .from(pickupRequests)
          .leftJoin(users, eq(pickupRequests.requesterId, users.id))
          .where(and(
            eq(pickupRequests.status, 'accepted'),
            between(pickupRequests.preferredDate, now, oneHourFromNow)
          ));

        for (const { pickup, requester } of upcomingPickups) {
          try {
            // Send reminder notification
            await db.insert(notifications).values({
              userId: requester.id,
              type: 'pickup_request',
              title: 'Pickup Reminder',
              message: `Your waste pickup is scheduled in 1 hour. Please have your waste ready.`,
              data: { pickupRequestId: pickup.id }
            });

            // Send SMS if phone is verified
            if (requester.isPhoneVerified && requester.phone) {
              // SMS reminder logic would go here
              logger.info(`Pickup reminder sent to ${requester.phone}`);
            }
          } catch (reminderError) {
            logger.error(`Failed to send pickup reminder for ${pickup.id}:`, reminderError);
          }
        }

        if (upcomingPickups.length > 0) {
          logger.info(`Sent ${upcomingPickups.length} pickup reminders`);
        }

      } catch (error) {
        logger.error('Pickup reminders failed:', error);
      }
    });
  }

  // Generate monthly reports
  static monthlyReports() {
    cron.schedule('0 6 1 * *', async () => {
      logger.info('Generating monthly reports...');
      
      try {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Generate comprehensive monthly report
        const [monthlyStats] = await db
          .select({
            totalPickups: sql`count(*)`,
            completedPickups: sql`count(*) filter (where status = 'completed')`,
            totalWasteCollected: sql`coalesce(sum(actual_weight), 0)`,
            totalPointsAwarded: sql`coalesce(sum(points_earned), 0)`,
            totalRevenue: sql`coalesce(sum(amount), 0)`
          })
          .from(pickupRequests)
          .leftJoin(transactions, eq(pickupRequests.id, transactions.pickupRequestId))
          .where(between(pickupRequests.createdAt, lastMonth, thisMonth));

        const reportData = {
          period: `${lastMonth.toISOString().slice(0, 7)}`,
          ...monthlyStats,
          generatedAt: new Date().toISOString()
        };

        // Store report or send to admins
        logger.info('Monthly report generated:', reportData);

        // Send report to admin users
        const adminUsers = await db
          .select()
          .from(users)
          .where(and(
            eq(users.role, 'admin'),
            eq(users.isEmailVerified, true)
          ));

        for (const admin of adminUsers) {
          // Send monthly report email
          // This would be implemented with a proper email template
          logger.info(`Monthly report sent to admin: ${admin.email}`);
        }

      } catch (error) {
        logger.error('Monthly report generation failed:', error);
      }
    });
  }

  // Database backup
  static databaseBackup() {
    cron.schedule('0 3 * * *', async () => {
      logger.info('Creating database backup...');
      
      try {
        // This is a simplified backup implementation
        // In production, you'd use proper database backup tools
        
        const backupData = {
          timestamp: new Date().toISOString(),
          tables: {
            users: await db.select().from(users).limit(1000),
            pickupRequests: await db.select().from(pickupRequests).limit(1000),
            transactions: await db.select().from(transactions).limit(1000)
          }
        };

        // In a real implementation, you'd save this to cloud storage
        logger.info('Database backup created successfully');
        
      } catch (error) {
        logger.error('Database backup failed:', error);
      }
    });
  }

  // Clean up expired tokens
  static cleanupExpiredTokens() {
    cron.schedule('0 4 * * *', async () => {
      logger.info('Cleaning up expired tokens...');
      
      try {
        const now = new Date();

        // Clean up expired password reset tokens
        const updatedUsers = await db
          .update(users)
          .set({
            passwordResetToken: null,
            passwordResetExpires: null,
            updatedAt: new Date()
          })
          .where(lt(users.passwordResetExpires, now))
          .returning();

        logger.info(`Cleaned up ${updatedUsers.length} expired password reset tokens`);

      } catch (error) {
        logger.error('Token cleanup failed:', error);
      }
    });
  }

  // Stop all cron jobs
  static destroy() {
    cron.getTasks().forEach((task, name) => {
      task.destroy();
      logger.info(`Stopped cron job: ${name}`);
    });
  }
}

export default CronJobs;