import db from '../database/connection.js';
import { transactions, users } from '../database/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import paymentService from '../services/paymentService.js';
import notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class PaymentController {
  // Initialize payment
  async initializePayment(req, res) {
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
  }

  // Verify payment
  async verifyPayment(req, res) {
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
  }

  // Get user transactions
  async getTransactions(req, res) {
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
  }

  // Get transaction by ID
  async getTransactionById(req, res) {
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
  }

  // Process refund (Admin only)
  async processRefund(req, res) {
    try {
      const { transactionId, reason, amount } = req.body;

      const transaction = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1);

      if (!transaction.length) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Create refund transaction
      const refundTransaction = await db
        .insert(transactions)
        .values({
          userId: transaction[0].userId,
          type: 'refund',
          amount: amount || transaction[0].amount,
          status: 'completed',
          description: `Refund for transaction ${transactionId}: ${reason}`,
          metadata: { originalTransactionId: transactionId, reason }
        })
        .returning();

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: refundTransaction[0]
      });

    } catch (error) {
      logger.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        error: error.message
      });
    }
  }

  // Get payment methods
  async getPaymentMethods(req, res) {
    try {
      const paymentMethods = [
        {
          id: 'card',
          name: 'Debit/Credit Card',
          description: 'Pay with your bank card',
          icon: 'credit-card',
          isActive: true
        },
        {
          id: 'bank_transfer',
          name: 'Bank Transfer',
          description: 'Direct bank transfer',
          icon: 'bank',
          isActive: true
        },
        {
          id: 'ussd',
          name: 'USSD',
          description: 'Pay with USSD code',
          icon: 'phone',
          isActive: true
        }
      ];

      res.json({
        success: true,
        data: paymentMethods
      });

    } catch (error) {
      logger.error('Get payment methods error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment methods',
        error: error.message
      });
    }
  }

  // Add payment method
  async addPaymentMethod(req, res) {
    try {
      const { type, details } = req.body;

      // Mock adding payment method
      const paymentMethod = {
        id: Date.now().toString(),
        userId: req.user.id,
        type,
        details,
        isDefault: false,
        createdAt: new Date()
      };

      res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data: paymentMethod
      });

    } catch (error) {
      logger.error('Add payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add payment method',
        error: error.message
      });
    }
  }

  // Delete payment method
  async deletePaymentMethod(req, res) {
    try {
      const { id } = req.params;

      // Mock deletion
      res.json({
        success: true,
        message: 'Payment method deleted successfully'
      });

    } catch (error) {
      logger.error('Delete payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete payment method',
        error: error.message
      });
    }
  }

  // Get banks
  async getBanks(req, res) {
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
  }

  // Resolve bank account
  async resolveAccount(req, res) {
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
  }

  // Initiate transfer
  async initiateTransfer(req, res) {
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

      // Create transaction record
      const transaction = await db
        .insert(transactions)
        .values({
          userId,
          type: 'pickup_payment',
          amount,
          status: 'completed',
          description: reason,
          metadata: { transferInitiatedBy: req.user.id }
        })
        .returning();

      res.json({
        success: true,
        message: 'Transfer initiated successfully',
        data: transaction[0]
      });

    } catch (error) {
      logger.error('Initiate transfer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate transfer',
        error: error.message
      });
    }
  }
}

export const initializePayment = new PaymentController().initializePayment;
export const getBanks = new PaymentController().getBanks;
export const resolveAccount = new PaymentController().resolveAccount;
export const initiateTransfer = new PaymentController().initiateTransfer;
export const verifyPayment = new PaymentController().verifyPayment;
export const getTransactions = new PaymentController().getTransactions;
export const getTransactionById = new PaymentController().getTransactionById;
export const processRefund = new PaymentController().processRefund;
export const getPaymentMethods = new PaymentController().getPaymentMethods;
export const addPaymentMethod = new PaymentController().addPaymentMethod;
export const deletePaymentMethod = new PaymentController().deletePaymentMethod;