import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';
// import multer from 'multer';
// import { v2 as cloudinary } from 'cloudinary';
// import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { authenticateToken, requireRole } from './middleware/auth.js';
// import { handleValidationErrors } from './middleware/validation.js';
import logger from './utils/logger.js';

// Import all controllers
import authController from './controllers/authController.js';
import userController from './controllers/userController.js';
import pickupController from './controllers/pickupController.js';
import rewardsController from './controllers/rewardsController.js';
import AnalyticsController from './controllers/analyticsController.js';
import notificationController from './controllers/notificationController.js';
import SystemController from './controllers/systemController.js';
import { 
  getSubscriptions, 
  createSubscription, 
  updateSubscription, 
  cancelSubscription, 
  getSubscriptionPlans, 
  upgradeSubscription 
} from './controllers/subscriptionController.js';

import { 
  generatePickupReport, 
  generateUserReport, 
  generateRevenueReport, 
  generateEnvironmentalReport, 
  getReports, 
  getReportById, 
  deleteReport, 
  scheduleReport 
} from './controllers/reportController.js';

import { 
  getSupportTickets, 
  createSupportTicket, 
  getSupportTicketById, 
  updateSupportTicket, 
  closeSupportTicket, 
  assignSupportTicket 
} from './controllers/supportController.js';

import { 
  getRecyclingCompanies, 
  createRecyclingCompany, 
  getRecyclingCompanyById, 
  updateRecyclingCompany, 
  deleteRecyclingCompany, 
  approveRecyclingCompany 
} from './controllers/recyclingCompanyController.js';

import { 
  getWasteCategories, 
  createWasteCategory, 
  updateWasteCategory, 
  deleteWasteCategory 
} from './controllers/wasteCategoryController.js';

import { 
  getEnvironmentalData, 
  createEnvironmentalData, 
  updateEnvironmentalData, 
  getEnvironmentalTrends 
} from './controllers/environmentalController.js';

import { 
  getAllAdminUsers, 
  createAdminUser, 
  updateAdminUser, 
  deleteAdminUser, 
  getAdminDashboard, 
  getAdminStats, 
  manageUserRoles, 
  systemMaintenance, 
  bulkUserOperations, 
  getSystemLogs 
} from './controllers/adminController.js';

import { 
  initializePayment, 
  verifyPayment, 
  getTransactions, 
  getTransactionById, 
  processRefund, 
  getPaymentMethods, 
  addPaymentMethod, 
  deletePaymentMethod,
  getBanks,
  resolveAccount,
  initiateTransfer
} from './controllers/paymentController.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const analyticsController = new AnalyticsController();
const systemController = new SystemController();

const app = express();
const server = createServer(app);

console.log('🔧 Setting up Express app...');

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

console.log('🔌 Socket.IO configured');

// Middleware
console.log('🛡️  Setting up middleware...');
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

console.log('✅ Middleware configured');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

console.log('🚦 Rate limiting configured');

// ==================== HEALTH CHECK ENDPOINTS ====================

console.log('🏥 Setting up health check endpoints...');

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Recykle-Naija API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Health check endpoints configured');

// ==================== AUTHENTICATION ENDPOINTS ====================

console.log('🔐 Setting up authentication endpoints...');

// User Registration
app.post('/api/auth/register', authLimiter, authController.register);

// User Login
app.post('/api/auth/login', authLimiter, authController.login);

// Email Verification
app.post('/api/auth/verify-email', authController.verifyEmail);

// Forgot Password
app.post('/api/auth/forgot-password', authLimiter, authController.forgotPassword);

// Reset Password
app.post('/api/auth/reset-password', authLimiter, authController.resetPassword);

// Get Current User Profile
app.get('/api/auth/profile', authenticateToken, authController.getProfile);

// Update User Profile
app.patch('/api/auth/profile', authenticateToken, authController.updateProfile);

// Change Password
app.patch('/api/auth/change-password', authenticateToken, authController.changePassword);

console.log('✅ Authentication endpoints configured');

// ==================== USER MANAGEMENT ENDPOINTS ====================

console.log('👥 Setting up user management endpoints...');

// Get All Users (Admin/Government only)
app.get('/api/users', authenticateToken, requireRole(['admin', 'government']), userController.getAllUsers);

// Get User by ID
app.get('/api/users/:id', authenticateToken, userController.getUserById);

// Create New User (Admin only)
app.post('/api/users', authenticateToken, requireRole(['admin']), userController.createUser);

// Update User (Admin only)
app.patch('/api/users/:id', authenticateToken, requireRole(['admin']), userController.updateUserById);

// Delete User (Admin only)
app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), userController.deleteUserById);

// Get User Dashboard Stats
app.get('/api/users/:id/dashboard', authenticateToken, userController.getUserDashboard);

// Get User Activity Logs
app.get('/api/users/:id/activity', authenticateToken, userController.getUserActivity);

// Update User Profile
app.patch('/api/users/profile', authenticateToken, userController.updateProfile);

// Update Waste Picker Profile
app.patch('/api/users/waste-picker-profile', authenticateToken, requireRole(['waste_picker']), userController.updateWastePickerProfile);

// Update Recycling Company Profile
app.patch('/api/users/recycling-company-profile', authenticateToken, requireRole(['recycling_company']), userController.updateRecyclingCompanyProfile);

// Get Full User Profile
app.get('/api/users/profile/:id?', authenticateToken, userController.getFullProfile);

// Search Waste Pickers
app.get('/api/users/search/waste-pickers', authenticateToken, userController.searchWastePickers);

// Search Recycling Companies
app.get('/api/users/search/recycling-companies', authenticateToken, userController.searchRecyclingCompanies);

// Get User Statistics
app.get('/api/users/stats/:id?', authenticateToken, userController.getUserStats);

// Upload Avatar
app.post('/api/users/upload-avatar', authenticateToken, userController.uploadAvatar);

// Upload Verification Documents
app.post('/api/users/verify-documents', authenticateToken, userController.uploadVerificationDocuments);

// Get Leaderboard
app.get('/api/users/leaderboard', authenticateToken, userController.getLeaderboard);

// Update User Status (Admin only)
app.patch('/api/users/:id/status', authenticateToken, requireRole(['admin']), userController.updateUserStatus);

// Delete User Account
app.delete('/api/users/account', authenticateToken, userController.deleteAccount);

console.log('✅ User management endpoints configured');

// ==================== PICKUP MANAGEMENT ENDPOINTS ====================

console.log('🚛 Setting up pickup management endpoints...');

// Create Pickup Request
app.post('/api/pickups', authenticateToken, requireRole(['household']), pickupController.createPickupRequest);

// Get All Pickups (with filters)
app.get('/api/pickups', authenticateToken, pickupController.getPickupRequests);

// Get Pickup by ID
app.get('/api/pickups/:id', authenticateToken, pickupController.getPickupRequest);

// Update Pickup
app.patch('/api/pickups/:id', authenticateToken, pickupController.updatePickup);

// Delete Pickup
app.delete('/api/pickups/:id', authenticateToken, pickupController.deletePickup);

// Accept Pickup Request (Waste Picker)
app.patch('/api/pickups/:id/accept', authenticateToken, requireRole(['waste_picker']), pickupController.acceptPickupRequest);

// Update Pickup Status
app.patch('/api/pickups/:id/status', authenticateToken, pickupController.updatePickupStatus);

// Cancel Pickup Request
app.patch('/api/pickups/:id/cancel', authenticateToken, pickupController.cancelPickupRequest);

// Get Nearby Pickups (Waste Picker)
app.get('/api/pickups/nearby', authenticateToken, requireRole(['waste_picker']), pickupController.getNearbyPickups);

// Get Pickup Statistics
app.get('/api/pickups/stats', authenticateToken, pickupController.getPickupStats);

console.log('✅ Pickup management endpoints configured');

// ==================== REWARDS ENDPOINTS ====================

console.log('🎁 Setting up rewards endpoints...');

// Get Available Rewards
app.get('/api/rewards', authenticateToken, rewardsController.getRewards);

// Get Single Reward
app.get('/api/rewards/:id', authenticateToken, rewardsController.getReward);

// Redeem Reward
app.post('/api/rewards/redeem', authenticateToken, rewardsController.redeemReward);

// Get User Redemptions
app.get('/api/rewards/redemptions/my', authenticateToken, rewardsController.getUserRedemptions);

// Get Redemption by ID
app.get('/api/rewards/redemptions/:id', authenticateToken, rewardsController.getRedemption);

// Update Redemption Status (Admin only)
app.patch('/api/rewards/redemptions/:id/status', authenticateToken, requireRole(['admin']), rewardsController.updateRedemptionStatus);

// Create Reward (Admin only)
app.post('/api/rewards', authenticateToken, requireRole(['admin']), rewardsController.createReward);

// Update Reward (Admin only)
app.patch('/api/rewards/:id', authenticateToken, requireRole(['admin']), rewardsController.updateReward);

// Delete Reward (Admin only)
app.delete('/api/rewards/:id', authenticateToken, requireRole(['admin']), rewardsController.deleteReward);

// Get Reward Statistics (Admin only)
app.get('/api/rewards/stats', authenticateToken, requireRole(['admin']), rewardsController.getRewardStats);

console.log('✅ Rewards endpoints configured');

// ==================== NOTIFICATION ENDPOINTS ====================

console.log('🔔 Setting up notification endpoints...');

// Get User Notifications
app.get('/api/notifications', authenticateToken, notificationController.getNotifications);

// Mark Notification as Read
app.patch('/api/notifications/:id/read', authenticateToken, notificationController.markAsRead);

// Mark All Notifications as Read
app.patch('/api/notifications/read-all', authenticateToken, notificationController.markAllAsRead);

// Delete Notification
app.delete('/api/notifications/:id', authenticateToken, notificationController.deleteNotification);

// Delete All Notifications
app.delete('/api/notifications', authenticateToken, notificationController.deleteAllNotifications);

// Get Notification Statistics
app.get('/api/notifications/stats', authenticateToken, notificationController.getNotificationStats);

// Get Single Notification
app.get('/api/notifications/:id', authenticateToken, notificationController.getNotification);

// Send Test Notification (Admin only)
app.post('/api/notifications/test', authenticateToken, requireRole(['admin']), notificationController.sendTestNotification);

// Broadcast Notification (Admin only)
app.post('/api/notifications/broadcast', authenticateToken, requireRole(['admin']), notificationController.broadcastNotification);

console.log('✅ Notification endpoints configured');

// ==================== ANALYTICS ENDPOINTS ====================

console.log('📊 Setting up analytics endpoints...');

// Get Dashboard Statistics
app.get('/api/analytics/dashboard', authenticateToken, requireRole(['admin', 'government']), analyticsController.getDashboardOverview);

// Get Pickup Analytics
app.get('/api/analytics/pickups', authenticateToken, requireRole(['admin', 'government']), analyticsController.getPickupAnalytics);

// Get User Analytics
app.get('/api/analytics/users', authenticateToken, requireRole(['admin', 'government']), analyticsController.getUserAnalytics);

// Get Financial Analytics
app.get('/api/analytics/financial', authenticateToken, requireRole(['admin']), analyticsController.getFinancialAnalytics);

// Get Environmental Impact
app.get('/api/analytics/environmental-impact', authenticateToken, requireRole(['admin', 'government']), analyticsController.getEnvironmentalImpact);

// Export Analytics Data
app.get('/api/analytics/export', authenticateToken, requireRole(['admin', 'government']), analyticsController.exportAnalytics);

console.log('✅ Analytics endpoints configured');

// ==================== PAYMENT ENDPOINTS ====================

console.log('💳 Setting up payment endpoints...');

// Initialize Payment
app.post('/api/payments/initialize', authenticateToken, initializePayment);

// Verify Payment
app.post('/api/payments/verify', authenticateToken, verifyPayment);

// Get Transaction History
app.get('/api/payments/transactions', authenticateToken, getTransactions);

// Get Transaction by ID
app.get('/api/payments/transactions/:id', authenticateToken, getTransactionById);

// Process Refund (Admin only)
app.post('/api/payments/refund', authenticateToken, requireRole(['admin']), processRefund);

// Get Payment Methods
app.get('/api/payments/methods', authenticateToken, getPaymentMethods);

// Add Payment Method
app.post('/api/payments/methods', authenticateToken, addPaymentMethod);

// Delete Payment Method
app.delete('/api/payments/methods/:id', authenticateToken, deletePaymentMethod);

// Get Banks
app.get('/api/payments/banks', authenticateToken, getBanks);

// Resolve Bank Account
app.post('/api/payments/resolve-account', authenticateToken, resolveAccount);

// Initiate Transfer (Admin only)
app.post('/api/payments/transfer', authenticateToken, requireRole(['admin']), initiateTransfer);

console.log('✅ Payment endpoints configured');

// ==================== SUBSCRIPTION ENDPOINTS ====================

console.log('📋 Setting up subscription endpoints...');

// Get User Subscriptions
app.get('/api/subscriptions', authenticateToken, getSubscriptions);

// Create Subscription
app.post('/api/subscriptions', authenticateToken, createSubscription);

// Update Subscription
app.patch('/api/subscriptions/:id', authenticateToken, updateSubscription);

// Cancel Subscription
app.delete('/api/subscriptions/:id', authenticateToken, cancelSubscription);

// Get Subscription Plans
app.get('/api/subscriptions/plans', authenticateToken, getSubscriptionPlans);

// Upgrade Subscription
app.post('/api/subscriptions/:id/upgrade', authenticateToken, upgradeSubscription);

console.log('✅ Subscription endpoints configured');

// ==================== REPORT ENDPOINTS ====================

console.log('📈 Setting up report endpoints...');

// Generate Pickup Report
app.post('/api/reports/pickups', authenticateToken, requireRole(['admin', 'government']), generatePickupReport);

// Generate User Report
app.post('/api/reports/users', authenticateToken, requireRole(['admin', 'government']), generateUserReport);

// Generate Revenue Report
app.post('/api/reports/revenue', authenticateToken, requireRole(['admin']), generateRevenueReport);

// Generate Environmental Report
app.post('/api/reports/environmental', authenticateToken, requireRole(['admin', 'government']), generateEnvironmentalReport);

// Get All Reports
app.get('/api/reports', authenticateToken, requireRole(['admin', 'government']), getReports);

// Get Report by ID
app.get('/api/reports/:id', authenticateToken, requireRole(['admin', 'government']), getReportById);

// Delete Report
app.delete('/api/reports/:id', authenticateToken, requireRole(['admin']), deleteReport);

// Schedule Report
app.post('/api/reports/schedule', authenticateToken, requireRole(['admin', 'government']), scheduleReport);

console.log('✅ Report endpoints configured');

// ==================== SYSTEM ENDPOINTS ====================

console.log('⚙️ Setting up system endpoints...');

// Get System Settings
app.get('/api/system/settings', systemController.getSettings);

// Get Single System Setting
app.get('/api/system/settings/:key', systemController.getSetting);

// Create System Setting (Admin only)
app.post('/api/system/settings', authenticateToken, requireRole(['admin']), systemController.createSetting);

// Update System Setting (Admin only)
app.patch('/api/system/settings/:key', authenticateToken, requireRole(['admin']), systemController.updateSetting);

// Delete System Setting (Admin only)
app.delete('/api/system/settings/:key', authenticateToken, requireRole(['admin']), systemController.deleteSetting);

// System Health Check
app.get('/api/system/health', systemController.healthCheck);

// Get System Statistics
app.get('/api/system/stats', authenticateToken, requireRole(['admin']), systemController.getSystemStats);

// Create System Backup (Admin only)
app.post('/api/system/backup', authenticateToken, requireRole(['admin']), systemController.createBackup);

// Get System Logs (Admin only)
app.get('/api/system/logs', authenticateToken, requireRole(['admin']), systemController.getLogs);

console.log('✅ System endpoints configured');

// ==================== SUPPORT ENDPOINTS ====================

console.log('🎧 Setting up support endpoints...');

// Get Support Tickets
app.get('/api/support/tickets', authenticateToken, getSupportTickets);

// Create Support Ticket
app.post('/api/support/tickets', authenticateToken, supportController.createSupportTicket);

// Get Support Ticket by ID
app.get('/api/support/tickets/:id', authenticateToken, getSupportTicketById);

// Update Support Ticket
app.patch('/api/support/tickets/:id', authenticateToken, updateSupportTicket);

// Close Support Ticket
app.patch('/api/support/tickets/:id/close', authenticateToken, closeSupportTicket);

// Assign Support Ticket (Admin only)
app.patch('/api/support/tickets/:id/assign', authenticateToken, requireRole(['admin']), assignSupportTicket);

console.log('✅ Support endpoints configured');

// ==================== RECYCLING COMPANY ENDPOINTS ====================

console.log('🏭 Setting up recycling company endpoints...');

// Get All Recycling Companies
app.get('/api/recycling-companies', authenticateToken, getRecyclingCompanies);

// Create Recycling Company (Admin only)
app.post('/api/recycling-companies', authenticateToken, requireRole(['admin']), recyclingCompanyController.createRecyclingCompany);

// Get Recycling Company by ID
app.get('/api/recycling-companies/:id', authenticateToken, getRecyclingCompanyById);

// Update Recycling Company
app.patch('/api/recycling-companies/:id', authenticateToken, recyclingCompanyController.updateRecyclingCompany);

// Delete Recycling Company (Admin only)
app.delete('/api/recycling-companies/:id', authenticateToken, requireRole(['admin']), deleteRecyclingCompany);

// Approve Recycling Company (Admin only)
app.patch('/api/recycling-companies/:id/approve', authenticateToken, requireRole(['admin']), approveRecyclingCompany);

console.log('✅ Recycling company endpoints configured');

// ==================== WASTE CATEGORY ENDPOINTS ====================

console.log('🗂️ Setting up waste category endpoints...');

// Get All Waste Categories
app.get('/api/waste-categories', authenticateToken, getWasteCategories);

// Create Waste Category (Admin only)
app.post('/api/waste-categories', authenticateToken, requireRole(['admin']), wasteCategoryController.createWasteCategory);

// Update Waste Category (Admin only)
app.patch('/api/waste-categories/:id', authenticateToken, requireRole(['admin']), wasteCategoryController.updateWasteCategory);

// Delete Waste Category (Admin only)
app.delete('/api/waste-categories/:id', authenticateToken, requireRole(['admin']), deleteWasteCategory);

console.log('✅ Waste category endpoints configured');

// ==================== ENVIRONMENTAL IMPACT ENDPOINTS ====================

console.log('🌱 Setting up environmental endpoints...');

// Get Environmental Data
app.get('/api/environmental', authenticateToken, requireRole(['admin', 'government']), getEnvironmentalData);

// Create Environmental Data (Admin only)
app.post('/api/environmental', authenticateToken, requireRole(['admin']), createEnvironmentalData);

// Update Environmental Data (Admin only)
app.patch('/api/environmental/:id', authenticateToken, requireRole(['admin']), updateEnvironmentalData);

// Get Environmental Trends
app.get('/api/environmental/trends', authenticateToken, requireRole(['admin', 'government']), getEnvironmentalTrends);

console.log('✅ Environmental endpoints configured');

// ==================== ADMIN MANAGEMENT ENDPOINTS ====================

console.log('👑 Setting up admin management endpoints...');

// Get All Admin Users (Super Admin only)
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), getAllAdminUsers);

// Create Admin User (Super Admin only)
app.post('/api/admin/users', authenticateToken, requireRole(['admin']), createAdminUser);

// Update Admin User (Super Admin only)
app.patch('/api/admin/users/:id', authenticateToken, requireRole(['admin']), updateAdminUser);

// Delete Admin User (Super Admin only)
app.delete('/api/admin/users/:id', authenticateToken, requireRole(['admin']), deleteAdminUser);

// Get Admin Dashboard
app.get('/api/admin/dashboard', authenticateToken, requireRole(['admin']), getAdminDashboard);

// Get Admin Statistics
app.get('/api/admin/stats', authenticateToken, requireRole(['admin']), getAdminStats);

// Manage User Roles (Admin only)
app.patch('/api/admin/users/:id/role', authenticateToken, requireRole(['admin']), manageUserRoles);

// System Maintenance (Admin only)
app.post('/api/admin/maintenance', authenticateToken, requireRole(['admin']), systemMaintenance);

// Bulk User Operations (Admin only)
app.post('/api/admin/users/bulk', authenticateToken, requireRole(['admin']), bulkUserOperations);

// Get System Logs (Admin only)
app.get('/api/admin/logs', authenticateToken, requireRole(['admin']), getSystemLogs);

console.log('✅ Admin management endpoints configured');

// ==================== ADDITIONAL MISSING ENDPOINTS ====================

console.log('🔗 Setting up additional endpoints...');

// User Profile Management Subpages
app.get('/api/users/:id/profile/personal', authenticateToken, userController.getUserById);
app.get('/api/users/:id/profile/security', authenticateToken, userController.getUserById);
app.get('/api/users/:id/profile/preferences', authenticateToken, userController.getUserById);
app.get('/api/users/:id/profile/subscription', authenticateToken, userController.getUserById);

// Pickup Management Subpages
app.get('/api/pickups/:id/history', authenticateToken, pickupController.getPickupRequest);
app.get('/api/pickups/:id/tracking', authenticateToken, pickupController.getPickupRequest);
app.get('/api/pickups/:id/documents', authenticateToken, pickupController.getPickupRequest);

// Admin Dashboard Subpages
app.get('/api/admin/dashboard/overview', authenticateToken, requireRole(['admin']), getAdminDashboard);
app.get('/api/admin/dashboard/users', authenticateToken, requireRole(['admin']), getAllAdminUsers);
app.get('/api/admin/dashboard/pickups', authenticateToken, requireRole(['admin']), pickupController.getPickupRequests);
app.get('/api/admin/dashboard/analytics', authenticateToken, requireRole(['admin']), analyticsController.getDashboardOverview);
app.get('/api/admin/dashboard/reports', authenticateToken, requireRole(['admin']), getReports);
app.get('/api/admin/dashboard/settings', authenticateToken, requireRole(['admin']), systemController.getSettings);

// Government Dashboard Subpages
app.get('/api/government/dashboard', authenticateToken, requireRole(['government']), analyticsController.getDashboardOverview);
app.get('/api/government/environmental-impact', authenticateToken, requireRole(['government']), analyticsController.getEnvironmentalImpact);
app.get('/api/government/location-analytics', authenticateToken, requireRole(['government']), analyticsController.getLocationAnalytics);
app.get('/api/government/reports', authenticateToken, requireRole(['government']), getReports);

// Waste Picker Dashboard Subpages
app.get('/api/waste-picker/dashboard', authenticateToken, requireRole(['waste_picker']), userController.getUserDashboard);
app.get('/api/waste-picker/available-jobs', authenticateToken, requireRole(['waste_picker']), pickupController.getNearbyPickups);
app.get('/api/waste-picker/earnings', authenticateToken, requireRole(['waste_picker']), getTransactions);
app.get('/api/waste-picker/profile', authenticateToken, requireRole(['waste_picker']), authController.getProfile);

// Household Dashboard Subpages
app.get('/api/household/dashboard', authenticateToken, requireRole(['household']), userController.getUserDashboard);
app.get('/api/household/pickups', authenticateToken, requireRole(['household']), pickupController.getPickupRequests);
app.get('/api/household/rewards', authenticateToken, requireRole(['household']), rewardsController.getRewards);
app.get('/api/household/points', authenticateToken, requireRole(['household']), authController.getProfile);

// Recycling Company Dashboard Subpages
app.get('/api/recycling-company/dashboard', authenticateToken, requireRole(['recycling_company']), userController.getUserDashboard);
app.get('/api/recycling-company/transactions', authenticateToken, requireRole(['recycling_company']), getTransactions);
app.get('/api/recycling-company/inventory', authenticateToken, requireRole(['recycling_company']), getRecyclingCompanyById);

// Advanced Search and Filter Endpoints
app.get('/api/search/users', authenticateToken, requireRole(['admin', 'government']), userController.getAllUsers);
app.get('/api/search/pickups', authenticateToken, pickupController.getPickupRequests);
app.get('/api/search/companies', authenticateToken, getRecyclingCompanies);

// Bulk Operations Endpoints
app.post('/api/bulk/users/export', authenticateToken, requireRole(['admin']), analyticsController.exportAnalytics);
app.post('/api/bulk/pickups/export', authenticateToken, requireRole(['admin']), analyticsController.exportAnalytics);
app.post('/api/bulk/notifications/send', authenticateToken, requireRole(['admin']), notificationController.broadcastNotification);

// Settings Management Endpoints
app.get('/api/settings/general', authenticateToken, requireRole(['admin']), systemController.getSettings);
app.patch('/api/settings/general', authenticateToken, requireRole(['admin']), systemController.updateSetting);
app.get('/api/settings/email', authenticateToken, requireRole(['admin']), systemController.getSettings);
app.patch('/api/settings/email', authenticateToken, requireRole(['admin']), systemController.updateSetting);
app.get('/api/settings/sms', authenticateToken, requireRole(['admin']), systemController.getSettings);
app.patch('/api/settings/sms', authenticateToken, requireRole(['admin']), systemController.updateSetting);
app.get('/api/settings/payment', authenticateToken, requireRole(['admin']), systemController.getSettings);
app.patch('/api/settings/payment', authenticateToken, requireRole(['admin']), systemController.updateSetting);

console.log('✅ Additional endpoints configured');

// ==================== ERROR HANDLING MIDDLEWARE ====================

console.log('🚨 Setting up error handling...');

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Global error handler:', err);
  logger.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

console.log('✅ Error handling configured');

// Socket.IO connection handling
console.log('🔌 Setting up Socket.IO handlers...');

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join user room for notifications
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room`);
  });

  // Handle location updates from waste pickers
  socket.on('location_update', (data) => {
    socket.to(data.userId).emit('waste_picker_location', data);
  });

  // Handle pickup status updates
  socket.on('pickup_status_update', (data) => {
    io.emit('pickup_status_changed', data);
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

console.log('✅ Socket.IO handlers configured');
console.log('🎯 Express app setup complete!');

export { app, server, io };
export default app;