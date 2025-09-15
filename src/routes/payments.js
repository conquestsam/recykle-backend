import express from 'express';
import paymentService from '../services/paymentService.js';
import db from '../database/connection.js';
import { transactions, users } from '../database/schema.js';
import { eq, sql } from 'drizzle-orm';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * @route   POST /api/payments/initialize
 * @desc    Initialize payment
 * @access  Private
 * @body    { amount, description, metadata? }
 */
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    const { amount, description, metadata = {} } = req.body;
    const userId = req.user.id;
    const reference = `RN_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Create transaction record
    const transaction = await db
      .insert(transactions)
      .values({
        userId,
        type: 'subscription',
        amount,
        status: 'pending',
        paymentReference: reference,
        description,
        metadata: { ...metadata, userId }
      })
      .returning();

    // Initialize payment with Paystack
    const paymentData = await paymentService.initializePayment(
      req.user.email,
      parseFloat(amount),
      reference,
      { userId, transactionId: transaction[0].id }
    );

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        transaction: transaction[0],
        paymentUrl: paymentData.data.authorization_url,
        reference: paymentData.data.reference
      }
    });

  } catch (error) {
    logger.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment
 * @access  Private
 * @body    { reference }
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.body;

    // Verify payment with Paystack
    const verification = await paymentService.verifyPayment(reference);

    if (!verification.status) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    const paymentData = verification.data;

    // Update transaction status
    const updatedTransaction = await db
      .update(transactions)
      .set({
        status: paymentData.status === 'success' ? 'completed' : 'failed',
        paymentMethod: paymentData.channel,
        metadata: sql`${transactions.metadata} || ${JSON.stringify(paymentData)}`,
        updatedAt: new Date()
      })
      .where(eq(transactions.paymentReference, reference))
      .returning();

    if (!updatedTransaction.length) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Send notification if payment successful
    if (paymentData.status === 'success') {
      await notificationService.sendPaymentReceivedNotification(
        req.user,
        updatedTransaction[0]
      );
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        transaction: updatedTransaction[0],
        paymentStatus: paymentData.status
      }
    });

  } catch (error) {
    logger.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/payments/banks
 * @desc    Get list of banks
 * @access  Private
 */
router.get('/banks', authenticateToken, async (req, res) => {
  try {
    const banks = await paymentService.getBanks();

    res.json({
      success: true,
      data: banks.data
    });

  } catch (error) {
    logger.error('Get banks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get banks',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/payments/resolve-account
 * @desc    Resolve bank account
 * @access  Private
 * @body    { accountNumber, bankCode }
 */
router.post('/resolve-account', authenticateToken, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    const accountData = await paymentService.resolveAccountNumber(accountNumber, bankCode);

    res.json({
      success: true,
      data: accountData.data
    });

  } catch (error) {
    logger.error('Resolve account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve account',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/payments/transfer
 * @desc    Initiate transfer (Admin only)
 * @access  Private (Admin only)
 * @body    { userId, amount, reason }
 */
router.post('/transfer', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    // Get user details
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For waste pickers, get bank details from profile
    // This is a simplified implementation
    const recipientCode = 'RCP_recipient_code'; // Would be created/retrieved from user profile

    const transfer = await paymentService.initiateTransfer(
      parseFloat(amount),
      recipientCode,
      reason
    );

    // Create transaction record
    const transaction = await db
      .insert(transactions)
      .values({
        userId,
        type: 'pickup_payment',
        amount,
        status: 'pending',
        paymentReference: transfer.data.reference,
        description: reason,
        metadata: { transferCode: transfer.data.transfer_code }
      })
      .returning();

    res.json({
      success: true,
      message: 'Transfer initiated successfully',
      data: {
        transaction: transaction[0],
        transferData: transfer.data
      }
    });

  } catch (error) {
    logger.error('Initiate transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate transfer',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/payments/transactions
 * @desc    Get user transactions
 * @access  Private
 * @query   { page?, limit?, type?, status? }
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    let query = db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));

    // Apply filters
    const conditions = [eq(transactions.userId, userId)];
    if (type) conditions.push(eq(transactions.type, type));
    if (status) conditions.push(eq(transactions.status, status));

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    const userTransactions = await query
      .orderBy(desc(transactions.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    res.json({
      success: true,
      data: userTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: userTransactions.length
      }
    });

  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/payments/transactions/:id
 * @desc    Get single transaction
 * @access  Private
 * @params  id - Transaction ID
 */
router.get('/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    if (!transaction.length) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && transaction[0].userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: transaction[0]
    });

  } catch (error) {
    logger.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction',
      error: error.message
    });
  }
});

export default router;