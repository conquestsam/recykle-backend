import express from 'express';
import rewardsController from '../controllers/rewardsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  validateRewardRedemption,
  validatePagination
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   GET /api/rewards
 * @desc    Get all available rewards
 * @access  Private
 * @query   { page?, limit?, type?, isActive? }
 */
router.get('/', authenticateToken, validatePagination, rewardsController.getRewards);

/**
 * @route   GET /api/rewards/stats
 * @desc    Get reward statistics
 * @access  Private (Admin only)
 * @query   { startDate?, endDate? }
 */
router.get('/stats', authenticateToken, requireRole(['admin']), rewardsController.getRewardStats);

/**
 * @route   GET /api/rewards/:id
 * @desc    Get single reward
 * @access  Private
 * @params  id - Reward ID
 */
router.get('/:id', authenticateToken, rewardsController.getReward);

/**
 * @route   POST /api/rewards/redeem
 * @desc    Redeem a reward
 * @access  Private
 * @body    { rewardId, deliveryInfo? }
 */
router.post('/redeem', authenticateToken, validateRewardRedemption, rewardsController.redeemReward);

/**
 * @route   GET /api/rewards/redemptions/my
 * @desc    Get user's reward redemptions
 * @access  Private
 * @query   { page?, limit?, status? }
 */
router.get('/redemptions/my', authenticateToken, validatePagination, rewardsController.getUserRedemptions);

/**
 * @route   GET /api/rewards/redemptions/:id
 * @desc    Get redemption details
 * @access  Private
 * @params  id - Redemption ID
 */
router.get('/redemptions/:id', authenticateToken, rewardsController.getRedemption);

/**
 * @route   PUT /api/rewards/redemptions/:id/status
 * @desc    Update redemption status (Admin only)
 * @access  Private (Admin only)
 * @params  id - Redemption ID
 * @body    { status }
 */
router.put('/redemptions/:id/status', authenticateToken, requireRole(['admin']), rewardsController.updateRedemptionStatus);

/**
 * @route   POST /api/rewards
 * @desc    Create new reward (Admin only)
 * @access  Private (Admin only)
 * @body    { name, description, type, pointsCost, value, provider?, stockQuantity?, image?, termsAndConditions?, expiryDate? }
 */
router.post('/', authenticateToken, requireRole(['admin']), rewardsController.createReward);

/**
 * @route   PUT /api/rewards/:id
 * @desc    Update reward (Admin only)
 * @access  Private (Admin only)
 * @params  id - Reward ID
 * @body    { name?, description?, type?, pointsCost?, value?, provider?, stockQuantity?, image?, termsAndConditions?, expiryDate?, isActive? }
 */
router.put('/:id', authenticateToken, requireRole(['admin']), rewardsController.updateReward);

/**
 * @route   DELETE /api/rewards/:id
 * @desc    Delete reward (Admin only)
 * @access  Private (Admin only)
 * @params  id - Reward ID
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), rewardsController.deleteReward);

export default router;