import db from '../database/connection.js';
import { rewards, rewardRedemptions, users, transactions } from '../database/schema.js';
import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import notificationService from '../services/notificationService.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class RewardsController {
  // Get all available rewards
  async getRewards(req, res) {
    try {
      const { page = 1, limit = 20, type, isActive = true, search } = req.query;
      const offset = (page - 1) * limit;

      let query = db.select().from(rewards);

      // Apply filters
      const conditions = [];
      if (type) conditions.push(eq(rewards.type, type));
      if (isActive !== undefined) conditions.push(eq(rewards.isActive, isActive === 'true'));
      if (search) {
        conditions.push(
          or(
            like(rewards.name, `%${search}%`),
            like(rewards.description, `%${search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const allRewards = await query
        .orderBy(rewards.pointsCost)
        .limit(parseInt(limit))
        .offset(offset);

      res.json({
        success: true,
        data: allRewards,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allRewards.length
        }
      });

    } catch (error) {
      logger.error('Get rewards error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get rewards',
        error: error.message
      });
    }
  }

  // Get single reward
  async getReward(req, res) {
    try {
      const { id } = req.params;

      const reward = await db
        .select()
        .from(rewards)
        .where(eq(rewards.id, id))
        .limit(1);

      if (!reward.length) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }

      res.json({
        success: true,
        data: reward[0]
      });

    } catch (error) {
      logger.error('Get reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get reward',
        error: error.message
      });
    }
  }

  // Redeem reward
  async redeemReward(req, res) {
    try {
      const { rewardId, deliveryInfo } = req.body;
      const userId = req.user.id;

      // Get reward details
      const reward = await db
        .select()
        .from(rewards)
        .where(eq(rewards.id, rewardId))
        .limit(1);

      if (!reward.length) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }

      const rewardData = reward[0];

      // Check if reward is active
      if (!rewardData.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Reward is not available'
        });
      }

      // Check if user has enough points
      if (req.user.availablePoints < rewardData.pointsCost) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient points'
        });
      }

      // Check stock
      if (rewardData.stockQuantity !== null && rewardData.stockQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Reward is out of stock'
        });
      }

      // Generate redemption code
      const redemptionCode = `RN${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create redemption record
      const redemption = await db
        .insert(rewardRedemptions)
        .values({
          userId,
          rewardId,
          pointsUsed: rewardData.pointsCost,
          redemptionCode,
          deliveryInfo,
          status: 'pending'
        })
        .returning();

      // Update user points
      await db
        .update(users)
        .set({
          availablePoints: sql`${users.availablePoints} - ${rewardData.pointsCost}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Update reward stock if applicable
      if (rewardData.stockQuantity !== null) {
        await db
          .update(rewards)
          .set({
            stockQuantity: sql`${rewards.stockQuantity} - 1`,
            updatedAt: new Date()
          })
          .where(eq(rewards.id, rewardId));
      }

      // Send notifications
      await notificationService.createNotification(
        userId,
        'reward_earned',
        'Reward Redeemed Successfully',
        `You have successfully redeemed ${rewardData.name}`,
        { redemptionId: redemption[0].id, redemptionCode }
      );

      // Send email confirmation
      await emailService.sendRewardRedemptionEmail(req.user, rewardData, redemption[0]);

      res.status(201).json({
        success: true,
        message: 'Reward redeemed successfully',
        data: {
          redemption: redemption[0],
          redemptionCode
        }
      });

    } catch (error) {
      logger.error('Redeem reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to redeem reward',
        error: error.message
      });
    }
  }

  // Get user redemptions
  async getUserRedemptions(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;
      const userId = req.user.id;

      let query = db
        .select({
          redemption: rewardRedemptions,
          reward: {
            id: rewards.id,
            name: rewards.name,
            type: rewards.type,
            value: rewards.value,
            image: rewards.image
          }
        })
        .from(rewardRedemptions)
        .leftJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
        .where(eq(rewardRedemptions.userId, userId));

      if (status) {
        query = query.where(and(
          eq(rewardRedemptions.userId, userId),
          eq(rewardRedemptions.status, status)
        ));
      }

      const redemptions = await query
        .orderBy(desc(rewardRedemptions.createdAt))
        .limit(parseInt(limit))
        .offset(offset);

      res.json({
        success: true,
        data: redemptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: redemptions.length
        }
      });

    } catch (error) {
      logger.error('Get user redemptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get redemptions',
        error: error.message
      });
    }
  }

  // Get redemption details
  async getRedemption(req, res) {
    try {
      const { id } = req.params;

      const redemption = await db
        .select({
          redemption: rewardRedemptions,
          reward: rewards,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(rewardRedemptions)
        .leftJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
        .leftJoin(users, eq(rewardRedemptions.userId, users.id))
        .where(eq(rewardRedemptions.id, id))
        .limit(1);

      if (!redemption.length) {
        return res.status(404).json({
          success: false,
          message: 'Redemption not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'admin' && redemption[0].redemption.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: redemption[0]
      });

    } catch (error) {
      logger.error('Get redemption error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get redemption',
        error: error.message
      });
    }
  }

  // Update redemption status (admin only)
  async updateRedemptionStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedRedemption = await db
        .update(rewardRedemptions)
        .set({
          status,
          completedAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(rewardRedemptions.id, id))
        .returning();

      if (!updatedRedemption.length) {
        return res.status(404).json({
          success: false,
          message: 'Redemption not found'
        });
      }

      res.json({
        success: true,
        message: 'Redemption status updated successfully',
        data: updatedRedemption[0]
      });

    } catch (error) {
      logger.error('Update redemption status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update redemption status',
        error: error.message
      });
    }
  }

  // Create reward (admin only)
  async createReward(req, res) {
    try {
      const {
        name,
        description,
        type,
        pointsCost,
        value,
        provider,
        stockQuantity,
        image,
        termsAndConditions,
        expiryDate
      } = req.body;

      const newReward = await db
        .insert(rewards)
        .values({
          name,
          description,
          type,
          pointsCost: parseInt(pointsCost),
          value: parseFloat(value),
          provider,
          stockQuantity: stockQuantity ? parseInt(stockQuantity) : null,
          image,
          termsAndConditions,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          isActive: true
        })
        .returning();

      res.status(201).json({
        success: true,
        message: 'Reward created successfully',
        data: newReward[0]
      });

    } catch (error) {
      logger.error('Create reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create reward',
        error: error.message
      });
    }
  }

  // Update reward (admin only)
  async updateReward(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.expiryDate) {
        updateData.expiryDate = new Date(updateData.expiryDate);
      }

      if (updateData.pointsCost) {
        updateData.pointsCost = parseInt(updateData.pointsCost);
      }

      if (updateData.value) {
        updateData.value = parseFloat(updateData.value);
      }

      if (updateData.stockQuantity) {
        updateData.stockQuantity = parseInt(updateData.stockQuantity);
      }

      updateData.updatedAt = new Date();

      const updatedReward = await db
        .update(rewards)
        .set(updateData)
        .where(eq(rewards.id, id))
        .returning();

      if (!updatedReward.length) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }

      res.json({
        success: true,
        message: 'Reward updated successfully',
        data: updatedReward[0]
      });

    } catch (error) {
      logger.error('Update reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update reward',
        error: error.message
      });
    }
  }

  // Delete reward (admin only)
  async deleteReward(req, res) {
    try {
      const { id } = req.params;

      // Soft delete by setting isActive to false
      const deletedReward = await db
        .update(rewards)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(rewards.id, id))
        .returning();

      if (!deletedReward.length) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }

      res.json({
        success: true,
        message: 'Reward deleted successfully'
      });

    } catch (error) {
      logger.error('Delete reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete reward',
        error: error.message
      });
    }
  }

  // Get reward statistics
  async getRewardStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      let dateCondition = sql`1=1`;
      if (startDate && endDate) {
        dateCondition = and(
          sql`${rewardRedemptions.createdAt} >= ${new Date(startDate)}`,
          sql`${rewardRedemptions.createdAt} <= ${new Date(endDate)}`
        );
      }

      // Get redemption stats
      const stats = await db
        .select({
          totalRedemptions: sql`count(*)`,
          completedRedemptions: sql`count(*) filter (where status = 'completed')`,
          pendingRedemptions: sql`count(*) filter (where status = 'pending')`,
          totalPointsRedeemed: sql`sum(points_used)`,
          totalValueRedeemed: sql`sum(${rewards.value})`
        })
        .from(rewardRedemptions)
        .leftJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
        .where(dateCondition);

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      logger.error('Get reward stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get reward statistics',
        error: error.message
      });
    }
  }
}

export default new RewardsController();