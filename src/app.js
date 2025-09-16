import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { authenticateToken, requireRole } from './middleware/auth.js';
// import logger from './utils/logger.js';

// Import and instantiate all controllers properly
import AuthController from './controllers/authController.js';
import UserController from './controllers/userController.js';
import PickupController from './controllers/pickupController.js';
import RewardsController from './controllers/rewardsController.js';
import NotificationController from './controllers/notificationController.js';
import AnalyticsController from './controllers/analyticsController.js';
import PaymentController from './controllers/paymentController.js';
import SubscriptionController from './controllers/subscriptionController.js';
import ReportController from './controllers/reportController.js';
import SystemController from './controllers/systemController.js';
import SupportController from './controllers/supportController.js';
import RecyclingCompanyController from './controllers/recyclingCompanyController.js';
import WasteCategoryController from './controllers/WasteCategoryController.js';
import EnvironmentalController from './controllers/environmentalController.js';
import AdminController from './controllers/adminController.js';

const adminController = new AdminController(); 
const environmentalController = new EnvironmentalController(); 
const wasteCategoryController = new WasteCategoryController();
const recyclingCompanyController = new RecyclingCompanyController();
const supportController = new SupportController(); 
const systemController = new SystemController(); 
const reportController = new ReportController();
const subscriptionController = new SubscriptionController();
const paymentController = new PaymentController();
const authController = new AuthController();
const userController = new UserController(); 
const pickupController = new PickupController(); 
const rewardsController = new RewardsController(); 
const notificationController = new NotificationController(); 
const analyticsController = new AnalyticsController(); 

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
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
});

console.log('🚦 Rate limiting configured');

// ==================== HEALTH CHECK ENDPOINTS ====================
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

// ==================== AUTHENTICATION ENDPOINTS ====================
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/verify-email', authController.verifyEmail);
app.post('/api/auth/forgot-password', authLimiter, authController.forgotPassword);
app.post('/api/auth/reset-password', authLimiter, authController.resetPassword);
app.get('/api/auth/profile', authenticateToken, authController.getProfile);
app.patch('/api/auth/profile', authenticateToken, authController.updateProfile);
app.patch('/api/auth/change-password', authenticateToken, authController.changePassword);

// ==================== USER MANAGEMENT ENDPOINTS ====================
app.get('/api/users', authenticateToken, requireRole(['admin', 'government']), userController.getAllUsers);
app.get('/api/users/:id', authenticateToken, userController.getUserById);
app.post('/api/users', authenticateToken, requireRole(['admin']), userController.createUser);
app.put('/api/users/:id', authenticateToken, requireRole(['admin']), userController.updateUserById);
app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), userController.deleteUserById);
app.get('/api/users/:id/dashboard', authenticateToken, userController.getUserDashboard);
app.get('/api/users/:id/activity', authenticateToken, userController.getUserActivity);
app.patch('/api/users/profile', authenticateToken, userController.updateProfile);
app.patch('/api/users/waste-picker-profile', authenticateToken, requireRole(['waste_picker']), userController.updateWastePickerProfile);
app.patch('/api/users/recycling-company-profile', authenticateToken, requireRole(['recycling_company']), userController.updateRecyclingCompanyProfile);
app.get('/api/users/profile/:id', authenticateToken, userController.getFullProfile);
app.get('/api/users/search/waste-pickers', authenticateToken, userController.searchWastePickers);
app.get('/api/users/search/recycling-companies', authenticateToken, userController.searchRecyclingCompanies);
app.get('/api/users/stats/:id', authenticateToken, userController.getUserStats);
app.post('/api/users/upload-avatar', authenticateToken, userController.uploadAvatar);
app.post('/api/users/verify-documents', authenticateToken, userController.uploadVerificationDocuments);
app.get('/api/users/leaderboard', authenticateToken, userController.getLeaderboard);
app.patch('/api/users/:id/status', authenticateToken, requireRole(['admin']), userController.updateUserStatus);
app.delete('/api/users/account', authenticateToken, userController.deleteAccount);

// ==================== PICKUP MANAGEMENT ENDPOINTS ====================
app.post('/api/pickups', authenticateToken, requireRole(['household']), pickupController.createPickupRequest);
app.get('/api/pickups', authenticateToken, pickupController.getPickupRequests);
app.get('/api/pickups/:id', authenticateToken, pickupController.getPickupRequest);
app.put('/api/pickups/:id/accept', authenticateToken, requireRole(['waste_picker']), pickupController.acceptPickupRequest);
app.put('/api/pickups/:id/status', authenticateToken, pickupController.updatePickupStatus);
app.patch('/api/pickups/:id/cancel', authenticateToken, pickupController.cancelPickupRequest);
app.get('/api/pickups/nearby', authenticateToken, requireRole(['waste_picker']), pickupController.getNearbyPickups);
app.get('/api/pickups/stats', authenticateToken, pickupController.getPickupStats);

// ==================== REWARDS ENDPOINTS ====================
app.get('/api/rewards', authenticateToken, rewardsController.getRewards);
app.get('/api/rewards/:id', authenticateToken, rewardsController.getReward);
app.post('/api/rewards/redeem', authenticateToken, rewardsController.redeemReward);
app.get('/api/rewards/redemptions/my', authenticateToken, rewardsController.getUserRedemptions);
app.get('/api/rewards/redemptions/:id', authenticateToken, rewardsController.getRedemption);
app.patch('/api/rewards/redemptions/:id/status', authenticateToken, requireRole(['admin']), rewardsController.updateRedemptionStatus);
app.post('/api/rewards', authenticateToken, requireRole(['admin']), rewardsController.createReward);
app.patch('/api/rewards/:id', authenticateToken, requireRole(['admin']), rewardsController.updateReward);
app.delete('/api/rewards/:id', authenticateToken, requireRole(['admin']), rewardsController.deleteReward);
app.get('/api/rewards/stats', authenticateToken, requireRole(['admin']), rewardsController.getRewardStats);

// ==================== NOTIFICATION ENDPOINTS ===================
app.get('/api/notifications', authenticateToken, notificationController.getNotifications);
app.patch('/api/notifications/:id/read', authenticateToken, notificationController.markAsRead);
app.patch('/api/notifications/read-all', authenticateToken, notificationController.markAllAsRead);
app.delete('/api/notifications/:id', authenticateToken, notificationController.deleteNotification);
app.delete('/api/notifications', authenticateToken, notificationController.deleteAllNotifications);
app.get('/api/notifications/stats', authenticateToken, notificationController.getNotificationStats);
app.get('/api/notifications/:id', authenticateToken, notificationController.getNotification);
app.post('/api/notifications/test', authenticateToken, requireRole(['admin']), notificationController.sendTestNotification);
app.post('/api/notifications/broadcast', authenticateToken, requireRole(['admin']), notificationController.broadcastNotification);

// ==================== ANALYTICS ENDPOINTS ====================
app.get('/api/analytics/dashboard', authenticateToken, requireRole(['admin', 'government']), analyticsController.getDashboardOverview);
app.get('/api/analytics/pickups', authenticateToken, requireRole(['admin', 'government']), analyticsController.getPickupAnalytics);
app.get('/api/analytics/users', authenticateToken, requireRole(['admin', 'government']), analyticsController.getUserAnalytics);
app.get('/api/analytics/financial', authenticateToken, requireRole(['admin']), analyticsController.getFinancialAnalytics);
app.get('/api/analytics/environmental-impact', authenticateToken, requireRole(['admin', 'government']), analyticsController.getEnvironmentalImpact);
app.get('/api/analytics/export', authenticateToken, requireRole(['admin', 'government']), analyticsController.exportAnalytics);

// ==================== PAYMENT ENDPOINTS ====================
app.post('/api/payments/initialize', authenticateToken, paymentController.initializePayment);
app.post('/api/payments/verify', authenticateToken, paymentController.verifyPayment);
app.get('/api/payments/transactions', authenticateToken, paymentController.getTransactions);
app.get('/api/payments/transactions/:id', authenticateToken, paymentController.getTransactionById);
app.post('/api/payments/refund', authenticateToken, requireRole(['admin']), paymentController.processRefund);
app.get('/api/payments/methods', authenticateToken, paymentController.getPaymentMethods);
app.post('/api/payments/methods', authenticateToken, paymentController.addPaymentMethod);
app.delete('/api/payments/methods/:id', authenticateToken, paymentController.deletePaymentMethod);
app.get('/api/payments/banks', authenticateToken, paymentController.getBanks);
app.post('/api/payments/resolve-account', authenticateToken, paymentController.resolveAccount);
app.post('/api/payments/transfer', authenticateToken, requireRole(['admin']), paymentController.initiateTransfer);

// ==================== SUBSCRIPTION ENDPOINTS ====================
app.get('/api/subscriptions', authenticateToken, subscriptionController.getSubscriptions);
app.post('/api/subscriptions', authenticateToken, subscriptionController.createSubscription);
app.patch('/api/subscriptions/:id', authenticateToken, subscriptionController.updateSubscription);
app.delete('/api/subscriptions/:id', authenticateToken, subscriptionController.cancelSubscription);
app.get('/api/subscriptions/plans', authenticateToken, subscriptionController.getSubscriptionPlans);
app.post('/api/subscriptions/:id/upgrade', authenticateToken, subscriptionController.upgradeSubscription);

// ==================== REPORT ENDPOINTS ====================
app.post('/api/reports/pickups', authenticateToken, requireRole(['admin', 'government']), reportController.generatePickupReport);
app.post('/api/reports/users', authenticateToken, requireRole(['admin', 'government']), reportController.generateUserReport);
app.post('/api/reports/revenue', authenticateToken, requireRole(['admin']), reportController.generateRevenueReport);
app.post('/api/reports/environmental', authenticateToken, requireRole(['admin', 'government']), reportController.generateEnvironmentalReport);
app.get('/api/reports', authenticateToken, requireRole(['admin', 'government']), reportController.getReports);
app.get('/api/reports/:id', authenticateToken, requireRole(['admin', 'government']), reportController.getReportById);
app.delete('/api/reports/:id', authenticateToken, requireRole(['admin']), reportController.deleteReport);
app.post('/api/reports/schedule', authenticateToken, requireRole(['admin', 'government']), reportController.scheduleReport);

// ==================== SYSTEM ENDPOINTS ====================
app.get('/api/system/settings', systemController.getSettings);
app.get('/api/system/settings/:key', systemController.getSetting);
app.post('/api/system/settings', authenticateToken, requireRole(['admin']), systemController.createSetting);
app.patch('/api/system/settings/:key', authenticateToken, requireRole(['admin']), systemController.updateSetting);
app.delete('/api/system/settings/:key', authenticateToken, requireRole(['admin']), systemController.deleteSetting);
app.get('/api/system/health', systemController.healthCheck);
app.get('/api/system/stats', authenticateToken, requireRole(['admin']), systemController.getSystemStats);
app.post('/api/system/backup', authenticateToken, requireRole(['admin']), systemController.createBackup);
app.get('/api/system/logs', authenticateToken, requireRole(['admin']), systemController.getLogs);

// ==================== SUPPORT ENDPOINTS ====================
app.get('/api/support/tickets', authenticateToken, supportController.getSupportTickets);
app.post('/api/support/tickets', authenticateToken, supportController.createSupportTicket);
app.get('/api/support/tickets/:id', authenticateToken, supportController.getSupportTicketById);
app.patch('/api/support/tickets/:id', authenticateToken, supportController.updateSupportTicket);
app.patch('/api/support/tickets/:id/close', authenticateToken, supportController.closeSupportTicket);
app.patch('/api/support/tickets/:id/assign', authenticateToken, requireRole(['admin']), supportController.assignSupportTicket);

// ==================== RECYCLING COMPANY ENDPOINTS ====================
app.get('/api/recycling-companies', authenticateToken, recyclingCompanyController.getRecyclingCompanies);
app.post('/api/recycling-companies', authenticateToken, requireRole(['admin']), recyclingCompanyController.createRecyclingCompany);
app.get('/api/recycling-companies/:id', authenticateToken, recyclingCompanyController.getRecyclingCompanyById);
app.patch('/api/recycling-companies/:id', authenticateToken, recyclingCompanyController.updateRecyclingCompany);
app.delete('/api/recycling-companies/:id', authenticateToken, requireRole(['admin']), recyclingCompanyController.deleteRecyclingCompany);
app.patch('/api/recycling-companies/:id/approve', authenticateToken, requireRole(['admin']), recyclingCompanyController.approveRecyclingCompany);

// ==================== WASTE CATEGORY ENDPOINTS ====================
app.get('/api/waste-categories', authenticateToken, wasteCategoryController.getWasteCategories);
app.post('/api/waste-categories', authenticateToken, requireRole(['admin']), wasteCategoryController.createWasteCategory);
app.patch('/api/waste-categories/:id', authenticateToken, requireRole(['admin']), wasteCategoryController.updateWasteCategory);
app.delete('/api/waste-categories/:id', authenticateToken, requireRole(['admin']), wasteCategoryController.deleteWasteCategory);

// ==================== ENVIRONMENTAL IMPACT ENDPOINTS ====================
app.get('/api/environmental', authenticateToken, requireRole(['admin', 'government']), environmentalController.getEnvironmentalData);
app.post('/api/environmental', authenticateToken, requireRole(['admin']), environmentalController.createEnvironmentalData);
app.patch('/api/environmental/:id', authenticateToken, requireRole(['admin']), environmentalController.updateEnvironmentalData);
app.get('/api/environmental/trends', authenticateToken, requireRole(['admin', 'government']), environmentalController.getEnvironmentalTrends);

// ==================== ADMIN MANAGEMENT ENDPOINTS ====================
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), adminController.getAllAdminUsers);
app.post('/api/admin/users', authenticateToken, requireRole(['admin']), adminController.createAdminUser);
app.patch('/api/admin/users/:id', authenticateToken, requireRole(['admin']), adminController.updateAdminUser);
app.delete('/api/admin/users/:id', authenticateToken, requireRole(['admin']), adminController.deleteAdminUser);
app.get('/api/admin/dashboard', authenticateToken, requireRole(['admin']), adminController.getAdminDashboard);
app.get('/api/admin/stats', authenticateToken, requireRole(['admin']), adminController.getAdminStats);
app.patch('/api/admin/users/:id/role', authenticateToken, requireRole(['admin']), adminController.manageUserRoles);
app.post('/api/admin/maintenance', authenticateToken, requireRole(['admin']), adminController.systemMaintenance);
app.post('/api/admin/users/bulk', authenticateToken, requireRole(['admin']), adminController.bulkUserOperations);
app.get('/api/admin/logs',  authenticateToken, requireRole(['admin']), adminController.getSystemLogs);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room`);
  });

  socket.on('location_update', (data) => {
    socket.to(data.userId).emit('waste_picker_location', data);
  });

  socket.on('pickup_status_update', (data) => {
    io.emit('pickup_status_changed', data);
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

console.log('🎯 Express app setup complete!');

export { app, server, io };
export default app;