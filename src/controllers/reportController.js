import db from '../database/connection.js';
import { pickupRequests, users, transactions, analyticsData } from '../database/schema.js';
import { eq, and, desc, sql, between } from 'drizzle-orm';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

class ReportController {
  // Generate pickup report
  async generatePickupReport(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.body;

      const dateCondition = startDate && endDate 
        ? between(pickupRequests.createdAt, new Date(startDate), new Date(endDate))
        : sql`1=1`;

      // Get pickup statistics
      const pickupStats = await db
        .select({
          totalPickups: sql`count(*)`,
          completedPickups: sql`count(*) filter (where status = 'completed')`,
          pendingPickups: sql`count(*) filter (where status = 'pending')`,
          cancelledPickups: sql`count(*) filter (where status = 'cancelled')`,
          totalWasteCollected: sql`sum(actual_weight)`,
          totalPointsAwarded: sql`sum(points_earned)`,
          averageWeight: sql`avg(actual_weight)`,
          averageCompletionTime: sql`avg(extract(epoch from (completed_at - created_at))/3600)`
        })
        .from(pickupRequests)
        .where(dateCondition);

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

      // Get location breakdown
      const locationBreakdown = await db
        .select({
          city: users.city,
          state: users.state,
          pickupCount: sql`count(*)`,
          totalWeight: sql`sum(${pickupRequests.actualWeight})`
        })
        .from(pickupRequests)
        .leftJoin(users, eq(pickupRequests.requesterId, users.id))
        .where(and(dateCondition, sql`${users.city} is not null`))
        .groupBy(users.city, users.state)
        .orderBy(sql`count(*) desc`)
        .limit(20);

      const reportData = {
        reportType: 'pickup_report',
        generatedAt: new Date(),
        dateRange: { startDate, endDate },
        summary: pickupStats[0],
        wasteTypeBreakdown,
        locationBreakdown
      };

      if (format === 'csv') {
        const csv = this.convertToCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="pickup_report.csv"');
        return res.send(csv);
      }

      res.json({
        success: true,
        data: reportData
      });

    } catch (error) {
      logger.error('Generate pickup report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate pickup report',
        error: error.message
      });
    }
  }

  // Generate user report
  async generateUserReport(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.body;

      const dateCondition = startDate && endDate 
        ? between(users.createdAt, new Date(startDate), new Date(endDate))
        : sql`1=1`;

      // Get user statistics
      const userStats = await db
        .select({
          totalUsers: sql`count(*)`,
          activeUsers: sql`count(*) filter (where status = 'active')`,
          households: sql`count(*) filter (where role = 'household')`,
          wastePickers: sql`count(*) filter (where role = 'waste_picker')`,
          recyclingCompanies: sql`count(*) filter (where role = 'recycling_company')`,
          verifiedEmails: sql`count(*) filter (where is_email_verified = true)`,
          verifiedPhones: sql`count(*) filter (where is_phone_verified = true)`
        })
        .from(users)
        .where(dateCondition);

      // Get registration trends
      const registrationTrends = await db
        .select({
          date: sql`date_trunc('day', created_at)`,
          registrations: sql`count(*)`
        })
        .from(users)
        .where(dateCondition)
        .groupBy(sql`date_trunc('day', created_at)`)
        .orderBy(sql`date_trunc('day', created_at)`);

      // Get top users by points
      const topUsers = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          totalPoints: users.totalPoints,
          city: users.city,
          state: users.state
        })
        .from(users)
        .where(dateCondition)
        .orderBy(desc(users.totalPoints))
        .limit(50);

      const reportData = {
        reportType: 'user_report',
        generatedAt: new Date(),
        dateRange: { startDate, endDate },
        summary: userStats[0],
        registrationTrends,
        topUsers
      };

      res.json({
        success: true,
        data: reportData
      });

    } catch (error) {
      logger.error('Generate user report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate user report',
        error: error.message
      });
    }
  }

  // Generate revenue report
  async generateRevenueReport(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.body;

      const dateCondition = startDate && endDate 
        ? between(transactions.createdAt, new Date(startDate), new Date(endDate))
        : sql`1=1`;

      // Get revenue statistics
      const revenueStats = await db
        .select({
          totalRevenue: sql`sum(amount) filter (where status = 'completed')`,
          totalTransactions: sql`count(*) filter (where status = 'completed')`,
          averageTransactionValue: sql`avg(amount) filter (where status = 'completed')`,
          subscriptionRevenue: sql`sum(amount) filter (where type = 'subscription' and status = 'completed')`,
          commissionRevenue: sql`sum(amount) filter (where type = 'commission' and status = 'completed')`
        })
        .from(transactions)
        .where(dateCondition);

      // Get revenue trends
      const revenueTrends = await db
        .select({
          date: sql`date_trunc('day', created_at)`,
          revenue: sql`sum(amount) filter (where status = 'completed')`,
          transactions: sql`count(*) filter (where status = 'completed')`
        })
        .from(transactions)
        .where(dateCondition)
        .groupBy(sql`date_trunc('day', created_at)`)
        .orderBy(sql`date_trunc('day', created_at)`);

      const reportData = {
        reportType: 'revenue_report',
        generatedAt: new Date(),
        dateRange: { startDate, endDate },
        summary: revenueStats[0],
        revenueTrends
      };

      res.json({
        success: true,
        data: reportData
      });

    } catch (error) {
      logger.error('Generate revenue report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate revenue report',
        error: error.message
      });
    }
  }

  // Generate environmental report
  async generateEnvironmentalReport(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.body;

      const dateCondition = startDate && endDate 
        ? between(pickupRequests.createdAt, new Date(startDate), new Date(endDate))
        : sql`1=1`;

      // Calculate environmental impact
      const environmentalStats = await db
        .select({
          totalWasteCollected: sql`sum(actual_weight)`,
          totalPickups: sql`count(*) filter (where status = 'completed')`,
          plasticWaste: sql`sum(actual_weight) filter (where waste_type = 'plastic')`,
          paperWaste: sql`sum(actual_weight) filter (where waste_type = 'paper')`,
          metalWaste: sql`sum(actual_weight) filter (where waste_type = 'metal')`,
          glassWaste: sql`sum(actual_weight) filter (where waste_type = 'glass')`
        })
        .from(pickupRequests)
        .where(and(dateCondition, eq(pickupRequests.status, 'completed')));

      const totalWaste = parseFloat(environmentalStats[0].totalWasteCollected) || 0;
      const co2Saved = totalWaste * 0.5; // Estimate: 0.5kg CO2 saved per kg recycled
      const treesEquivalent = Math.floor(co2Saved / 21.77); // 1 tree absorbs ~21.77kg CO2/year

      const reportData = {
        reportType: 'environmental_report',
        generatedAt: new Date(),
        dateRange: { startDate, endDate },
        summary: {
          ...environmentalStats[0],
          estimatedCo2Saved: co2Saved,
          treesEquivalent
        }
      };

      res.json({
        success: true,
        data: reportData
      });

    } catch (error) {
      logger.error('Generate environmental report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate environmental report',
        error: error.message
      });
    }
  }

  // Get all reports
  async getReports(req, res) {
    try {
      // This would typically fetch from a reports table
      // For now, returning mock data
      const reports = [
        {
          id: '1',
          name: 'Monthly Pickup Report - December 2024',
          type: 'pickup_report',
          status: 'completed',
          createdAt: new Date(),
          size: '2.5 MB'
        }
      ];

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      logger.error('Get reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get reports',
        error: error.message
      });
    }
  }

  // Get report by ID
  async getReportById(req, res) {
    try {
      const { id } = req.params;

      // Mock report data
      const report = {
        id,
        name: 'Sample Report',
        type: 'pickup_report',
        status: 'completed',
        data: {},
        createdAt: new Date()
      };

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Get report by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get report',
        error: error.message
      });
    }
  }

  // Delete report
  async deleteReport(req, res) {
    try {
      const { id } = req.params;

      // Mock deletion
      res.json({
        success: true,
        message: 'Report deleted successfully'
      });

    } catch (error) {
      logger.error('Delete report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete report',
        error: error.message
      });
    }
  }

  // Schedule report
  async scheduleReport(req, res) {
    try {
      const { reportType, schedule, recipients } = req.body;

      // Mock scheduling
      const scheduledReport = {
        id: Date.now().toString(),
        reportType,
        schedule,
        recipients,
        status: 'scheduled',
        createdAt: new Date()
      };

      res.status(201).json({
        success: true,
        message: 'Report scheduled successfully',
        data: scheduledReport
      });

    } catch (error) {
      logger.error('Schedule report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule report',
        error: error.message
      });
    }
  }

  // Helper method to convert data to CSV
  convertToCSV(data) {
    if (!data || typeof data !== 'object') return '';
    
    const headers = Object.keys(data.summary || {});
    const values = Object.values(data.summary || {});
    
    return `${headers.join(',')}\n${values.join(',')}`;
  }
}

export const generatePickupReport = new ReportController().generatePickupReport;
export const generateUserReport = new ReportController().generateUserReport;
export const generateRevenueReport = new ReportController().generateRevenueReport;
export const generateEnvironmentalReport = new ReportController().generateEnvironmentalReport;
export const getReports = new ReportController().getReports;
export const getReportById = new ReportController().getReportById;
export const deleteReport = new ReportController().deleteReport;
export const scheduleReport = new ReportController().scheduleReport;