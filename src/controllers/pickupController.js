import db from '../database/connection.js';
import { pickupRequests, users, transactions } from '../database/schema.js';
import { eq, and, or, desc, asc, sql, between } from 'drizzle-orm';
import notificationService from '../services/notificationService.js';
import { calculateDistance, findNearbyWastePickers } from '../utils/geoUtils.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class PickupController {
  // Create pickup request
  async createPickupRequest(req, res) {
    try {
      const {
        wasteType,
        estimatedWeight,
        description,
        images,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        preferredDate,
        preferredTimeSlot
      } = req.body;

      const requesterId = req.user.id;

      // Create pickup request
      const newPickup = await db
        .insert(pickupRequests)
        .values({
          requesterId,
          wasteType,
          estimatedWeight,
          description,
          images,
          pickupAddress,
          pickupLatitude,
          pickupLongitude,
          preferredDate: preferredDate ? new Date(preferredDate) : null,
          preferredTimeSlot,
          status: 'pending'
        })
        .returning();

      const pickup = newPickup[0];

      // Send notification
      await notificationService.sendPickupRequestNotification(req.user, pickup);

      // Find nearby waste pickers and notify them
      const nearbyWastePickers = await findNearbyWastePickers(
        parseFloat(pickupLatitude),
        parseFloat(pickupLongitude),
        10 // 10km radius
      );

      // Notify nearby waste pickers
      for (const wastePicker of nearbyWastePickers) {
        await notificationService.createNotification(
          wastePicker.id,
          'pickup_request',
          'New Pickup Request Available',
          `A new ${wasteType} pickup request is available near you.`,
          { pickupRequestId: pickup.id }
        );
      }

      res.status(201).json({
        success: true,
        message: 'Pickup request created successfully',
        data: pickup
      });

    } catch (error) {
      logger.error('Create pickup request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create pickup request',
        error: error.message
      });
    }
  }

  // Get pickup requests
  async getPickupRequests(req, res) {
    try {
      const { page = 1, limit = 20, status, wasteType, userId } = req.query;
      const offset = (page - 1) * limit;

      let query = db
        .select({
          pickup: pickupRequests,
          requester: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            phone: users.phone,
            rating: users.rating
          }
        })
        .from(pickupRequests)
        .leftJoin(users, eq(pickupRequests.requesterId, users.id));

      // Apply filters
      const conditions = [];
      if (status) conditions.push(eq(pickupRequests.status, status));
      if (wasteType) conditions.push(eq(pickupRequests.wasteType, wasteType));
      if (userId) conditions.push(eq(pickupRequests.requesterId, userId));

      // Role-based filtering
      if (req.user.role === 'household') {
        conditions.push(eq(pickupRequests.requesterId, req.user.id));
      } else if (req.user.role === 'waste_picker') {
        // Show available pickups and own accepted pickups
        conditions.push(
          or(
            eq(pickupRequests.status, 'pending'),
            eq(pickupRequests.wastePickerId, req.user.id)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const pickups = await query
        .orderBy(desc(pickupRequests.createdAt))
        .limit(parseInt(limit))
        .offset(offset);

      res.json({
        success: true,
        data: pickups,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: pickups.length
        }
      });

    } catch (error) {
      logger.error('Get pickup requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pickup requests',
        error: error.message
      });
    }
  }

  // Get single pickup request
  async getPickupRequest(req, res) {
    try {
      const { id } = req.params;

      const pickup = await db
        .select({
          pickup: pickupRequests,
          requester: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            phone: users.phone,
            rating: users.rating
          }
        })
        .from(pickupRequests)
        .leftJoin(users, eq(pickupRequests.requesterId, users.id))
        .where(eq(pickupRequests.id, id))
        .limit(1);

      if (!pickup.length) {
        return res.status(404).json({
          success: false,
          message: 'Pickup request not found'
        });
      }

      // Check permissions
      const pickupData = pickup[0];
      if (req.user.role === 'household' && pickupData.pickup.requesterId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: pickupData
      });

    } catch (error) {
      logger.error('Get pickup request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pickup request',
        error: error.message
      });
    }
  }

  // Accept pickup request (waste picker only)
  async acceptPickupRequest(req, res) {
    try {
      const { id } = req.params;
      const wastePickerId = req.user.id;

      if (req.user.role !== 'waste_picker') {
        return res.status(403).json({
          success: false,
          message: 'Only waste pickers can accept pickup requests'
        });
      }

      // Check if pickup exists and is pending
      const pickup = await db
        .select()
        .from(pickupRequests)
        .where(eq(pickupRequests.id, id))
        .limit(1);

      if (!pickup.length) {
        return res.status(404).json({
          success: false,
          message: 'Pickup request not found'
        });
      }

      if (pickup[0].status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Pickup request is no longer available'
        });
      }

      // Update pickup request
      const updatedPickup = await db
        .update(pickupRequests)
        .set({
          wastePickerId,
          status: 'accepted',
          updatedAt: new Date()
        })
        .where(eq(pickupRequests.id, id))
        .returning();

      // Get requester details
      const requester = await db
        .select()
        .from(users)
        .where(eq(users.id, pickup[0].requesterId))
        .limit(1);

      // Send notification to requester
      await notificationService.sendPickupAcceptedNotification(
        requester[0],
        updatedPickup[0],
        req.user
      );

      res.json({
        success: true,
        message: 'Pickup request accepted successfully',
        data: updatedPickup[0]
      });

    } catch (error) {
      logger.error('Accept pickup request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept pickup request',
        error: error.message
      });
    }
  }

  // Update pickup status
  async updatePickupStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, actualWeight, rating, feedback } = req.body;

      // Get pickup request
      const pickup = await db
        .select()
        .from(pickupRequests)
        .where(eq(pickupRequests.id, id))
        .limit(1);

      if (!pickup.length) {
        return res.status(404).json({
          success: false,
          message: 'Pickup request not found'
        });
      }

      const pickupData = pickup[0];

      // Check permissions
      if (req.user.role === 'household' && pickupData.requesterId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (req.user.role === 'waste_picker' && pickupData.wastePickerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updateData = { status, updatedAt: new Date() };

      // Handle completion
      if (status === 'completed') {
        updateData.completedAt = new Date();
        
        if (actualWeight) {
          updateData.actualWeight = actualWeight;
        }

        // Calculate points earned (example: 10 points per kg)
        const weight = actualWeight || pickupData.estimatedWeight || 1;
        const pointsEarned = Math.floor(weight * 10);
        updateData.pointsEarned = pointsEarned;

        // Update user points
        await db
          .update(users)
          .set({
            totalPoints: sql`${users.totalPoints} + ${pointsEarned}`,
            availablePoints: sql`${users.availablePoints} + ${pointsEarned}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, pickupData.requesterId));

        // Create transaction record
        await db.insert(transactions).values({
          userId: pickupData.requesterId,
          pickupRequestId: id,
          type: 'pickup_payment',
          amount: '0.00',
          points: pointsEarned,
          status: 'completed',
          description: `Points earned for ${pickupData.wasteType} pickup`
        });
      }

      // Handle cancellation
      if (status === 'cancelled') {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = req.body.cancellationReason;
      }

      // Handle rating
      if (rating && req.user.role === 'household') {
        updateData.rating = rating;
        updateData.feedback = feedback;

        // Update waste picker rating
        if (pickupData.wastePickerId) {
          const wastePicker = await db
            .select()
            .from(users)
            .where(eq(users.id, pickupData.wastePickerId))
            .limit(1);

          if (wastePicker.length > 0) {
            const currentRating = wastePicker[0].rating || 0;
            const totalRatings = wastePicker[0].totalRatings || 0;
            const newTotalRatings = totalRatings + 1;
            const newRating = ((currentRating * totalRatings) + rating) / newTotalRatings;

            await db
              .update(users)
              .set({
                rating: newRating,
                totalRatings: newTotalRatings,
                updatedAt: new Date()
              })
              .where(eq(users.id, pickupData.wastePickerId));
          }
        }
      }

      // Update pickup request
      const updatedPickup = await db
        .update(pickupRequests)
        .set(updateData)
        .where(eq(pickupRequests.id, id))
        .returning();

      // Send notifications
      if (status === 'completed') {
        const requester = await db
          .select()
          .from(users)
          .where(eq(users.id, pickupData.requesterId))
          .limit(1);

        await notificationService.sendPickupCompletedNotification(
          requester[0],
          updatedPickup[0]
        );
      }

      res.json({
        success: true,
        message: 'Pickup status updated successfully',
        data: updatedPickup[0]
      });

    } catch (error) {
      logger.error('Update pickup status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update pickup status',
        error: error.message
      });
    }
  }

  // Get nearby pickup requests (waste picker only)
  async getNearbyPickups(req, res) {
    try {
      const { latitude, longitude, radius = 10 } = req.query;

      if (req.user.role !== 'waste_picker') {
        return res.status(403).json({
          success: false,
          message: 'Only waste pickers can access this endpoint'
        });
      }

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      // Get pending pickup requests within radius
      const nearbyPickups = await db
        .select({
          pickup: pickupRequests,
          requester: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            rating: users.rating
          }
        })
        .from(pickupRequests)
        .leftJoin(users, eq(pickupRequests.requesterId, users.id))
        .where(eq(pickupRequests.status, 'pending'));

      // Filter by distance (this is a simplified approach)
      const filteredPickups = nearbyPickups.filter(item => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(item.pickup.pickupLatitude),
          parseFloat(item.pickup.pickupLongitude)
        );
        return distance <= parseFloat(radius);
      });

      // Add distance to each pickup
      const pickupsWithDistance = filteredPickups.map(item => ({
        ...item,
        distance: calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(item.pickup.pickupLatitude),
          parseFloat(item.pickup.pickupLongitude)
        )
      }));

      // Sort by distance
      pickupsWithDistance.sort((a, b) => a.distance - b.distance);

      res.json({
        success: true,
        data: pickupsWithDistance
      });

    } catch (error) {
      logger.error('Get nearby pickups error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get nearby pickups',
        error: error.message
      });
    }
  }

  // Get pickup statistics
  async getPickupStats(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      let dateCondition = null;
      if (startDate && endDate) {
        dateCondition = between(
          pickupRequests.createdAt,
          new Date(startDate),
          new Date(endDate)
        );
      }

      let userCondition;
      if (req.user.role === 'household') {
        userCondition = eq(pickupRequests.requesterId, userId);
      } else if (req.user.role === 'waste_picker') {
        userCondition = eq(pickupRequests.wastePickerId, userId);
      } else {
        // Admin can see all stats
        userCondition = sql`1=1`;
      }

      const conditions = [userCondition];
      if (dateCondition) conditions.push(dateCondition);

      // Get basic stats
      const stats = await db
        .select({
          totalPickups: sql`count(*)`,
          completedPickups: sql`count(*) filter (where status = 'completed')`,
          pendingPickups: sql`count(*) filter (where status = 'pending')`,
          cancelledPickups: sql`count(*) filter (where status = 'cancelled')`,
          totalWeight: sql`sum(actual_weight)`,
          totalPoints: sql`sum(points_earned)`
        })
        .from(pickupRequests)
        .where(and(...conditions));

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      logger.error('Get pickup stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pickup statistics',
        error: error.message
      });
    }
  }

  // Cancel pickup request
  async cancelPickupRequest(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Get pickup request
      const pickup = await db
        .select()
        .from(pickupRequests)
        .where(eq(pickupRequests.id, id))
        .limit(1);

      if (!pickup.length) {
        return res.status(404).json({
          success: false,
          message: 'Pickup request not found'
        });
      }

      const pickupData = pickup[0];

      // Check permissions
      if (req.user.role === 'household' && pickupData.requesterId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only the requester can cancel this pickup'
        });
      }

      if (pickupData.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel completed pickup'
        });
      }

      // Update pickup request
      const updatedPickup = await db
        .update(pickupRequests)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason,
          updatedAt: new Date()
        })
        .where(eq(pickupRequests.id, id))
        .returning();

      res.json({
        success: true,
        message: 'Pickup request cancelled successfully',
        data: updatedPickup[0]
      });

    } catch (error) {
      logger.error('Cancel pickup request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel pickup request',
        error: error.message
      });
    }
  }
}

export default PickupController;