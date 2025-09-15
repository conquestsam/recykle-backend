import db from '../database/connection.js';
import { subscriptions, users, transactions } from '../database/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import paymentService from '../services/paymentService.js';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';

class SubscriptionController {
  // Get user subscriptions
  async getSubscriptions(req, res) {
    try {
      const userId = req.user.id;

      const userSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt));

      res.json({
        success: true,
        data: userSubscriptions
      });

    } catch (error) {
      logger.error('Get subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscriptions',
        error: error.message
      });
    }
  }

  // Create subscription
  async createSubscription(req, res) {
    try {
      const { planName, planType, amount, features } = req.body;
      const userId = req.user.id;

      // Check if user already has active subscription
      const existingSubscription = await db
        .select()
        .from(subscriptions)
        .where(and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        ))
        .limit(1);

      if (existingSubscription.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User already has an active subscription'
        });
      }

      // Calculate end date (30 days from now)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const newSubscription = await db
        .insert(subscriptions)
        .values({
          userId,
          planName,
          planType,
          amount,
          endDate,
          features,
          status: 'trial'
        })
        .returning();

      // Send confirmation email
      await emailService.sendSubscriptionConfirmationEmail(req.user, newSubscription[0]);

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: newSubscription[0]
      });

    } catch (error) {
      logger.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription',
        error: error.message
      });
    }
  }

  // Update subscription
  async updateSubscription(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      const updatedSubscription = await db
        .update(subscriptions)
        .set({ ...updateData, updatedAt: new Date() })
        .where(and(
          eq(subscriptions.id, id),
          eq(subscriptions.userId, userId)
        ))
        .returning();

      if (!updatedSubscription.length) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        data: updatedSubscription[0]
      });

    } catch (error) {
      logger.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subscription',
        error: error.message
      });
    }
  }

  // Cancel subscription
  async cancelSubscription(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const cancelledSubscription = await db
        .update(subscriptions)
        .set({ 
          status: 'cancelled',
          autoRenew: false,
          updatedAt: new Date() 
        })
        .where(and(
          eq(subscriptions.id, id),
          eq(subscriptions.userId, userId)
        ))
        .returning();

      if (!cancelledSubscription.length) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      res.json({
        success: true,
        message: 'Subscription cancelled successfully'
      });

    } catch (error) {
      logger.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel subscription',
        error: error.message
      });
    }
  }

  // Get subscription plans
  async getSubscriptionPlans(req, res) {
    try {
      const plans = [
        {
          id: 'basic',
          name: 'Basic Plan',
          type: 'basic',
          price: 0,
          features: [
            'Up to 5 pickup requests per month',
            'Basic rewards access',
            'Email notifications',
            'Standard support'
          ],
          popular: false
        },
        {
          id: 'premium',
          name: 'Premium Plan',
          type: 'premium',
          price: 2000,
          features: [
            'Unlimited pickup requests',
            'Priority pickup scheduling',
            'Premium rewards access',
            'SMS notifications',
            'Advanced analytics',
            'Priority support'
          ],
          popular: true
        },
        {
          id: 'enterprise',
          name: 'Enterprise Plan',
          type: 'enterprise',
          price: 10000,
          features: [
            'Everything in Premium',
            'Custom pickup schedules',
            'Bulk operations',
            'API access',
            'Custom reporting',
            'Dedicated support'
          ],
          popular: false
        }
      ];

      res.json({
        success: true,
        data: plans
      });

    } catch (error) {
      logger.error('Get subscription plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscription plans',
        error: error.message
      });
    }
  }

  // Upgrade subscription
  async upgradeSubscription(req, res) {
    try {
      const { id } = req.params;
      const { newPlanType, newAmount } = req.body;
      const userId = req.user.id;

      // Get current subscription
      const currentSubscription = await db
        .select()
        .from(subscriptions)
        .where(and(
          eq(subscriptions.id, id),
          eq(subscriptions.userId, userId)
        ))
        .limit(1);

      if (!currentSubscription.length) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Update subscription
      const upgradedSubscription = await db
        .update(subscriptions)
        .set({
          planType: newPlanType,
          amount: newAmount,
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, id))
        .returning();

      res.json({
        success: true,
        message: 'Subscription upgraded successfully',
        data: upgradedSubscription[0]
      });

    } catch (error) {
      logger.error('Upgrade subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upgrade subscription',
        error: error.message
      });
    }
  }
}

export const getSubscriptions = new SubscriptionController().getSubscriptions;
export const createSubscription = new SubscriptionController().createSubscription;
export const updateSubscription = new SubscriptionController().updateSubscription;
export const cancelSubscription = new SubscriptionController().cancelSubscription;
export const getSubscriptionPlans = new SubscriptionController().getSubscriptionPlans;
export const upgradeSubscription = new SubscriptionController().upgradeSubscription;