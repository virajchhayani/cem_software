import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../src/authorization/guards/roles.guard';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true if no roles are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const context = createMockExecutionContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.ADMIN });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has one of multiple required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.OWNER]);
      const context = createMockExecutionContext({ role: UserRole.ADMIN });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.VIEWER });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should throw ForbiddenException if user not authenticated', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  function createMockExecutionContext(user: any = { role: UserRole.ADMIN }) {
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
