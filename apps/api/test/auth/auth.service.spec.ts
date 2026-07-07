import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../src/users/users.service';
import { UserSessionsService } from '../../src/users/user-sessions.service';
import { LoginAttemptsService } from '../../src/users/login-attempts.service';
import { EmailVerificationTokensService } from '../../src/users/email-verification-tokens.service';
import { PasswordResetTokensService } from '../../src/users/password-reset-tokens.service';
import { AuthorizationService } from '../../src/auth/services/authorization.service';
import { EmailService } from '../../src/auth/services/email.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let userSessionsService: UserSessionsService;
  let loginAttemptsService: LoginAttemptsService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: bcrypt.hashSync('Password123!', 12),
    firstName: 'John',
    lastName: 'Doe',
    role: 'EMPLOYEE',
    isActive: true,
    isEmailVerified: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockUserSessionsService = {
    create: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
    markOthersAsNotCurrent: jest.fn(),
    findByUserId: jest.fn(),
    cleanupExpiredSessions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockLoginAttemptsService = {
    create: jest.fn(),
  };

  const mockEmailVerificationTokensService = {
    create: jest.fn(),
    deleteUnusedByUserId: jest.fn(),
    findByToken: jest.fn(),
    markAsVerified: jest.fn(),
  };

  const mockPasswordResetTokensService = {
    create: jest.fn(),
    findByToken: jest.fn(),
    markAsUsed: jest.fn(),
    deleteUnusedByUserId: jest.fn(),
  };

  const mockAuthorizationService = {
    getUserPermissions: jest.fn(),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
    sendEmailVerificationEmail: jest.fn(),
    sendPasswordChangedEmail: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'auth.maxLoginAttempts': '5',
        'auth.lockoutDuration': '30',
        'JWT_SECRET': 'test-secret',
        'JWT_REFRESH_SECRET': 'test-refresh-secret',
        'JWT_EXPIRES_IN': '15m',
        'JWT_REFRESH_EXPIRES_IN': '7d',
        'SESSION_TIMEOUT': '3600000',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: UserSessionsService,
          useValue: mockUserSessionsService,
        },
        {
          provide: LoginAttemptsService,
          useValue: mockLoginAttemptsService,
        },
        {
          provide: EmailVerificationTokensService,
          useValue: mockEmailVerificationTokensService,
        },
        {
          provide: PasswordResetTokensService,
          useValue: mockPasswordResetTokensService,
        },
        {
          provide: AuthorizationService,
          useValue: mockAuthorizationService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    userSessionsService = module.get<UserSessionsService>(UserSessionsService);
    loginAttemptsService = module.get<LoginAttemptsService>(LoginAttemptsService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'Password123!');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'Password123!');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'WrongPassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('access-token');
      mockUserSessionsService.create.mockResolvedValue({ id: 'session-1' });
      mockAuthorizationService.getUserPermissions.mockResolvedValue([]);
      mockUserSessionsService.markOthersAsNotCurrent.mockResolvedValue(undefined);

      const result = await service.login('test@example.com', 'Password123!', {
        deviceName: 'Test Device',
        deviceType: 'DESKTOP',
        browser: 'Chrome',
        operatingSystem: 'Windows',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe('test@example.com');
      expect(mockUserSessionsService.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('test@example.com', 'WrongPassword', {
          deviceName: 'Test Device',
          deviceType: 'DESKTOP',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 3600000),
      };
      mockUsersService.findByEmail.mockResolvedValue(lockedUser);

      await expect(
        service.login('test@example.com', 'Password123!', {
          deviceName: 'Test Device',
          deviceType: 'DESKTOP',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive account', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);

      await expect(
        service.login('test@example.com', 'Password123!', {
          deviceName: 'Test Device',
          deviceType: 'DESKTOP',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockUserSessionsService.revoke.mockResolvedValue(undefined);
      mockUsersService.findById.mockResolvedValue(mockUser);

      await service.logout('user-1', 'session-1');

      expect(mockUserSessionsService.revoke).toHaveBeenCalledWith('session-1');
    });
  });

  describe('logoutAll', () => {
    it('should logout from all sessions', async () => {
      mockUserSessionsService.revokeAllForUser.mockResolvedValue(undefined);
      mockUsersService.findById.mockResolvedValue(mockUser);

      await service.logoutAll('user-1');

      expect(mockUserSessionsService.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const mockPayload = {
        sub: 'user-1',
        sessionId: 'session-1',
        type: 'refresh',
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUserSessionsService.findById.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivity: new Date(),
      });
      mockJwtService.signAsync.mockResolvedValue('new-access-token');
      mockUserSessionsService.update.mockResolvedValue(undefined);

      const result = await service.refreshTokens('refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUserSessionsService.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for revoked session', async () => {
      const mockPayload = {
        sub: 'user-1',
        sessionId: 'session-1',
        type: 'refresh',
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUserSessionsService.findById.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 3600000),
      });

      await expect(service.refreshTokens('refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUserSessionsService.revokeAllForUser.mockResolvedValue(undefined);
      mockUsersService.update.mockResolvedValue(undefined);
      mockEmailService.sendPasswordChangedEmail.mockResolvedValue(undefined);

      await service.changePassword('user-1', 'Password123!', 'MyStr0ng!P@ssw0rd#2024');

      expect(mockUsersService.update).toHaveBeenCalledWith('user-1', {
        passwordHash: expect.any(String),
        passwordChangedAt: expect.any(Date),
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      expect(mockUserSessionsService.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });

    it('should throw BadRequestException for invalid old password', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user-1', 'WrongPassword123!', 'MyStr0ng!P@ssw0rd#2024'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for weak new password', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user-1', 'Password123!', 'weak'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('initiatePasswordReset', () => {
    it('should initiate password reset successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetTokensService.deleteUnusedByUserId.mockResolvedValue(undefined);
      mockPasswordResetTokensService.create.mockResolvedValue(undefined);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.initiatePasswordReset('test@example.com');

      expect(mockPasswordResetTokensService.create).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should not reveal if email does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await service.initiatePasswordReset('nonexistent@example.com');

      expect(mockPasswordResetTokensService.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockResetToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'reset-token',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      };
      mockPasswordResetTokensService.findByToken.mockResolvedValue(mockResetToken);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUserSessionsService.revokeAllForUser.mockResolvedValue(undefined);
      mockUsersService.update.mockResolvedValue(undefined);
      mockPasswordResetTokensService.markAsUsed.mockResolvedValue(undefined);

      await service.resetPassword('reset-token', 'MyStr0ng!P@ssw0rd#2024');

      expect(mockUsersService.update).toHaveBeenCalledWith('user-1', {
        passwordHash: expect.any(String),
        passwordChangedAt: expect.any(Date),
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      expect(mockPasswordResetTokensService.markAsUsed).toHaveBeenCalledWith('token-1');
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPasswordResetTokensService.findByToken.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPassword456!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const expiredToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'reset-token',
        expiresAt: new Date(Date.now() - 3600000),
        usedAt: null,
      };
      mockPasswordResetTokensService.findByToken.mockResolvedValue(expiredToken);

      await expect(
        service.resetPassword('expired-token', 'NewPassword456!'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSessions', () => {
    it('should return user sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          deviceName: 'Device 1',
          deviceType: 'DESKTOP',
          browser: 'Chrome',
          operatingSystem: 'Windows',
          ipAddress: '192.168.1.1',
          loginTime: new Date(),
          lastActivity: new Date(),
          isCurrent: true,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 3600000),
        },
      ];
      mockUserSessionsService.findByUserId.mockResolvedValue(mockSessions);
      mockUserSessionsService.cleanupExpiredSessions.mockResolvedValue(undefined);

      const result = await service.getSessions('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('deviceName');
    });
  });

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
      };
      mockUserSessionsService.findById.mockResolvedValue(mockSession);
      mockUserSessionsService.revoke.mockResolvedValue(undefined);
      mockUsersService.findById.mockResolvedValue(mockUser);

      await service.deleteSession('user-1', 'session-1');

      expect(mockUserSessionsService.revoke).toHaveBeenCalledWith('session-1');
    });

    it('should throw BadRequestException if session not found', async () => {
      mockUserSessionsService.findById.mockResolvedValue(null);

      await expect(service.deleteSession('user-1', 'session-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if session does not belong to user', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-2',
      };
      mockUserSessionsService.findById.mockResolvedValue(mockSession);

      await expect(service.deleteSession('user-1', 'session-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
