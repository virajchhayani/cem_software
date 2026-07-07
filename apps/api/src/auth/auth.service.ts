import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserSessionsService } from '../users/user-sessions.service';
import { LoginAttemptsService } from '../users/login-attempts.service';
import { EmailVerificationTokensService } from '../users/email-verification-tokens.service';
import { PasswordResetTokensService } from '../users/password-reset-tokens.service';
import { AuthorizationService } from './services/authorization.service';
import { EmailService } from './services/email.service';
import { JwtPayload, JwtRefreshPayload } from './interfaces/jwt-payload.interface';
import { Tokens, LoginResponse } from './interfaces/tokens.interface';
import { UserRole, LoginStatus, DeviceType } from '@prisma/client';
import { PasswordValidator } from './utils/password-validator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly userSessionsService: UserSessionsService,
    private readonly loginAttemptsService: LoginAttemptsService,
    private readonly emailVerificationTokensService: EmailVerificationTokensService,
    private readonly passwordResetTokensService: PasswordResetTokensService,
    private readonly authorizationService: AuthorizationService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    return user;
  }

  async login(
    email: string,
    password: string,
    deviceInfo: {
      deviceName?: string;
      deviceType?: DeviceType;
      browser?: string;
      operatingSystem?: string;
      ipAddress?: string;
      userAgent?: string;
      country?: string;
      city?: string;
    },
  ): Promise<LoginResponse> {
    const user = await this.validateUser(email, password);

    if (!user) {
      // Log failed attempt
      await this.loginAttemptsService.create({
        email,
        ipAddress: deviceInfo.ipAddress || 'unknown',
        browser: deviceInfo.browser || 'unknown',
        deviceType: deviceInfo.deviceType || DeviceType.UNKNOWN,
        status: LoginStatus.FAILURE,
        failureReason: 'Invalid credentials',
      });

      // Check if user exists for lockout logic
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        await this.handleFailedLogin(existingUser.id);
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await this.loginAttemptsService.create({
        email,
        userId: user.id,
        ipAddress: deviceInfo.ipAddress,
        browser: deviceInfo.browser,
        deviceType: deviceInfo.deviceType || DeviceType.UNKNOWN,
        status: LoginStatus.LOCKED,
        failureReason: 'Account locked',
      });

      throw new UnauthorizedException('Account is temporarily locked');
    }

    // Reset failed login attempts on successful login
    await this.usersService.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    // Log successful attempt
    await this.loginAttemptsService.create({
      email,
      userId: user.id,
      ipAddress: deviceInfo.ipAddress,
      browser: deviceInfo.browser,
      deviceType: deviceInfo.deviceType || DeviceType.UNKNOWN,
      status: LoginStatus.SUCCESS,
    });

    // Update user's last login info
    await this.usersService.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: deviceInfo.ipAddress,
      lastLoginBrowser: deviceInfo.browser,
      lastLoginDevice: deviceInfo.deviceType,
    });

    // Create session first to get session ID
    const session = await this.userSessionsService.create({
      userId: user.id,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType || DeviceType.UNKNOWN,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.operatingSystem,
      ipAddress: deviceInfo.ipAddress,
      country: deviceInfo.country,
      city: deviceInfo.city,
      userAgent: deviceInfo.userAgent,
      refreshTokenHash: await bcrypt.hash('temp-token', 12), // Will be updated after token generation
      isCurrent: true,
      expiresAt: new Date(Date.now() + this.getRefreshTokenExpiration()),
    });

    // Generate tokens with session ID
    const tokens = await this.generateTokens(user.id, user.email, user.role, session.id);

    // Update session with actual refresh token hash
    await this.userSessionsService.update(session.id, {
      refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 12),
    });

    // Mark other sessions as not current
    await this.userSessionsService.markOthersAsNotCurrent(user.id, session.id);

    // Load user permissions
    const permissions = await this.authorizationService.getUserPermissions(user.id);

    // Audit log successful login
    this.logger.log(
      `User logged in successfully: ${user.email} from ${deviceInfo.ipAddress} (${deviceInfo.browser})`,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: permissions.map((p) => p.code),
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<Tokens> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const session = await this.userSessionsService.findById(payload.sessionId);

      if (!session || session.isRevoked || session.userId !== user.id) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (new Date(session.expiresAt) < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Check session timeout (inactive for too long)
      const sessionTimeout = parseInt(this.configService.get<string>('SESSION_TIMEOUT', '3600000'), 10);
      const lastActivity = session.lastActivity || session.createdAt;
      const inactiveTime = Date.now() - new Date(lastActivity).getTime();

      if (inactiveTime > sessionTimeout) {
        // Session has timed out due to inactivity
        await this.userSessionsService.revoke(session.id);
        throw new UnauthorizedException('Session has expired due to inactivity');
      }

      // Token rotation: generate new tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role, payload.sessionId);

      // Update session with new refresh token hash and activity timestamp
      await this.userSessionsService.update(session.id, {
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 12),
        lastActivity: new Date(),
      });

      // Audit log token refresh
      this.logger.log(`Token refreshed for user: ${user.email} (session: ${payload.sessionId})`);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.userSessionsService.revoke(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.userSessionsService.revokeAllForUser(userId);

    // Audit log logout all
    const user = await this.usersService.findById(userId);
    if (user) {
      this.logger.log(`User logged out from all sessions: ${user.email}`);
    }
  }

  async getSessions(userId: string): Promise<any[]> {
    const sessions = await this.userSessionsService.findByUserId(userId);

    // Cleanup expired sessions first
    await this.userSessionsService.cleanupExpiredSessions();

    // Format sessions for response
    return sessions.map((session: any) => ({
      id: session.id,
      deviceName: session.deviceName || 'Unknown Device',
      deviceType: session.deviceType,
      browser: session.browser || 'Unknown',
      operatingSystem: session.operatingSystem || 'Unknown',
      ipAddress: session.ipAddress || 'Unknown',
      country: session.country,
      city: session.city,
      loginTime: session.createdAt,
      lastActivity: session.lastActivity || session.createdAt,
      isCurrent: session.isCurrent,
      status: this.getSessionStatus(session),
      expiresAt: session.expiresAt,
      deviceDescription: this.getDeviceDescription(session),
    }));
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.userSessionsService.findById(sessionId);

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.userId !== userId) {
      throw new BadRequestException('Session does not belong to user');
    }

    await this.userSessionsService.revoke(sessionId);

    // Audit log
    const user = await this.usersService.findById(userId);
    if (user) {
      this.logger.log(`User revoked session: ${user.email} (session: ${sessionId})`);
    }
  }

  private getSessionStatus(session: any): 'ACTIVE' | 'EXPIRED' | 'REVOKED' {
    if (session.isRevoked || session.status === 'REVOKED') {
      return 'REVOKED';
    }
    if (new Date(session.expiresAt) < new Date()) {
      return 'EXPIRED';
    }
    return 'ACTIVE';
  }

  private getDeviceDescription(session: any): string {
    const browser = session.browser || 'Unknown Browser';
    const os = session.operatingSystem || 'Unknown OS';
    return `${browser} on ${os}`;
  }

  async generateTokens(userId: string, email: string, role: string, sessionId?: string): Promise<Tokens> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      sessionId: sessionId || '',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshPayload: JwtRefreshPayload = {
      sub: userId,
      sessionId: sessionId || '',
      tokenId: this.generateTokenId(),
      type: 'refresh',
      email,
      role,
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessTokenExpiration(),
    };
  }

  private getAccessTokenExpiration(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 15 minutes default

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * multipliers[unit];
  }

  private getRefreshTokenExpiration(): number {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 604800; // 7 days default

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * multipliers[unit] * 1000; // Convert to milliseconds
  }

  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) return;

    const maxAttempts = parseInt(this.configService.get<string>('auth.maxLoginAttempts', '5'), 10);
    const lockoutDuration = parseInt(this.configService.get<string>('auth.lockoutDuration', '30'), 10);

    const newFailedAttempts = user.failedLoginAttempts + 1;

    if (newFailedAttempts >= maxAttempts) {
      await this.usersService.update(userId, {
        failedLoginAttempts: newFailedAttempts,
        lockedUntil: new Date(Date.now() + lockoutDuration * 60 * 1000),
      });
    } else {
      await this.usersService.update(userId, {
        failedLoginAttempts: newFailedAttempts,
      });
    }
  }

  async initiatePasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Delete any existing unused tokens
    await this.passwordResetTokensService.deleteUnusedByUserId(user.id);

    // Generate reset token
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.passwordResetTokensService.create({
      userId: user.id,
      token,
      expiresAt,
    });

    // Audit log
    this.logger.log(`Password reset initiated for user: ${user.email}`);

    // Send password reset email
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    await this.emailService.sendPasswordResetEmail(user.email, token, userName);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.passwordResetTokensService.findByToken(token);

    if (!resetToken) {
      this.logger.warn(`Failed password reset attempt: invalid token`);
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date(resetToken.expiresAt) < new Date()) {
      this.logger.warn(`Failed password reset attempt: expired token`);
      throw new BadRequestException('Token has expired');
    }

    if (resetToken.usedAt) {
      this.logger.warn(`Failed password reset attempt: token already used`);
      throw new BadRequestException('Token has already been used');
    }

    const user = await this.usersService.findById(resetToken.userId);

    if (!user) {
      this.logger.warn(`Failed password reset attempt: user not found`);
      throw new BadRequestException('User not found');
    }

    // Validate new password
    const passwordValidation = PasswordValidator.validate(newPassword);
    if (!passwordValidation.isValid) {
      this.logger.warn(`Failed password reset attempt for user: ${user.email} (weak password)`);
      throw new BadRequestException({
        message: 'Password validation failed',
        errors: passwordValidation.errors,
        strength: passwordValidation.strength,
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      this.logger.warn(`Failed password reset attempt for user: ${user.email} (same as old password)`);
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.usersService.update(user.id, {
      passwordHash,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    // Mark token as used
    await this.passwordResetTokensService.markAsUsed(resetToken.id);

    // Revoke all sessions
    await this.userSessionsService.revokeAllForUser(user.id);

    // Audit log
    this.logger.log(`Password reset successfully for user: ${user.email}`);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      this.logger.warn(`Failed password change attempt for user: ${user.email} (invalid old password)`);
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = PasswordValidator.validate(newPassword);
    if (!passwordValidation.isValid) {
      this.logger.warn(`Failed password change attempt for user: ${user.email} (weak password)`);
      throw new BadRequestException({
        message: 'Password validation failed',
        errors: passwordValidation.errors,
        strength: passwordValidation.strength,
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      this.logger.warn(`Failed password change attempt for user: ${user.email} (same as old password)`);
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.usersService.update(userId, {
      passwordHash,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    // Revoke all sessions (force re-login on all devices)
    await this.userSessionsService.revokeAllForUser(userId);

    // Audit log
    this.logger.log(`Password changed successfully for user: ${user.email}`);

    // Send password changed notification email
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    await this.emailService.sendPasswordChangedEmail(user.email, userName);
  }

  async validatePasswordStrength(password: string): Promise<{
    isValid: boolean;
    strength: 'weak' | 'fair' | 'good' | 'strong';
    errors: string[];
    score: number;
    requirements: string[];
  }> {
    const validation = PasswordValidator.validate(password);
    return {
      ...validation,
      requirements: PasswordValidator.getPasswordRequirements(),
    };
  }

  async initiateEmailVerification(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Delete any existing unused tokens
    await this.emailVerificationTokensService.deleteUnusedByUserId(userId);

    // Generate verification token
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await this.emailVerificationTokensService.create({
      userId,
      token,
      expiresAt,
    });

    // TODO: Send email with verification link
    console.log(`Email verification token for ${user.email}: ${token}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await this.emailVerificationTokensService.findByToken(token);

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (new Date(verificationToken.expiresAt) < new Date()) {
      throw new BadRequestException('Token has expired');
    }

    if (verificationToken.verifiedAt) {
      throw new BadRequestException('Token has already been used');
    }

    const user = await this.usersService.findById(verificationToken.userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Mark email as verified
    await this.usersService.update(user.id, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    // Mark token as verified
    await this.emailVerificationTokensService.markAsVerified(verificationToken.id);
  }

  private generateSecureToken(): string {
    // Generate a cryptographically secure random token
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  private generateTokenId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
  }
}
