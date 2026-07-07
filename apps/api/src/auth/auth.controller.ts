import { Controller, Post, Body, Get, Delete, Param, UseGuards, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentUserData } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { getCookieOptions } from './config/cookie.config';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password. Returns JWT tokens and sets HTTP-only cookies.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
    headers: {
      'Set-Cookie': {
        description: 'HTTP-only cookies for access_token, refresh_token, and session_id',
        schema: {
          type: 'string',
          example: 'access_token=xxx; refresh_token=xxx; session_id=xxx; HttpOnly; Secure; SameSite=Strict',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts - account locked',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 429 },
        message: { type: 'string', example: 'Account is temporarily locked due to too many failed attempts' },
        error: { type: 'string', example: 'Too Many Requests' },
      },
    },
  })
  async login(@Body() loginDto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const deviceInfo = {
      deviceName: loginDto.deviceName || 'Unknown Device',
      deviceType: loginDto.deviceType as any || 'UNKNOWN',
      browser: loginDto.browser || this.extractBrowser(req.headers['user-agent']),
      operatingSystem: loginDto.operatingSystem || this.extractOS(req.headers['user-agent']),
      ipAddress: loginDto.ipAddress || this.extractIp(req),
      userAgent: req.headers['user-agent'] || '',
      country: loginDto.country,
      city: loginDto.city,
    };

    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
      deviceInfo,
    );

    // Set cookies
    res.cookie('access_token', result.tokens.accessToken, getCookieOptions('accessToken'));
    res.cookie('refresh_token', result.tokens.refreshToken, getCookieOptions('refreshToken'));
    res.cookie('session_id', result.user.id, getCookieOptions('session'));

    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Refresh access token using refresh token. Returns new tokens with rotation.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid refresh token' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async refresh(@CurrentUser() user: CurrentUserData, @Req() req: any) {
    const refreshToken = req.headers.authorization?.replace('Bearer ', '');
    return this.authService.refreshTokens(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Logout current session',
    description: 'Logout from current session. Clears HTTP-only cookies and revokes session.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async logout(@CurrentUser() user: CurrentUserData, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id, user.sessionId);

    // Clear cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    res.clearCookie('session_id', { path: '/' });

    return { message: 'Logout successful' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Logout all sessions',
    description: 'Logout from all sessions across all devices. Clears cookies and revokes all sessions.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'All sessions logged out successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async logoutAll(@CurrentUser() user: CurrentUserData, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(user.id);

    // Clear cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    res.clearCookie('session_id', { path: '/' });

    return { message: 'All sessions logged out successfully' };
  }

  @Public()
  @Post('password-reset/initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initiate password reset',
    description: 'Send password reset email to user. Does not reveal if email exists.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
    type: MessageResponseDto,
  })
  async initiatePasswordReset(@Body() dto: ForgotPasswordDto) {
    await this.authService.initiatePasswordReset(dto.email);
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Reset password using token received in email. Token is single-use and expires in 1 hour.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid or expired reset token' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      return { message: 'Passwords do not match' };
    }
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset successfully' };
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Change password',
    description: 'Change user password. Requires old password for verification. Revokes all sessions.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid old password or weak new password',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Current password is incorrect' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async changePassword(@CurrentUser() user: CurrentUserData, @Body() dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      return { message: 'Passwords do not match' };
    }
    await this.authService.changePassword(user.id, dto.oldPassword, dto.newPassword);
    return { message: 'Password has been been changed successfully' };
  }

  @Post('password/validate')
  @HttpCode(HttpStatus.OK)
  async validatePasswordStrength(@Body() dto: { password: string }) {
    return this.authService.validatePasswordStrength(dto.password);
  }

  @Post('email-verification/initiate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async initiateEmailVerification(@CurrentUser() user: CurrentUserData) {
    await this.authService.initiateEmailVerification(user.id);
    return { message: 'If the email exists, a verification link has been sent' };
  }

  @Public()
  @Post('email-verification/confirm')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: { token: string }) {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email has been verified successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Get authenticated user information including current session.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async getCurrentUser(@CurrentUser() user: CurrentUserData) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      sessionId: user.sessionId,
    };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get all user sessions',
    description: 'Get all active and inactive sessions for the authenticated user.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    type: [SessionResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async getSessions(@CurrentUser() user: CurrentUserData): Promise<SessionResponseDto[]> {
    return this.authService.getSessions(user.id);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Revoke specific session',
    description: 'Revoke a specific session by ID. Cannot revoke current session.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    description: 'Session ID to revoke',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Session not found or does not belong to user',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Session not found' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async deleteSession(@CurrentUser() user: CurrentUserData, @Param('id') sessionId: string) {
    await this.authService.deleteSession(user.id, sessionId);
    return { message: 'Session revoked successfully' };
  }

  private extractIp(req: any): string {
    return req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
      '0.0.0.0';
  }

  private extractBrowser(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private extractOS(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'MacOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }
}
