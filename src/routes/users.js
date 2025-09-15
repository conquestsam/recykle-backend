import express from 'express';
import userController from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  validateProfileUpdate,
  validateWastePickerProfile,
  validatePagination
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 * @body    { firstName?, lastName?, phone?, address?, city?, state?, latitude?, longitude? }
 */
router.put('/profile', authenticateToken, validateProfileUpdate, userController.updateProfile);

/**
 * @route   PUT /api/users/waste-picker-profile
 * @desc    Update waste picker profile
 * @access  Private (Waste Picker only)
 * @body    { vehicleType?, vehicleNumber?, licenseNumber?, workingHours?, serviceRadius?, specializations?, bankAccountName?, bankAccountNumber?, bankName? }
 */
router.put('/waste-picker-profile', authenticateToken, validateWastePickerProfile, userController.updateWastePickerProfile);

/**
 * @route   PUT /api/users/recycling-company-profile
 * @desc    Update recycling company profile
 * @access  Private (Recycling Company only)
 * @body    { companyName?, registrationNumber?, website?, description?, acceptedWasteTypes?, processingCapacity?, certifications?, operatingHours? }
 */
router.put('/recycling-company-profile', authenticateToken, userController.updateRecyclingCompanyProfile);

/**
 * @route   GET /api/users/profile/:id?
 * @desc    Get full user profile with role-specific data
 * @access  Private
 * @params  id? - User ID (optional, defaults to current user)
 */
router.get('/profile/:id?', authenticateToken, userController.getFullProfile);

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin only)
 * @query   { page?, limit?, role?, status?, search? }
 */
router.get('/', authenticateToken, requireRole(['admin']), validatePagination, userController.getAllUsers);

/**
 * @route   POST /api/users
 * @desc    Create new user (Admin only)
 * @access  Private (Admin only)
 * @body    { email, password, firstName, lastName, phone?, role, address?, city?, state?, latitude?, longitude? }
 */
router.post('/', authenticateToken, requireRole(['admin']), userController.createUser);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID (Admin only)
 * @access  Private (Admin only)
 * @params  id - User ID
 */
router.get('/:id', authenticateToken, requireRole(['admin']), userController.getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user by ID (Admin only)
 * @access  Private (Admin only)
 * @params  id - User ID
 * @body    { firstName?, lastName?, phone?, address?, city?, state?, role?, status? }
 */
router.put('/:id', authenticateToken, requireRole(['admin']), userController.updateUserById);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user status (Admin only)
 * @access  Private (Admin only)
 * @params  id - User ID
 * @body    { status }
 */
router.put('/:id/status', authenticateToken, requireRole(['admin']), userController.updateUserStatus);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user by ID (Admin only)
 * @access  Private (Admin only)
 * @params  id - User ID
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), userController.deleteUserById);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete('/account', authenticateToken, userController.deleteAccount);

/**
 * @route   GET /api/users/search/waste-pickers
 * @desc    Search waste pickers by location and specialization
 * @access  Private
 * @query   { latitude, longitude, radius?, specialization?, isVerified? }
 */
router.get('/search/waste-pickers', authenticateToken, userController.searchWastePickers);

/**
 * @route   GET /api/users/search/recycling-companies
 * @desc    Search recycling companies by location and waste type
 * @access  Private
 * @query   { latitude?, longitude?, radius?, wasteType?, isVerified? }
 */
router.get('/search/recycling-companies', authenticateToken, userController.searchRecyclingCompanies);

/**
 * @route   GET /api/users/stats/:id?
 * @desc    Get user statistics
 * @access  Private
 * @params  id? - User ID (optional, defaults to current user)
 */
router.get('/stats/:id?', authenticateToken, userController.getUserStats);

/**
 * @route   POST /api/users/upload-avatar
 * @desc    Upload user avatar
 * @access  Private
 * @body    FormData with 'avatar' file
 */
router.post('/upload-avatar', authenticateToken, userController.uploadAvatar);

/**
 * @route   POST /api/users/verify-documents
 * @desc    Upload verification documents (Waste Picker/Company)
 * @access  Private
 * @body    FormData with document files
 */
router.post('/verify-documents', authenticateToken, userController.uploadVerificationDocuments);

/**
 * @route   GET /api/users/leaderboard
 * @desc    Get user leaderboard by points
 * @access  Private
 * @query   { limit?, period? }
 */
router.get('/leaderboard', authenticateToken, userController.getLeaderboard);

export default router;