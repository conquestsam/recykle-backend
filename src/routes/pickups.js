import express from 'express';
import pickupController from '../controllers/pickupController.js';
import { authenticateToken, requireRole, requireVerification } from '../middleware/auth.js';
import {
  validatePickupRequest,
  validatePickupUpdate,
  validatePagination,
  validateLocationQuery
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   POST /api/pickups
 * @desc    Create a new pickup request
 * @access  Private (Household only)
 * @body    { wasteType, estimatedWeight?, description?, images?, pickupAddress, pickupLatitude, pickupLongitude, preferredDate?, preferredTimeSlot? }
 */
router.post('/', authenticateToken, requireRole(['household']), requireVerification, validatePickupRequest, pickupController.createPickupRequest);

/**
 * @route   GET /api/pickups
 * @desc    Get pickup requests (filtered by user role)
 * @access  Private
 * @query   { page?, limit?, status?, wasteType?, userId? }
 */
router.get('/', authenticateToken, validatePagination, pickupController.getPickupRequests);

/**
 * @route   GET /api/pickups/nearby
 * @desc    Get nearby pickup requests (Waste Picker only)
 * @access  Private (Waste Picker only)
 * @query   { latitude, longitude, radius? }
 */
router.get('/nearby', authenticateToken, requireRole(['waste_picker']), validateLocationQuery, pickupController.getNearbyPickups);

/**
 * @route   GET /api/pickups/stats
 * @desc    Get pickup statistics
 * @access  Private
 * @query   { startDate?, endDate? }
 */
router.get('/stats', authenticateToken, pickupController.getPickupStats);

/**
 * @route   GET /api/pickups/:id
 * @desc    Get single pickup request
 * @access  Private
 * @params  id - Pickup request ID
 */
router.get('/:id', authenticateToken, pickupController.getPickupRequest);

/**
 * @route   PUT /api/pickups/:id/accept
 * @desc    Accept pickup request (Waste Picker only)
 * @access  Private (Waste Picker only)
 * @params  id - Pickup request ID
 */
router.put('/:id/accept', authenticateToken, requireRole(['waste_picker']), requireVerification, pickupController.acceptPickupRequest);

/**
 * @route   PUT /api/pickups/:id/status
 * @desc    Update pickup status
 * @access  Private
 * @params  id - Pickup request ID
 * @body    { status, actualWeight?, rating?, feedback?, cancellationReason? }
 */
router.put('/:id/status', authenticateToken, validatePickupUpdate, pickupController.updatePickupStatus);

/**
 * @route   PUT /api/pickups/:id/cancel
 * @desc    Cancel pickup request
 * @access  Private
 * @params  id - Pickup request ID
 * @body    { reason? }
 */
router.put('/:id/cancel', authenticateToken, pickupController.cancelPickupRequest);

export default router;