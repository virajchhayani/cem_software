import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailService } from './email.service.interface';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  async sendPasswordResetEmail(to: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${resetToken}`;

    // TODO: Replace with actual SMTP implementation
    this.logger.log(`
      [EMAIL SERVICE - Password Reset]
      To: ${to}
      Subject: Reset Your Password
      Template: password-reset
      Variables: {
        userName: ${userName},
        resetUrl: ${resetUrl},
        token: ${resetToken},
        expiry: 1 hour
      }
    `);

    console.log(`[EMAIL] Password reset email would be sent to: ${to}`);
    console.log(`[EMAIL] Reset URL: ${resetUrl}`);
  }

  async sendEmailVerificationEmail(to: string, verificationToken: string, userName: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${verificationToken}`;

    // TODO: Replace with actual SMTP implementation
    this.logger.log(`
      [EMAIL SERVICE - Email Verification]
      To: ${to}
      Subject: Verify Your Email
      Template: email-verification
      Variables: {
        userName: ${userName},
        verificationUrl: ${verificationUrl},
        token: ${verificationToken},
        expiry: 48 hours
      }
    `);

    console.log(`[EMAIL] Email verification would be sent to: ${to}`);
    console.log(`[EMAIL] Verification URL: ${verificationUrl}`);
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    // TODO: Replace with actual SMTP implementation
    this.logger.log(`
      [EMAIL SERVICE - Welcome]
      To: ${to}
      Subject: Welcome to CEM ERP
      Template: welcome
      Variables: {
        userName: ${userName},
        loginUrl: ${this.frontendUrl}/auth/login
      }
    `);

    console.log(`[EMAIL] Welcome email would be sent to: ${to}`);
  }

  async sendPasswordChangedEmail(to: string, userName: string): Promise<void> {
    // TODO: Replace with actual SMTP implementation
    this.logger.log(`
      [EMAIL SERVICE - Password Changed]
      To: ${to}
      Subject: Your Password Has Been Changed
      Template: password-changed
      Variables: {
        userName: ${userName},
        changedAt: ${new Date().toISOString()}
      }
    `);

    console.log(`[EMAIL] Password changed notification would be sent to: ${to}`);
  }
}
