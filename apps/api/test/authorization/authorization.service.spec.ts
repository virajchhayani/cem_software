import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuthorizationService } from '../../src/authorization/services/authorization.service';
import { RolesRepository } from '../../src/roles/repositories/roles.repository';
import { PermissionsRepository } from '../../src/permissions/repositories/permissions.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { Cache } from 'cache-manager';
import { UserRole } from '@prisma/client';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let prismaService: PrismaService;
  let permissionsRepository: PermissionsRepository;
  let cacheManager: Cache;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockPermissionsRepository = {
    findByRole: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RolesRepository,
          useValue: {},
        },
        {
          provide: PermissionsRepository,
          useValue: mockPermissionsRepository,
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    prismaService = module.get<PrismaService>(PrismaService);
    permissionsRepository = module.get<PermissionsRepository>(PermissionsRepository);
    cacheManager = module.get<Cache>('CACHE_MANAGER');

    jest.clearAllMocks();
  });

  describe('hasRole', () => {
    it('should return true if user has the role', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.hasRole('1', UserRole.ADMIN);

      expect(result).toBe(true);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: { id: true, email: true, role: true },
      });
    });

    it('should return false if user does not have the role', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.VIEWER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.hasRole('1', UserRole.ADMIN);

      expect(result).toBe(false);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockCacheManager.get.mockResolvedValue(null);

      await expect(service.hasRole('1', UserRole.ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('should use cached user if available', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      mockCacheManager.get.mockResolvedValue(mockUser);

      const result = await service.hasRole('1', UserRole.ADMIN);

      expect(result).toBe(true);
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has the permission', async () => {
      const mockPermissions = [
        { id: 'p1', code: 'users.read', name: 'Read Users' },
      ];
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        role: UserRole.ADMIN,
        permissions: [],
      });
      mockPermissionsRepository.findByRole.mockResolvedValue([]);

      jest.spyOn(service as any, 'getUserPermissionsWithCache').mockResolvedValue(mockPermissions);

      const result = await service.hasPermission('1', 'users.read');

      expect(result).toBe(true);
    });

    it('should return false if user does not have the permission', async () => {
      const mockPermissions = [
        { id: 'p1', code: 'users.write', name: 'Write Users' },
      ];
      jest.spyOn(service as any, 'getUserPermissionsWithCache').mockResolvedValue(mockPermissions);

      const result = await service.hasPermission('1', 'users.read');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the permissions', async () => {
      const mockPermissions = [
        { id: 'p1', code: 'users.read', name: 'Read Users' },
      ];
      jest.spyOn(service as any, 'getUserPermissionsWithCache').mockResolvedValue(mockPermissions);

      const result = await service.hasAnyPermission('1', ['users.read', 'users.write']);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', async () => {
      const mockPermissions: any[] = [];
      jest.spyOn(service as any, 'getUserPermissionsWithCache').mockResolvedValue(mockPermissions);

      const result = await service.hasAnyPermission('1', ['users.read', 'users.write']);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', async () => {
      const mockPermissions = [
        { id: 'p1', code: 'users.read', name: 'Read Users' },
        { id: 'p2', code: 'users.write', name: 'Write Users' },
      ];
      jest.spyOn(service as any, 'getUserPermissionsWithCache').mockResolvedValue(mockPermissions);

      const result = await service.hasAllPermissions('1', ['users.read', 'users.write']);

      expect(result).toBe(true);
    });

    it('should return false if user is missing any permission', async () => {
      const mockPermissions = [
        { id: 'p1', code: 'users.read', name: 'Read Users' },
      ];
      jest.spyOn(service as any, 'getUserPermissionsWithCache').mockResolvedValue(mockPermissions);

      const result = await service.hasAllPermissions('1', ['users.read', 'users.write']);

      expect(result).toBe(false);
    });
  });

  describe('isOwner', () => {
    it('should return true if user is owner', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.OWNER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.isOwner('1');

      expect(result).toBe(true);
    });

    it('should return false if user is not owner', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.isOwner('1');

      expect(result).toBe(false);
    });
  });

  describe('canAccess', () => {
    it('should check permission for resource and action', async () => {
      jest.spyOn(service, 'hasPermission').mockResolvedValue(true);

      const result = await service.canAccess('1', 'users', 'read');

      expect(result).toBe(true);
      expect(service.hasPermission).toHaveBeenCalledWith('1', 'users.read');
    });
  });

  describe('canApprove', () => {
    it('should check approve permission for resource', async () => {
      jest.spyOn(service, 'hasPermission').mockResolvedValue(true);

      const result = await service.canApprove('1', 'users');

      expect(result).toBe(true);
      expect(service.hasPermission).toHaveBeenCalledWith('1', 'users.approve');
    });
  });

  describe('canDelete', () => {
    it('should return true if user is owner', async () => {
      jest.spyOn(service, 'isOwner').mockResolvedValue(true);

      const result = await service.canDelete('1', 'users');

      expect(result).toBe(true);
      expect(service.isOwner).toHaveBeenCalledWith('1');
    });

    it('should check delete permission if not owner', async () => {
      jest.spyOn(service, 'isOwner').mockResolvedValue(false);
      jest.spyOn(service, 'hasPermission').mockResolvedValue(true);

      const result = await service.canDelete('1', 'users');

      expect(result).toBe(true);
      expect(service.hasPermission).toHaveBeenCalledWith('1', 'users.delete');
    });
  });

  describe('clearUserCache', () => {
    it('should clear user and permissions cache', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.clearUserCache('1');

      expect(mockCacheManager.del).toHaveBeenCalledWith('user:1');
      expect(mockCacheManager.del).toHaveBeenCalledWith('user_permissions:1');
    });
  });
});
