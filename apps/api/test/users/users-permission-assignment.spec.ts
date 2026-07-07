import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../../src/users/users.service';
import { PrismaService } from '../../src/database/prisma.service';
import { UserRole, ActivityAction } from '@prisma/client';

describe('UsersService - Permission Assignment', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    permission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userPermission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    audit: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getUserPermissions', () => {
    it('should return user permissions', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const mockPermissions = [
        {
          id: 'up1',
          userId: '1',
          permissionId: 'p1',
          grantedAt: new Date(),
          expiresAt: null,
          permission: {
            id: 'p1',
            name: 'View Users',
            code: 'users.view',
            type: 'READ',
            category: 'users',
          },
        },
      ];
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userPermission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getUserPermissions('1');

      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        permissions: [
          {
            id: 'p1',
            name: 'View Users',
            code: 'users.view',
            type: 'READ',
            category: 'users',
            grantedAt: mockPermissions[0].grantedAt,
            expiresAt: null,
          },
        ],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserPermissions('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('grantPermission', () => {
    it('should grant permission to user', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const mockPermission = { id: 'p1', name: 'View Users', code: 'users.view' };
      const mockUserPermission = {
        id: 'up1',
        userId: '1',
        permissionId: 'p1',
        grantedAt: new Date(),
        permission: mockPermission,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.userPermission.findUnique.mockResolvedValue(null);
      mockPrismaService.userPermission.create.mockResolvedValue(mockUserPermission);
      mockPrismaService.audit.create.mockResolvedValue({});

      const result = await service.grantPermission('1', 'p1', undefined, 'admin-id');

      expect(result).toEqual(mockUserPermission);
      expect(prisma.userPermission.create).toHaveBeenCalledWith({
        data: {
          userId: '1',
          permissionId: 'p1',
          grantedBy: 'admin-id',
          expiresAt: undefined,
        },
        include: { permission: true },
      });
    });

    it('should throw ConflictException when user already has permission', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const mockPermission = { id: 'p1', name: 'View Users', code: 'users.view' };
      const mockExisting = { id: 'up1', userId: '1', permissionId: 'p1' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.userPermission.findUnique.mockResolvedValue(mockExisting);

      await expect(service.grantPermission('1', 'p1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when permission not found', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.grantPermission('1', 'p1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokePermission', () => {
    it('should revoke permission from user', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const mockPermission = { id: 'p1', name: 'View Users', code: 'users.view' };
      const mockExisting = { id: 'up1', userId: '1', permissionId: 'p1' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.userPermission.findUnique.mockResolvedValue(mockExisting);
      mockPrismaService.userPermission.delete.mockResolvedValue(mockExisting);
      mockPrismaService.audit.create.mockResolvedValue({});

      const result = await service.revokePermission('1', 'p1', 'admin-id');

      expect(result).toEqual(mockExisting);
      expect(prisma.userPermission.delete).toHaveBeenCalledWith({
        where: {
          userId_permissionId: {
            userId: '1',
            permissionId: 'p1',
          },
        },
      });
    });

    it('should throw BadRequestException when user does not have permission', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const mockPermission = { id: 'p1', name: 'View Users', code: 'users.view' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.userPermission.findUnique.mockResolvedValue(null);

      await expect(service.revokePermission('1', 'p1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkGrantPermissions', () => {
    it('should grant multiple permissions to user', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const permissions = [
        { permissionId: 'p1' },
        { permissionId: 'p2' },
      ];
      const mockPermissions = [
        { id: 'p1', name: 'View Users', code: 'users.view' },
        { id: 'p2', name: 'Create Users', code: 'users.create' },
      ];
      const mockUserPermissions = [
        {
          id: 'up1',
          userId: '1',
          permissionId: 'p1',
          permission: mockPermissions[0],
        },
        {
          id: 'up2',
          userId: '1',
          permissionId: 'p2',
          permission: mockPermissions[1],
        },
      ];
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.userPermission.findMany.mockResolvedValue([]);
      mockPrismaService.userPermission.create
        .mockResolvedValueOnce(mockUserPermissions[0])
        .mockResolvedValueOnce(mockUserPermissions[1]);
      mockPrismaService.audit.create.mockResolvedValue({});

      const result = await service.bulkGrantPermissions('1', permissions, 'admin-id');

      expect(result).toHaveLength(2);
    });

    it('should throw BadRequestException for duplicate permissions in request', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const permissions = [
        { permissionId: 'p1' },
        { permissionId: 'p1' },
      ];
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.bulkGrantPermissions('1', permissions)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when user already has some permissions', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const permissions = [
        { permissionId: 'p1' },
        { permissionId: 'p2' },
      ];
      const mockPermissions = [
        { id: 'p1', name: 'View Users', code: 'users.view' },
        { id: 'p2', name: 'Create Users', code: 'users.create' },
      ];
      const mockExisting = [{ id: 'up1', userId: '1', permissionId: 'p1' }];
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.userPermission.findMany.mockResolvedValue(mockExisting);

      await expect(service.bulkGrantPermissions('1', permissions)).rejects.toThrow(ConflictException);
    });
  });
});
