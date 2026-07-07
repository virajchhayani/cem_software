import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../../../src/authorization/guards/permissions.guard';
import { AuthorizationService } from '../../../src/authorization/services/authorization.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let authorizationService: AuthorizationService;
  let reflector: Reflector;

  const mockAuthorizationService = {
    hasAnyPermission: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: AuthorizationService,
          useValue: mockAuthorizationService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    authorizationService = module.get<AuthorizationService>(AuthorizationService);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true if no permissions are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has required permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.read']);
      mockAuthorizationService.hasAnyPermission.mockResolvedValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuthorizationService.hasAnyPermission).toHaveBeenCalledWith('1', ['users.read']);
    });

    it('should return true if user has one of multiple required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.read', 'users.write']);
      mockAuthorizationService.hasAnyPermission.mockResolvedValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user lacks permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.read']);
      mockAuthorizationService.hasAnyPermission.mockResolvedValue(false);
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.read']);
      const context = createMockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  function createMockExecutionContext(user: any = { id: '1' }) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  }
});
