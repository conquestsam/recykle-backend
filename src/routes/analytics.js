import express from 'express';
import analyticsController from '../controllers/analyticsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard overview analytics
 * @access  Private (Admin, Government)
 * @query   { period? } - 7d, 30d, 90d, 1y
 */
router.get('/dashboard', authenticateToken, requireRole(['admin', 'government']), analyticsController.getDashboardOverview);

/**
 * @route   GET /api/analytics/pickups
 * @desc    Get pickup analytics
 * @access  Private (Admin, Government)
 * @query   { startDate?, endDate?, groupBy? } - groupBy: hour, day, week, month
 */
router.get('/pickups', authenticateToken, requireRole(['admin', 'government']), analyticsController.getPickupAnalytics);

/**
 * @route   GET /api/analytics/users
 * @desc    Get user analytics
 * @access  Private (Admin, Government)
 * @query   { startDate?, endDate?, groupBy? } - groupBy: day, week, month
 */
router.get('/users', authenticateToken, requireRole(['admin', 'government']), analyticsController.getUserAnalytics);

/**
 * @route   GET /api/analytics/financial
 * @desc    Get financial analytics
 * @access  Private (Admin)
 * @query   { startDate?, endDate?, groupBy? } - groupBy: day, week, month
 */
router.get('/financial', authenticateToken, requireRole(['admin']), analyticsController.getFinancialAnalytics);

/**
 * @route   GET /api/analytics/environmental-impact
 * @desc    Get environmental impact analytics
 * @access  Private (Admin, Government)
 * @query   { startDate?, endDate? }
 */
router.get('/environmental-impact', authenticateToken, requireRole(['admin', 'government']), analyticsController.getEnvironmentalImpact);

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics data
 * @access  Private (Admin, Government)
 * @query   { type, startDate?, endDate?, format? } - type: pickups, users, financial, environmental; format: json, csv
 */
router.get('/export', authenticateToken, requireRole(['admin', 'government']), analyticsController.exportAnalytics);

export default router;