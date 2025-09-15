import db from '../database/connection.js';
import { 
  users, 
  pickupRequests, 
  transactions, 
  rewardRedemptions, 
  analyticsData 
} from '../database/schema.js';
import { eq, and, or, desc, asc, sql, between, gte, lte } from 'drizzle-orm';
import logger from '../utils/logger.js';

class AnalyticsController {
  // Get dashboard overview
  async getDashboardOverview(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const dateCondition = between(pickupRequests.createdAt, startDate, endDate);

      // Get pickup statistics
      const pickupStats = await db
        .select({
          totalPickups: sql`count(*)`,
          completedPickups: sql`count(*) filter (where status = 'completed')`,
          pendingPickups: sql`count(*) filter (where status = 'pending')`,
          cancelledPickups: sql`count(*) filter (where status = 'cancelled')`,
          totalWasteCollected: sql`sum(actual_weight)`,
          totalPointsAwarded: sql`sum(points_earned)`
        })
        .from(pickupRequests)
        .where(dateCondition);

      // Get user statistics
      const userStats = await db
        .select({
          totalUsers: sql`count(*)`,
          activeUsers: sql`count(*) filter (where status = 'active')`,
          households: sql`count(*) filter (where role = 'household')`,
          wastePickers: sql`count(*) filter (where role = 'waste_picker')`,
          recyclingCompanies: sql`count(*) filter (where role = 'recycling_company')`,
          newRegistrations: sql`count(*) filter (where created_at >= ${startDate})`
        })
        .from(users);

      // Get transaction statistics
      const transactionStats = await db
        .select({
          totalTransactions: sql`count(*)`,
          totalRevenue: sql`sum(amount)`,
          completedTransactions: sql`count(*) filter (where status = 'completed')`,
          totalPointsRedeemed: sql`sum(points) filter (where points < 0)`
        })
        .from(transactions)
        .where(between(transactions.createdAt, startDate, endDate));

      // Get reward statistics
      const rewardStats = await db
        .select({
          totalRedemptions: sql`count(*)`,
          completedRedemptions: sql`count(*) filter (where status = 'completed')`,
          totalPointsUsed: sql`sum(points_used)`
        })
        .from(rewardRedemptions)
        .where(between(rewardRedemptions.createdAt, startDate, endDate));

      res.json({
        success: true,
        data: {
          period,
          dateRange: { startDate, endDate },
          pickups: pickupStats[0],
          users: userStats[0],
          transactions: transactionStats[0],
          rewards: rewardStats[0]
        }
      });

    } catch (error) {
      logger.error('Get dashboard overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard overview',
        error: error.message
      });
    }
  }

  // Get pickup analytics
  async getPickupAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;

      let dateCondition = sql`1=1`;
      if (startDate && endDate) {
        dateCondition = between(
          pickupRequests.createdAt,
          new Date(startDate),
          new Date(endDate)
        );
      }

      // Get pickup trends
      let dateFormat;
      switch (groupBy) {
        case 'hour':
          dateFormat = sql`date_trunc('hour', created_at)`;
          break;
        case 'day':
          dateFormat = sql`date_trunc('day', created_at)`;
          break;
        case 'week':
          dateFormat = sql`date_trunc('week', created_at)`;
          break;
        case 'month':
          dateFormat = sql`date_trunc('month', created_at)`;
          break;
        default:
          dateFormat = sql`date_trunc('day', created_at)`;
      }

      const pickupTrends = await db
        .select({
          date: dateFormat,
          totalPickups: sql`count(*)`,
          completedPickups: sql`count(*) filter (where status = 'completed')`,
          totalWeight: sql`sum(actual_weight)`,
          totalPoints: sql`sum(points_earned)`
        })
        .from(pickupRequests)
        .where(dateCondition)
        .groupBy(dateFormat)
        .orderBy(dateFormat);

      // Get waste type breakdown
      const wasteTypeBreakdown = await db
        .select({
          wasteType: pickupRequests.wasteType,
          count: sql`count(*)`,
          totalWeight: sql`sum(actual_weight)`,
          percentage: sql`round(count(*) * 100.0 / sum(count(*)) over(), 2)`
        })
        .from(pickupRequests)
        .where(dateCondition)
        .groupBy(pickupRequests.wasteType)
        .orderBy(sql`count(*) desc`);

      // Get status distribution
      const statusDistribution = await db
        .select({
          status: pickupRequests.status,
          count: sql`count(*)`,
          percentage: sql`round(count(*) * 100.0 / sum(count(*)) over(), 2)`
        })
        .from(pickupRequests)
        .where(dateCondition)
        .groupBy(pickupRequests.status);

      // Get top performing waste pickers
      const topWastePickers = await db
        .select({
          wastePickerId: pickupRequests.wastePickerId,
          firstName: users.firstName,
          lastName: users.lastName,
          completedPickups: sql`count(*) filter (where ${pickupRequests.status} = 'completed')`,
          totalWeight: sql`sum(${pickupRequests.actualWeight})`,
          averageRating: sql`avg(${pickupRequests.rating})`
        })
        .from(pickupRequests)
        .leftJoin(users, eq(pickupRequests.wastePickerId, users.id))
        .where(and(dateCondition, eq(pickupRequests.status, 'completed')))
        .groupBy(pickupRequests.wastePickerId, users.firstName, users.lastName)
        .orderBy(sql`count(*) desc`)
        .limit(10);

      res.json({
        success: true,
        data: {
          trends: pickupTrends,
          wasteTypeBreakdown,
          statusDistribution,
          topWastePickers
        }
      });

    } catch (error) {
      logger.error('Get pickup analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pickup analytics',
        error: error.message
      });
    }
  }

  // Get user analytics
  async getUserAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;

      let dateCondition = sql`1=1`;
      if (startDate && endDate) {
        dateCondition = between(
          users.createdAt,
          new Date(startDate),
          new Date(endDate)
        );
      }

      // Get user registration trends
      let dateFormat;
      switch (groupBy) {
        case 'day':
          dateFormat = sql`date_trunc('day', created_at)`;
          break;
        case 'week':
          dateFormat = sql`date_trunc('week', created_at)`;
          break;
        case 'month':
          dateFormat = sql`date_trunc('month', created_at)`;
          break;
        default:
          dateFormat = sql`date_trunc('day', created_at)`;
      }

      const registrationTrends = await db
        .select({
          date: dateFormat,
          totalRegistrations: sql`count(*)`,
          households: sql`count(*) filter (where role = 'household')`,
          wastePickers: sql`count(*) filter (where role = 'waste_picker')`,
          recyclingCompanies: sql`count(*) filter (where role = 'recycling_company')`
        })
        .from(users)
        .where(dateCondition)
        .groupBy(dateFormat)
        .orderBy(dateFormat);

      // Get role distribution
      const roleDistribution = await db
        .select({
          role: users.role,
          count: sql`count(*)`,
          percentage: sql`round(count(*) * 100.0 / sum(count(*)) over(), 2)`
        })
        .from(users)
        .groupBy(users.role);

      // Get status distribution
      const statusDistribution = await db
        .select({
          status: users.status,
          count: sql`count(*)`,
          percentage: sql`round(count(*) * 100.0 / sum(count(*)) over(), 2)`
        })
        .from(users)
        .groupBy(users.status);

      // Get location distribution (top cities)
      const locationDistribution = await db
        .select({
          city: users.city,
          state: users.state,
          count: sql`count(*)`,
          percentage: sql`round(count(*) * 100.0 / sum(count(*)) over(), 2)`
        })
        .from(users)
        .where(sql`${users.city} is not null`)
        .groupBy(users.city, users.state)
        .orderBy(sql`count(*) desc`)
        .limit(20);

      // Get user engagement metrics
      const engagementMetrics = await db
        .select({
          totalUsers: sql`count(*)`,
          activeUsers: sql`count(*) filter (where last_login_at >= current_date - interval '30 days')`,
          verifiedEmails: sql`count(*) filter (where is_email_verified = true)`,
          verifiedPhones: sql`count(*) filter (where is_phone_verified = true)`,
          averagePoints: sql`avg(available_points)`,
          totalPointsInCirculation: sql`sum(available_points)`
        })
        .from(users);

      res.json({
        success: true,
        data: {
          registrationTrends,
          roleDistribution,
          statusDistribution,
          locationDistribution,
          engagement: engagementMetrics[0]
        }
      });

    } catch (error) {
      logger.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user analytics',
        error: error.message
      });
    }
  }

  // Get financial analytics
  async getFinancialAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;

      let dateCondition = sql`1=1`;
      if (startDate && endDate) {
        dateCondition = between(
          transactions.createdAt,
          new Date(startDate),
          new Date(endDate)
        );
      }

      // Get revenue trends
      let dateFormat;
      switch (groupBy) {
        case 'day':
          dateFormat = sql`date_trunc('day', created_at)`;
          break;
        case 'week':
          dateFormat = sql`date_trunc('week', created_at)`;
          break;
        case 'month':
          dateFormat = sql`date_trunc('month', created_at)`;
          break;
        default:
          dateFormat = sql`date_trunc('day', created_at)`;
      }

      const revenueTrends = await db
        .select({
          date: dateFormat,
          totalRevenue: sql`sum(amount)`,
          totalTransactions: sql`count(*)`,
          averageTransactionValue: sql`avg(amount)`
        })
        .from(transactions)
        .where(and(dateCondition, eq(transactions.status, 'completed')))
        .groupBy(dateFormat)
        .orderBy(dateFormat);

      // Get transaction type breakdown
      const transactionTypeBreakdown = await db
        .select({
          type: transactions.type,
          count: sql`count(*)`,
          totalAmount: sql`sum(amount)`,
          percentage: sql`round(count(*) * 100.0 / sum(count(*)) over(), 2)`
        })
        .from(transactions)
        .where(and(dateCondition, eq(transactions.status, 'completed')))
        .groupBy(transactions.type);

      // Get payment method distribution
      const paymentMethodDistribution = await db
        .select({
          paymentMethod: transactions.paymentMethod,
          count: sql`count(*)`,
          totalAmount: sql`sum(amount)`,
          percentage: sql`round(count(*) * 100.0 / sum(count(*)) over(), 2)`
        })
        .from(transactions)
        .where(and(
          dateCondition, 
          eq(transactions.status, 'completed'),
          sql`${transactions.paymentMethod} is not null`
        ))
        .groupBy(transactions.paymentMethod);

      // Get financial summary
      const financialSummary = await db
        .select({
          totalRevenue: sql`sum(amount) filter (where status = 'completed')`,
          totalTransactions: sql`count(*) filter (where status = 'completed')`,
          pendingAmount: sql`sum(amount) filter (where status = 'pending')`,
          failedTransactions: sql`count(*) filter (where status = 'failed')`,
          averageTransactionValue: sql`avg(amount) filter (where status = 'completed')`
        })
        .from(transactions)
        .where(dateCondition);

      res.json({
        success: true,
        data: {
          revenueTrends,
          transactionTypeBreakdown,
          paymentMethodDistribution,
          summary: financialSummary[0]
        }
      });

    } catch (error) {
      logger.error('Get financial analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get financial analytics',
        error: error.message
      });
    }
  }

  // Get environmental impact analytics
  async getEnvironmentalImpact(req, res) {
    try {
      const { startDate, endDate } = req.query;

      let dateCondition = sql`1=1`;
      if (startDate && endDate) {
        dateCondition = between(
          pickupRequests.createdAt,
          new Date(startDate),
          new Date(endDate)
        );
      }

      // Calculate environmental impact metrics
      const impactMetrics = await db
        .select({
          totalWasteCollected: sql`sum(actual_weight)`,
          totalPickups: sql`count(*) filter (where status = 'completed')`,
          plasticWaste: sql`sum(actual_weight) filter (where waste_type = 'plastic')`,
          paperWaste: sql`sum(actual_weight) filter (where waste_type = 'paper')`,
          metalWaste: sql`sum(actual_weight) filter (where waste_type = 'metal')`,
          glassWaste: sql`sum(actual_weight) filter (where waste_type = 'glass')`,
          electronicWaste: sql`sum(actual_weight) filter (where waste_type = 'electronics')`,
          organicWaste: sql`sum(actual_weight) filter (where waste_type = 'organic')`
        })
        .from(pickupRequests)
        .where(and(dateCondition, eq(pickupRequests.status, 'completed')));

      // Calculate estimated CO2 savings (example calculations)
      const totalWaste = parseFloat(impactMetrics[0].totalWasteCollected) || 0;
      const co2Saved = totalWaste * 0.5; // Rough estimate: 0.5kg CO2 saved per kg of waste recycled
      const treesEquivalent = Math.floor(co2Saved / 21.77); // 1 tree absorbs ~21.77kg CO2 per year

      // Get waste collection trends by location
      const locationImpact = await db
        .select({
          city: users.city,
          state: users.state,
          totalWaste: sql`sum(${pickupRequests.actualWeight})`,
          totalPickups: sql`count(*)`
        })
        .from(pickupRequests)
        .leftJoin(users, eq(pickupRequests.requesterId, users.id))
        .where(and(
          dateCondition,
          eq(pickupRequests.status, 'completed'),
          sql`${users.city} is not null`
        ))
        .groupBy(users.city, users.state)
        .orderBy(sql`sum(${pickupRequests.actualWeight}) desc`)
        .limit(10);

      res.json({
        success: true,
        data: {
          summary: {
            ...impactMetrics[0],
            estimatedCo2Saved: co2Saved,
            treesEquivalent
          },
          locationImpact
        }
      });

    } catch (error) {
      logger.error('Get environmental impact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get environmental impact data',
        error: error.message
      });
    }
  }

  // Export analytics data
  async exportAnalytics(req, res) {
    try {
      const { type, startDate, endDate, format = 'json' } = req.query;

      let data = {};

      switch (type) {
        case 'pickups':
          data = await this.getPickupAnalyticsData(startDate, endDate);
          break;
        case 'users':
          data = await this.getUserAnalyticsData(startDate, endDate);
          break;
        case 'financial':
          data = await this.getFinancialAnalyticsData(startDate, endDate);
          break;
        case 'environmental':
          data = await this.getEnvironmentalImpactData(startDate, endDate);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid analytics type'
          });
      }

      if (format === 'csv') {
        // Convert to CSV format (simplified)
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics.csv"`);
        return res.send(csv);
      }

      res.json({
        success: true,
        data,
        exportedAt: new Date(),
        type,
        format
      });

    } catch (error) {
      logger.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics data',
        error: error.message
      });
    }
  }

  // Helper method to convert data to CSV
  convertToCSV(data) {
    // This is a simplified CSV conversion
    // In a real application, you'd use a proper CSV library
    if (!data || typeof data !== 'object') return '';
    
    const headers = Object.keys(data);
    const values = Object.values(data);
    
    return `${headers.join(',')}\n${values.join(',')}`;
  }

  // Helper methods for data extraction
  async getPickupAnalyticsData(startDate, endDate) {
    // Implementation would be similar to getPickupAnalytics but return raw data
    return {};
  }

  async getUserAnalyticsData(startDate, endDate) {
    // Implementation would be similar to getUserAnalytics but return raw data
    return {};
  }

  async getFinancialAnalyticsData(startDate, endDate) {
    // Implementation would be similar to getFinancialAnalytics but return raw data
    return {};
  }

  async getEnvironmentalImpactData(startDate, endDate) {
    // Implementation would be similar to getEnvironmentalImpact but return raw data
    return {};
  }
}


export default AnalyticsController;