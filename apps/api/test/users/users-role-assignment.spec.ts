import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../../src/users/users.service';
import { PrismaService } from '../../src/database/prisma.service';
import { UserRole, ActivityAction } from '@prisma/client';

describe('UsersService - Role Assignment', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    roleHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
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

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserRoles('1');

      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserRoles('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.VIEWER };
      const mockUpdatedUser = { ...mockUser, role: UserRole.ADMIN };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);
      mockPrismaService.roleHistory.create.mockResolvedValue({});
      mockPrismaService.audit.create.mockResolvedValue({});

      const result = await service.assignRole('1', UserRole.ADMIN, 'admin-id');

      expect(result).toEqual(mockUpdatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { role: UserRole.ADMIN },
      });
    });

    it('should throw ConflictException when user already has this role', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.assignRole('1', UserRole.ADMIN)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when trying to assign OWNER to multiple users', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const mockExistingOwner = { id: '2', role: UserRole.OWNER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(mockExistingOwner);

      await expect(service.assignRole('1', UserRole.OWNER)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to remove OWNER from only owner', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.OWNER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.count.mockResolvedValue(1);

      await expect(service.assignRole('1', UserRole.ADMIN)).rejects.toThrow(BadRequestException);
    });
  });

  describe('replaceRole', () => {
    it('should replace user role', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.VIEWER };
      const mockUpdatedUser = { ...mockUser, role: UserRole.ADMIN };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);
      mockPrismaService.roleHistory.create.mockResolvedValue({});
      mockPrismaService.audit.create.mockResolvedValue({});

      const result = await service.replaceRole('1', UserRole.ADMIN, 'Promotion', 'admin-id');

      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw BadRequestException when trying to assign OWNER to multiple users', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const mockExistingOwner = { id: '2', role: UserRole.OWNER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(mockExistingOwner);

      await expect(service.replaceRole('1', UserRole.OWNER)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeRole', () => {
    it('should remove user role and set to VIEWER', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const mockUpdatedUser = { ...mockUser, role: UserRole.VIEWER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);
      mockPrismaService.roleHistory.create.mockResolvedValue({});
      mockPrismaService.audit.create.mockResolvedValue({});

      const result = await service.removeRole('1', UserRole.ADMIN, 'admin-id');

      expect(result).toEqual(mockUpdatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { role: UserRole.VIEWER },
      });
    });

    it('should throw BadRequestException when user does not have this role', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.VIEWER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.removeRole('1', UserRole.ADMIN)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to remove OWNER from only owner', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.OWNER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.count.mockResolvedValue(1);

      await expect(service.removeRole('1', UserRole.OWNER)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRoleHistory', () => {
    it('should return role history for user', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: UserRole.ADMIN };
      const mockHistory = [
        {
          id: '1',
          userId: '1',
          previousRole: UserRole.VIEWER,
          newRole: UserRole.ADMIN,
          changedBy: 'admin-id',
          changeReason: 'Role assignment',
          createdAt: new Date(),
        },
      ];
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.roleHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getRoleHistory('1');

      expect(result).toEqual(mockHistory);
      expect(prisma.roleHistory.findMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getRoleHistory('1')).rejects.toThrow(NotFoundException);
    });
  });
});
