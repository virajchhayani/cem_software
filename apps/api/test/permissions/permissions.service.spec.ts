import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PermissionsService } from '../../src/permissions/services/permissions.service';
import { PermissionsRepository } from '../../src/permissions/repositories/permissions.repository';
import { PermissionType } from '@prisma/client';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let repository: PermissionsRepository;

  const mockPermissionsRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    findByCategory: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    bulkCreate: jest.fn(),
    bulkUpdate: jest.fn(),
    bulkDelete: jest.fn(),
    findByCodes: jest.fn(),
    findByIds: jest.fn(),
    getCategories: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PermissionsRepository, useValue: mockPermissionsRepository },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    repository = module.get<PermissionsRepository>(PermissionsRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated permissions', async () => {
      const mockData = [
        { id: '1', name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ, category: 'inventory' },
      ];
      const mockTotal = 1;
      mockPermissionsRepository.findAll.mockResolvedValue({ data: mockData, total: mockTotal });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({ data: mockData, total: mockTotal, page: 1, limit: 10 });
      expect(repository.findAll).toHaveBeenCalledWith({ skip: 0, take: 10, where: {} });
    });

    it('should return search results when search query provided', async () => {
      const mockData = [{ id: '1', name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ }];
      mockPermissionsRepository.search.mockResolvedValue(mockData);

      const result = await service.findAll({ search: 'inventory' });

      expect(result).toEqual({ data: mockData, total: 1, page: 1, limit: 10 });
      expect(repository.search).toHaveBeenCalledWith('inventory');
    });

    it('should filter by type when type query provided', async () => {
      const mockData = [{ id: '1', name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ }];
      mockPermissionsRepository.findAll.mockResolvedValue({ data: mockData, total: 1 });

      await service.findAll({ type: PermissionType.READ });

      expect(repository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { type: PermissionType.READ },
      });
    });
  });

  describe('findById', () => {
    it('should return permission by id', async () => {
      const mockPermission = { id: '1', name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ };
      mockPermissionsRepository.findById.mockResolvedValue(mockPermission);

      const result = await service.findById('1');

      expect(result).toEqual(mockPermission);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when permission not found', async () => {
      mockPermissionsRepository.findById.mockResolvedValue(null);

      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new permission', async () => {
      const createDto = { name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ, category: 'inventory' };
      const mockPermission = { id: '1', ...createDto };
      mockPermissionsRepository.findByCode.mockResolvedValue(null);
      mockPermissionsRepository.create.mockResolvedValue(mockPermission);

      const result = await service.create(createDto);

      expect(result).toEqual(mockPermission);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ConflictException when permission code already exists', async () => {
      const createDto = { name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ };
      const mockExisting = { id: '1', ...createDto };
      mockPermissionsRepository.findByCode.mockResolvedValue(mockExisting);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update permission', async () => {
      const updateDto = { name: 'View Inventory Updated' };
      const mockExisting = { id: '1', name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ };
      const mockUpdated = { ...mockExisting, ...updateDto };
      mockPermissionsRepository.findById.mockResolvedValue(mockExisting);
      mockPermissionsRepository.findByCode.mockResolvedValue(null);
      mockPermissionsRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(mockUpdated);
    });

    it('should throw ConflictException when code already exists', async () => {
      const updateDto = { code: 'inventory.view' };
      const mockExisting = { id: '1', name: 'View Inventory', code: 'inventory.old', type: PermissionType.READ };
      const mockDuplicate = { id: '2', name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ };
      mockPermissionsRepository.findById.mockResolvedValue(mockExisting);
      mockPermissionsRepository.findByCode.mockResolvedValue(mockDuplicate);

      await expect(service.update('1', updateDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when permission not found', async () => {
      mockPermissionsRepository.findById.mockResolvedValue(null);

      await expect(service.update('1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete permission', async () => {
      const mockPermission = { id: '1', name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ };
      mockPermissionsRepository.findById.mockResolvedValue(mockPermission);
      mockPermissionsRepository.delete.mockResolvedValue(mockPermission);

      const result = await service.delete('1');

      expect(result).toEqual(mockPermission);
      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when permission not found', async () => {
      mockPermissionsRepository.findById.mockResolvedValue(null);

      await expect(service.delete('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple permissions', async () => {
      const createDtos = [
        { name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ },
        { name: 'Create Inventory', code: 'inventory.create', type: PermissionType.WRITE },
      ];
      mockPermissionsRepository.findByCodes.mockResolvedValue([]);
      mockPermissionsRepository.bulkCreate.mockResolvedValue({ count: 2 });

      const result = await service.bulkCreate(createDtos);

      expect(result).toEqual({ count: 2 });
      expect(repository.bulkCreate).toHaveBeenCalledWith(createDtos);
    });

    it('should throw BadRequestException for duplicate codes in request', async () => {
      const createDtos = [
        { name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ },
        { name: 'View Inventory 2', code: 'inventory.view', type: PermissionType.READ },
      ];

      await expect(service.bulkCreate(createDtos)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when permissions already exist in database', async () => {
      const createDtos = [
        { name: 'View Inventory', code: 'inventory.view', type: PermissionType.READ },
      ];
      const mockExisting = [{ id: '1', code: 'inventory.view' }];
      mockPermissionsRepository.findByCodes.mockResolvedValue(mockExisting);

      await expect(service.bulkCreate(createDtos)).rejects.toThrow(ConflictException);
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple permissions', async () => {
      const updates = [
        { id: '1', name: 'View Inventory Updated' },
        { id: '2', name: 'Create Inventory Updated' },
      ];
      const mockPermissions = [
        { id: '1', name: 'View Inventory', code: 'inventory.view' },
        { id: '2', name: 'Create Inventory', code: 'inventory.create' },
      ];
      mockPermissionsRepository.findByIds.mockResolvedValue(mockPermissions);
      mockPermissionsRepository.bulkUpdate.mockResolvedValue(mockPermissions);

      const result = await service.bulkUpdate(updates);

      expect(result).toEqual(mockPermissions);
    });

    it('should throw BadRequestException when permissions not found', async () => {
      const updates = [{ id: '1', name: 'View Inventory Updated' }];
      mockPermissionsRepository.findByIds.mockResolvedValue([]);

      await expect(service.bulkUpdate(updates)).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple permissions', async () => {
      const ids = ['1', '2'];
      const mockPermissions = [
        { id: '1', name: 'View Inventory' },
        { id: '2', name: 'Create Inventory' },
      ];
      mockPermissionsRepository.findByIds.mockResolvedValue(mockPermissions);
      mockPermissionsRepository.bulkDelete.mockResolvedValue({ count: 2 });

      const result = await service.bulkDelete(ids);

      expect(result).toEqual({ count: 2 });
    });

    it('should throw BadRequestException when permissions not found', async () => {
      const ids = ['1'];
      mockPermissionsRepository.findByIds.mockResolvedValue([]);

      await expect(service.bulkDelete(ids)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const mockCategories = ['inventory', 'sales', 'finance'];
      mockPermissionsRepository.getCategories.mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(result).toEqual(mockCategories);
      expect(repository.getCategories).toHaveBeenCalled();
    });
  });

  describe('findByCategory', () => {
    it('should return permissions by category', async () => {
      const mockPermissions = [
        { id: '1', name: 'View Inventory', code: 'inventory.view', category: 'inventory' },
      ];
      mockPermissionsRepository.findByCategory.mockResolvedValue(mockPermissions);

      const result = await service.findByCategory('inventory');

      expect(result).toEqual(mockPermissions);
      expect(repository.findByCategory).toHaveBeenCalledWith('inventory');
    });
  });
});
