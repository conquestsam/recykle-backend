import axios from 'axios';
import logger from '../utils/logger.js';

class PaymentService {
  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.paystackBaseURL = 'https://api.paystack.co';
  }

  async addPaymentMethod(email, authorization_code) {
  try {
    const payload = {
      email,
      authorization_code,
    };

    const response = await axios.post(
      `${this.paystackBaseURL}/customer`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Payment method addition failed:', error.response?.data || error.message);
    throw error;
  }
}; 

  async initializePayment(email, amount, reference, metadata = {}) {
    try {
      const payload = {
        email,
        amount: amount * 100, // Convert to kobo
        reference,
        metadata,
      };

      const response = await axios.post(
        `${this.paystackBaseURL}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Payment initialization failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async verifyPayment(reference) {
    try {
      const response = await axios.get(
        `${this.paystackBaseURL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Payment verification failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async createTransferRecipient(name, accountNumber, bankCode) {
    try {
      const payload = {
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
      };

      const response = await axios.post(
        `${this.paystackBaseURL}/transferrecipient`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Transfer recipient creation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async initiateTransfer(amount, recipient, reason) {
    try {
      const payload = {
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient,
        reason,
      };

      const response = await axios.post(
        `${this.paystackBaseURL}/transfer`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Transfer initiation failed:', error?.response?.data || error.message);
      throw error;
    }
  }

  async getBanks() {
    try {
      const response = await axios.get(
        `${this.paystackBaseURL}/bank`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get banks:', error.response?.data || error.message);
      throw error;
    }
  }

  async resolveAccountNumber(accountNumber, bankCode) {
    try {
      const response = await axios.get(
        `${this.paystackBaseURL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Account resolution failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new PaymentService();