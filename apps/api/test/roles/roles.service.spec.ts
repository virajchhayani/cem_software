import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RolesService } from '../../src/roles/services/roles.service';
import { RolesRepository } from '../../src/roles/repositories/roles.repository';
import { UserRole } from '@prisma/client';

describe('RolesService', () => {
  let service: RolesService;
  let repository: RolesRepository;

  const mockRolesRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByRole: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByRole: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: RolesRepository, useValue: mockRolesRepository },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    repository = module.get<RolesRepository>(RolesRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated roles', async () => {
      const mockData = [
        { id: '1', role: UserRole.ADMIN, permissionId: 'perm-1' },
      ];
      const mockTotal = 1;
      mockRolesRepository.findAll.mockResolvedValue({ data: mockData, total: mockTotal });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({ data: mockData, total: mockTotal, page: 1, limit: 10 });
      expect(repository.findAll).toHaveBeenCalledWith({ skip: 0, take: 10, where: undefined });
    });

    it('should return search results when search query provided', async () => {
      const mockData = [{ id: '1', role: UserRole.ADMIN, permissionId: 'perm-1' }];
      mockRolesRepository.search.mockResolvedValue(mockData);

      const result = await service.findAll({ search: 'admin' });

      expect(result).toEqual({ data: mockData, total: 1, page: 1, limit: 10 });
      expect(repository.search).toHaveBeenCalledWith('admin');
    });

    it('should filter by role when role query provided', async () => {
      const mockData = [{ id: '1', role: UserRole.ADMIN, permissionId: 'perm-1' }];
      mockRolesRepository.findAll.mockResolvedValue({ data: mockData, total: 1 });

      await service.findAll({ role: UserRole.ADMIN });

      expect(repository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { role: UserRole.ADMIN },
      });
    });
  });

  describe('findById', () => {
    it('should return role by id', async () => {
      const mockRole = { id: '1', role: UserRole.ADMIN, permissionId: 'perm-1' };
      mockRolesRepository.findById.mockResolvedValue(mockRole);

      const result = await service.findById('1');

      expect(result).toEqual(mockRole);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when role not found', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new role permission', async () => {
      const createDto = { role: UserRole.ADMIN, permissionId: 'perm-1' };
      const mockRole = { id: '1', ...createDto };
      mockRolesRepository.findByRole.mockResolvedValue([]);
      mockRolesRepository.create.mockResolvedValue(mockRole);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRole);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ConflictException when role permission already exists', async () => {
      const createDto = { role: UserRole.ADMIN, permissionId: 'perm-1' };
      const mockExisting = [{ id: '1', role: UserRole.ADMIN, permissionId: 'perm-1' }];
      mockRolesRepository.findByRole.mockResolvedValue(mockExisting);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update role permission', async () => {
      const updateDto = { permissionId: 'perm-2' };
      const mockExisting = { id: '1', role: UserRole.ADMIN, permissionId: 'perm-1' };
      const mockUpdated = { ...mockExisting, permissionId: 'perm-2' };
      mockRolesRepository.findById.mockResolvedValue(mockExisting);
      mockRolesRepository.findByRole.mockResolvedValue([mockExisting]);
      mockRolesRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(mockUpdated);
    });

    it('should throw ConflictException when trying to modify protected role', async () => {
      const updateDto = { role: UserRole.OWNER };
      const mockExisting = { id: '1', role: UserRole.OWNER, permissionId: 'perm-1' };
      mockRolesRepository.findById.mockResolvedValue(mockExisting);

      await expect(service.update('1', updateDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when role not found', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(service.update('1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete role permission', async () => {
      const mockRole = { id: '1', role: UserRole.ADMIN, permissionId: 'perm-1' };
      mockRolesRepository.findById.mockResolvedValue(mockRole);
      mockRolesRepository.delete.mockResolvedValue(mockRole);

      const result = await service.delete('1');

      expect(result).toEqual(mockRole);
      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw BadRequestException when trying to delete protected role', async () => {
      const mockRole = { id: '1', role: UserRole.OWNER, permissionId: 'perm-1' };
      mockRolesRepository.findById.mockResolvedValue(mockRole);

      await expect(service.delete('1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when role not found', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(service.delete('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDefaultRoles', () => {
    it('should return default roles', () => {
      const result = service.getDefaultRoles();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain(UserRole.OWNER);
      expect(result).toContain(UserRole.ADMIN);
    });
  });
});
