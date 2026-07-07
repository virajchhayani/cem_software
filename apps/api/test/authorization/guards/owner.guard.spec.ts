import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnerGuard } from '../../../src/authorization/guards/owner.guard';
import { AuthorizationService } from '../../../src/authorization/services/authorization.service';

describe('OwnerGuard', () => {
  let guard: OwnerGuard;
  let authorizationService: AuthorizationService;
  let reflector: Reflector;

  const mockAuthorizationService = {
    isOwner: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerGuard,
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

    guard = module.get<OwnerGuard>(OwnerGuard);
    authorizationService = module.get<AuthorizationService>(AuthorizationService);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true if owner check is not required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user is owner', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockAuthorizationService.isOwner.mockResolvedValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuthorizationService.isOwner).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockAuthorizationService.isOwner.mockResolvedValue(false);
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
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
