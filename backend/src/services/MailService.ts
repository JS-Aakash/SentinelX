import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465, // true for port 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: env.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`📧 Email sent successfully: ${info.messageId}`);
    } catch (error) {
      logger.error('❌ Failed to send email via SMTP:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, name: string): Promise<void> {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await this.sendMail({
      to: email,
      subject: 'SentinelX – Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px;">SentinelX Password Reset</h2>
          <p style="color: #374151; font-size: 16px;">Hello ${name},</p>
          <p style="color: #374151; font-size: 16px;">You requested a password reset. Click the button below to reset your password:</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #4b5563; font-size: 14px;">This link will expire in 1 hour.</p>
          <p style="color: #4b5563; font-size: 14px;">If you did not request this password reset, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">SentinelX – Predict. Prevent. Prolong.</p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(email: string, name: string, companyName: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Welcome to SentinelX – ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px;">Welcome to SentinelX!</h2>
          <p style="color: #374151; font-size: 16px;">Hello ${name},</p>
          <p style="color: #374151; font-size: 16px;">Your admin account for <strong>${companyName}</strong> has been created successfully.</p>
          <p style="color: #374151; font-size: 16px;">You can now log in and start monitoring your industrial assets.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">SentinelX – Predict. Prevent. Prolong.</p>
        </div>
      `,
    });
  }
}

export const mailService = new MailService();
