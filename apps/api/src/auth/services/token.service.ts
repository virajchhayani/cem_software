import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { JwtPayload, JwtRefreshPayload } from '../interfaces/jwt-payload.interface';
import { Tokens } from '../interfaces/tokens.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate access token
   * @param userId User ID
   * @param email User email
   * @param role User role
   * @param sessionId Session ID
   * @returns Access token
   */
  async generateAccessToken(
    userId: string,
    email: string,
    role: string,
    sessionId: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      sessionId,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });
  }

  /**
   * Generate refresh token
   * @param userId User ID
   * @param email User email
   * @param role User role
   * @param sessionId Session ID
   * @returns Refresh token
   */
  async generateRefreshToken(
    userId: string,
    email: string,
    role: string,
    sessionId: string,
  ): Promise<string> {
    const tokenId = this.generateTokenId();
    const payload: JwtRefreshPayload = {
      sub: userId,
      sessionId,
      tokenId,
      type: 'refresh',
      email,
      role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
  }

  /**
   * Generate both access and refresh tokens
   * @param userId User ID
   * @param email User email
   * @param role User role
   * @param sessionId Session ID
   * @returns Tokens object
   */
  async generateTokens(
    userId: string,
    email: string,
    role: string,
    sessionId: string,
  ): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role, sessionId),
      this.generateRefreshToken(userId, email, role, sessionId),
    ]);

    const expiresIn = this.getTokenExpiration('access');

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify access token
   * @param token Access token
   * @returns Decoded payload
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Verify refresh token
   * @param token Refresh token
   * @returns Decoded payload
   */
  async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  /**
   * Decode token without verification
   * @param token JWT token
   * @returns Decoded payload
   */
  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  /**
   * Get token expiration time in milliseconds
   * @param type Token type (access or refresh)
   * @returns Expiration time in milliseconds
   */
  getTokenExpiration(type: 'access' | 'refresh'): number {
    const expiresIn = type === 'access'
      ? this.configService.get<string>('JWT_EXPIRES_IN', '15m')
      : this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    return this.parseTimeToMilliseconds(expiresIn);
  }

  /**
   * Hash refresh token for storage
   * @param token Refresh token
   * @returns Hashed token
   */
  async hashRefreshToken(token: string): Promise<string> {
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    return bcrypt.hash(token, saltRounds);
  }

  /**
   * Compare refresh token with hash
   * @param token Refresh token
   * @param hash Hashed token
   * @returns True if match
   */
  async compareRefreshToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }

  /**
   * Generate secure token ID
   * @returns Random token ID
   */
  private generateTokenId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Parse time string to milliseconds
   * @param time Time string (e.g., '15m', '7d', '1h')
   * @returns Milliseconds
   */
  private parseTimeToMilliseconds(time: string): number {
    const match = time.match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  /**
   * Rotate refresh token
   * @param oldRefreshToken Old refresh token
   * @param userId User ID
   * @param email User email
   * @param role User role
   * @param sessionId Session ID
   * @returns New tokens
   */
  async rotateRefreshToken(
    oldRefreshToken: string,
    userId: string,
    email: string,
    role: string,
    sessionId: string,
  ): Promise<Tokens> {
    // Verify old token
    const payload = await this.verifyRefreshToken(oldRefreshToken);

    if (payload.sub !== userId || payload.sessionId !== sessionId) {
      throw new Error('Invalid token for rotation');
    }

    // Generate new tokens
    return this.generateTokens(userId, email, role, sessionId);
  }

  /**
   * Check if token is expired
   * @param token JWT token
   * @returns True if expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }

  /**
   * Get time until token expiration
   * @param token JWT token
   * @returns Time until expiration in seconds
   */
  getTimeUntilExpiration(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return 0;

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.exp - now);
  }
}
