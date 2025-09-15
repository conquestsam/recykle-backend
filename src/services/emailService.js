import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database/connection.js';
import { emailTemplates } from '../database/schema.js';
import { eq } from 'drizzle-orm';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html: htmlContent,
        text: textContent,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}`, { messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendTemplateEmail(to, templateName, variables = {}) {
    try {
      // Get template from database
      const template = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.name, templateName))
        .limit(1);

      if (!template.length) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      const { subject, htmlContent, textContent } = template[0];

      // Compile templates with handlebars
      const compiledSubject = handlebars.compile(subject)(variables);
      const compiledHtml = handlebars.compile(htmlContent)(variables);
      const compiledText = textContent ? handlebars.compile(textContent)(variables) : null;

      return await this.sendEmail(to, compiledSubject, compiledHtml, compiledText);
    } catch (error) {
      logger.error('Template email sending failed:', error);
      throw error;
    }
  }

  // Welcome email for new users
  async sendWelcomeEmail(user) {
    const variables = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${user.emailVerificationToken}`,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'welcome', variables);
  }

  // Email verification
  async sendEmailVerification(user) {
    const variables = {
      firstName: user.firstName,
      verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${user.emailVerificationToken}`,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'email_verification', variables);
  }

  // Password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const variables = {
      firstName: user.firstName,
      resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'password_reset', variables);
  }

  // Pickup request confirmation
  async sendPickupRequestConfirmation(user, pickupRequest) {
    const variables = {
      firstName: user.firstName,
      pickupId: pickupRequest.id,
      wasteType: pickupRequest.wasteType,
      pickupAddress: pickupRequest.pickupAddress,
      preferredDate: pickupRequest.preferredDate,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'pickup_request_confirmation', variables);
  }

  // Pickup accepted notification
  async sendPickupAcceptedEmail(user, pickupRequest, wastePicker) {
    const variables = {
      firstName: user.firstName,
      pickupId: pickupRequest.id,
      wastePickerName: `${wastePicker.firstName} ${wastePicker.lastName}`,
      wastePickerPhone: wastePicker.phone,
      estimatedArrival: '30 minutes',
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'pickup_accepted', variables);
  }

  // Pickup completed notification
  async sendPickupCompletedEmail(user, pickupRequest) {
    const variables = {
      firstName: user.firstName,
      pickupId: pickupRequest.id,
      pointsEarned: pickupRequest.pointsEarned,
      totalPoints: user.availablePoints,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'pickup_completed', variables);
  }

  // Reward redemption confirmation
  async sendRewardRedemptionEmail(user, reward, redemption) {
    const variables = {
      firstName: user.firstName,
      rewardName: reward.name,
      pointsUsed: redemption.pointsUsed,
      redemptionCode: redemption.redemptionCode,
      remainingPoints: user.availablePoints,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'reward_redemption', variables);
  }

  // Payment received notification
  async sendPaymentReceivedEmail(user, transaction) {
    const variables = {
      firstName: user.firstName,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod,
      transactionId: transaction.id,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'payment_received', variables);
  }

  // Subscription confirmation
  async sendSubscriptionConfirmationEmail(user, subscription) {
    const variables = {
      firstName: user.firstName,
      planName: subscription.planName,
      amount: subscription.amount,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'subscription_confirmation', variables);
  }

  // Account verification approved
  async sendAccountVerificationApproved(user) {
    const variables = {
      firstName: user.firstName,
      role: user.role,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'account_verification_approved', variables);
  }

  // Weekly summary email
  async sendWeeklySummaryEmail(user, summaryData) {
    const variables = {
      firstName: user.firstName,
      weeklyPickups: summaryData.pickups,
      pointsEarned: summaryData.pointsEarned,
      totalEarnings: summaryData.earnings,
      appName: 'Recykle-Naija',
    };

    return await this.sendTemplateEmail(user.email, 'weekly_summary', variables);
  }
}

export default new EmailService();