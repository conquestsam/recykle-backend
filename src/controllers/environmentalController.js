import db from '../database/connection.js';
import { pickupRequests, users, analyticsData } from '../database/schema.js';
import { eq, and, desc, sql, between } from 'drizzle-orm';
import logger from '../utils/logger.js';

// Mock environmental data storage
const mockEnvironmentalData = [];

export default class EnvironmentalController {
  // Get environmental data
  async getEnvironmentalData(req, res) {
    try {
      const { startDate, endDate, location } = req.query;

      // Calculate environmental impact from pickup data
      let dateCondition = sql`1=1`;
      if (startDate && endDate) {
        dateCondition = between(
          pickupRequests.createdAt,
          new Date(startDate),
          new Date(endDate)
        );
      }

      const environmentalImpact = await db
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

      // Calculate CO2 savings and environmental benefits
      const totalWaste = parseFloat(environmentalImpact[0].totalWasteCollected) || 0;
      const co2Saved = totalWaste * 0.5; // Rough estimate
      const treesEquivalent = Math.floor(co2Saved / 21.77);
      const waterSaved = totalWaste * 2.5; // Liters saved per kg recycled
      const energySaved = totalWaste * 1.2; // kWh saved per kg recycled

      const environmentalData = {
        summary: {
          ...environmentalImpact[0],
          estimatedCo2Saved: co2Saved,
          treesEquivalent,
          waterSaved,
          energySaved
        },
        additionalData: mockEnvironmentalData
      };

      res.json({
        success: true,
        data: environmentalData
      });

    } catch (error) {
      logger.error('Get environmental data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get environmental data',
        error: error.message
      });
    }
  }

  // Create environmental data (Admin only)
  async createEnvironmentalData(req, res) {
    try {
      const {
        title,
        description,
        dataType,
        value,
        unit,
        location,
        source,
        methodology
      } = req.body;

      const newEnvironmentalData = {
        id: Date.now().toString(),
        title,
        description,
        dataType,
        value: parseFloat(value),
        unit,
        location,
        source,
        methodology,
        createdBy: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockEnvironmentalData.push(newEnvironmentalData);

      res.status(201).json({
        success: true,
        message: 'Environmental data created successfully',
        data: newEnvironmentalData
      });

    } catch (error) {
      logger.error('Create environmental data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create environmental data',
        error: error.message
      });
    }
  }

  // Update environmental data (Admin only)
  async updateEnvironmentalData(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const dataIndex = mockEnvironmentalData.findIndex(data => data.id === id);

      if (dataIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Environmental data not found'
        });
      }

      // Update data
      mockEnvironmentalData[dataIndex] = {
        ...mockEnvironmentalData[dataIndex],
        ...updateData,
        updatedAt: new Date()
      };

      res.json({
        success: true,
        message: 'Environmental data updated successfully',
        data: mockEnvironmentalData[dataIndex]
      });

    } catch (error) {
      logger.error('Update environmental data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update environmental data',
        error: error.message
      });
    }
  }

  // Get environmental trends
  async getEnvironmentalTrends(req, res) {
    try {
      const { startDate, endDate, groupBy = 'month' } = req.query;

      let dateCondition = sql`1=1`;
      if (startDate && endDate) {
        dateCondition = between(
          pickupRequests.createdAt,
          new Date(startDate),
          new Date(endDate)
        );
      }

      // Get trends based on groupBy parameter
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
          dateFormat = sql`date_trunc('month', created_at)`;
      }

      const trends = await db
        .select({
          date: dateFormat,
          totalWasteCollected: sql`sum(actual_weight)`,
          totalPickups: sql`count(*) filter (where status = 'completed')`,
          co2Saved: sql`sum(actual_weight) * 0.5`,
          plasticRecycled: sql`sum(actual_weight) filter (where waste_type = 'plastic')`,
          paperRecycled: sql`sum(actual_weight) filter (where waste_type = 'paper')`
        })
        .from(pickupRequests)
        .where(and(dateCondition, eq(pickupRequests.status, 'completed')))
        .groupBy(dateFormat)
        .orderBy(dateFormat);

      res.json({
        success: true,
        data: {
          trends,
          period: groupBy,
          dateRange: { startDate, endDate }
        }
      });

    } catch (error) {
      logger.error('Get environmental trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get environmental trends',
        error: error.message
      });
    }
  }
}
