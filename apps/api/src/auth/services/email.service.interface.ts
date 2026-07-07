export interface IEmailService {
  /**
   * Send password reset email
   * @param to Recipient email address
   * @param resetToken Password reset token
   * @param userName User's name
   */
  sendPasswordResetEmail(to: string, resetToken: string, userName: string): Promise<void>;

  /**
   * Send email verification email
   * @param to Recipient email address
   * @param verificationToken Email verification token
   * @param userName User's name
   */
  sendEmailVerificationEmail(to: string, verificationToken: string, userName: string): Promise<void>;

  /**
   * Send welcome email
   * @param to Recipient email address
   * @param userName User's name
   */
  sendWelcomeEmail(to: string, userName: string): Promise<void>;

  /**
   * Send password changed notification
   * @param to Recipient email address
   * @param userName User's name
   */
  sendPasswordChangedEmail(to: string, userName: string): Promise<void>;
}
