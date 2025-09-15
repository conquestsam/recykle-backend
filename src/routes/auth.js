import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validatePasswordUpdate
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email, password, firstName, lastName, phone?, role, address?, city?, state?, latitude?, longitude? }
 */
router.post('/register', validateRegister, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user email
 * @access  Public
 * @body    { token }
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * @route   POST /api/auth/verify-phone
 * @desc    Verify user phone number
 * @access  Private
 * @body    { code }
 */
router.post('/verify-phone', authenticateToken, authController.verifyPhone);

/**
 * @route   POST /api/auth/resend-email-verification
 * @desc    Resend email verification
 * @access  Private
 */
router.post('/resend-email-verification', authenticateToken, authController.resendEmailVerification);

/**
 * @route   POST /api/auth/resend-phone-verification
 * @desc    Resend phone verification code
 * @access  Private
 */
router.post('/resend-phone-verification', authenticateToken, authController.resendPhoneVerification);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password', validatePasswordReset, authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    { token, password }
 */
router.post('/reset-password', validatePasswordUpdate, authController.resetPassword);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.post('/change-password', authenticateToken, authController.changePassword);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh-token', authenticateToken, authController.refreshToken);

export default router;