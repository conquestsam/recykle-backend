import axios from 'axios';
import logger from '../utils/logger.js';

class SMSService {
  constructor() {
    this.apiKey = process.env.TERMII_API_KEY;
    this.senderId = process.env.TERMII_SENDER_ID;
    this.baseURL = 'https://api.ng.termii.com/api';
  }

  async sendSMS(to, message) {
    try {
      const payload = {
        to,
        from: this.senderId,
        sms: message,
        type: 'plain',
        api_key: this.apiKey,
        channel: 'generic',
      };

      const response = await axios.post(`${this.baseURL}/sms/send`, payload);
      logger.info(`SMS sent successfully to ${to}`, { messageId: response.data.message_id });
      return response.data;
    } catch (error) {
      logger.error('SMS sending failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendVerificationCode(phone, code) {
    const message = `Your Recykle-Naija verification code is: ${code}. Valid for 10 minutes.`;
    return await this.sendSMS(phone, message);
  }

  async sendPickupNotification(phone, pickupId) {
    const message = `Your waste pickup request #${pickupId} has been accepted. The waste picker will arrive soon.`;
    return await this.sendSMS(phone, message);
  }

  async sendPickupReminder(phone, pickupId, time) {
    const message = `Reminder: Your waste pickup #${pickupId} is scheduled for ${time}. Please have your waste ready.`;
    return await this.sendSMS(phone, message);
  }
}

export default new SMSService();