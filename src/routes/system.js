import express from 'express';
import systemController from '../controllers/systemController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validatePagination } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   GET /api/system/settings
 * @desc    Get system settings
 * @access  Public (only public settings)
 */
router.get('/settings', systemController.getSettings);

/**
 * @route   GET /api/system/settings/:key
 * @desc    Get single system setting
 * @access  Private (Admin only for private settings)
 * @params  key - Setting key
 */
router.get('/settings/:key', systemController.getSetting);

/**
 * @route   POST /api/system/settings
 * @desc    Create system setting (Admin only)
 * @access  Private (Admin only)
 * @body    { key, value, description?, type?, isPublic? }
 */
router.post('/settings', authenticateToken, requireRole(['admin']), systemController.createSetting);

/**
 * @route   PUT /api/system/settings/:key
 * @desc    Update system setting (Admin only)
 * @access  Private (Admin only)
 * @params  key - Setting key
 * @body    { value, description?, type?, isPublic? }
 */
router.put('/settings/:key', authenticateToken, requireRole(['admin']), systemController.updateSetting);

/**
 * @route   DELETE /api/system/settings/:key
 * @desc    Delete system setting (Admin only)
 * @access  Private (Admin only)
 * @params  key - Setting key
 */
router.delete('/settings/:key', authenticateToken, requireRole(['admin']), systemController.deleteSetting);

/**
 * @route   GET /api/system/health
 * @desc    System health check
 * @access  Public
 */
router.get('/health', systemController.healthCheck);

/**
 * @route   GET /api/system/stats
 * @desc    System statistics (Admin only)
 * @access  Private (Admin only)
 */
router.get('/stats', authenticateToken, requireRole(['admin']), systemController.getSystemStats);

/**
 * @route   POST /api/system/backup
 * @desc    Create system backup (Admin only)
 * @access  Private (Admin only)
 */
router.post('/backup', authenticateToken, requireRole(['admin']), systemController.createBackup);

/**
 * @route   GET /api/system/logs
 * @desc    Get system logs (Admin only)
 * @access  Private (Admin only)
 * @query   { level?, startDate?, endDate?, limit? }
 */
router.get('/logs', authenticateToken, requireRole(['admin']), validatePagination, systemController.getLogs);

export default router;