import { PrismaClient, UserRole, PermissionType, SettingType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================================================
  // CREATE PERMISSIONS
  // ============================================================================

  console.log('Creating permissions...');

  const permissions = [
    // User Management
    { name: 'View Users', code: 'users.read', type: PermissionType.READ, category: 'Users' },
    { name: 'Create Users', code: 'users.create', type: PermissionType.WRITE, category: 'Users' },
    { name: 'Edit Users', code: 'users.update', type: PermissionType.WRITE, category: 'Users' },
    { name: 'Delete Users', code: 'users.delete', type: PermissionType.DELETE, category: 'Users' },
    { name: 'Export Users', code: 'users.export', type: PermissionType.EXPORT, category: 'Users' },
    { name: 'Import Users', code: 'users.import', type: PermissionType.IMPORT, category: 'Users' },

    // Role Management
    { name: 'View Roles', code: 'roles.read', type: PermissionType.READ, category: 'Roles' },
    { name: 'Create Roles', code: 'roles.create', type: PermissionType.WRITE, category: 'Roles' },
    { name: 'Edit Roles', code: 'roles.update', type: PermissionType.WRITE, category: 'Roles' },
    { name: 'Delete Roles', code: 'roles.delete', type: PermissionType.DELETE, category: 'Roles' },

    // Permission Management
    { name: 'View Permissions', code: 'permissions.read', type: PermissionType.READ, category: 'Permissions' },
    { name: 'Grant Permissions', code: 'permissions.grant', type: PermissionType.WRITE, category: 'Permissions' },
    { name: 'Revoke Permissions', code: 'permissions.revoke', type: PermissionType.DELETE, category: 'Permissions' },

    // Company Management
    { name: 'View Company', code: 'company.read', type: PermissionType.READ, category: 'Company' },
    { name: 'Edit Company', code: 'company.update', type: PermissionType.WRITE, category: 'Company' },
    { name: 'Manage Company Users', code: 'company.users', type: PermissionType.WRITE, category: 'Company' },

    // Settings Management
    { name: 'View Settings', code: 'settings.read', type: PermissionType.READ, category: 'Settings' },
    { name: 'Edit Settings', code: 'settings.update', type: PermissionType.WRITE, category: 'Settings' },

    // Dashboard
    { name: 'View Dashboard', code: 'dashboard.read', type: PermissionType.READ, category: 'Dashboard' },

    // Notifications
    { name: 'View Notifications', code: 'notifications.read', type: PermissionType.READ, category: 'Notifications' },
    { name: 'Manage Notifications', code: 'notifications.manage', type: PermissionType.WRITE, category: 'Notifications' },

    // Audit Logs
    { name: 'View Audit Logs', code: 'audit.read', type: PermissionType.READ, category: 'Audit' },
    { name: 'Export Audit Logs', code: 'audit.export', type: PermissionType.EXPORT, category: 'Audit' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // ============================================================================
  // ASSIGN ROLE PERMISSIONS
  // ============================================================================

  console.log('Assigning role permissions...');

  const allPermissions = await prisma.permission.findMany();

  // SUPER_ADMIN gets all permissions
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.OWNER,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: UserRole.OWNER,
        permissionId: permission.id,
      },
    });
  }

  // ADMIN gets most permissions (except delete users/roles)
  const adminPermissions = allPermissions.filter(
    (p) => !p.code.includes('delete') && p.code !== 'permissions.revoke',
  );
  for (const permission of adminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.ADMIN,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: UserRole.ADMIN,
        permissionId: permission.id,
      },
    });
  }

  // MANAGER gets read/write permissions for their modules
  const managerPermissions = allPermissions.filter(
    (p) =>
      p.type === PermissionType.READ ||
      (p.type === PermissionType.WRITE && p.category !== 'Users' && p.category !== 'Roles' && p.category !== 'Permissions'),
  );
  for (const permission of managerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.FACTORY_MANAGER,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: UserRole.FACTORY_MANAGER,
        permissionId: permission.id,
      },
    });
  }

  // EMPLOYEE gets read permissions
  const employeePermissions = allPermissions.filter(
    (p) => p.type === PermissionType.READ && p.category !== 'Audit',
  );
  for (const permission of employeePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.EMPLOYEE,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: UserRole.EMPLOYEE,
        permissionId: permission.id,
      },
    });
  }

  // VIEWER gets only read permissions for dashboard
  const viewerPermissions = allPermissions.filter((p) => p.code === 'dashboard.read');
  for (const permission of viewerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.VIEWER,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: UserRole.VIEWER,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Role permissions assigned');

  // ============================================================================
  // CREATE SYSTEM SETTINGS
  // ============================================================================

  console.log('Creating system settings...');

  const systemSettings = [
    { key: 'app.name', value: 'CEM ERP', type: SettingType.STRING, description: 'Application name', category: 'General', isPublic: true },
    { key: 'app.version', value: '1.0.0', type: SettingType.STRING, description: 'Application version', category: 'General', isPublic: true },
    { key: 'app.timezone', value: 'Asia/Kolkata', type: SettingType.STRING, description: 'Default timezone', category: 'General', isPublic: false },
    { key: 'app.locale', value: 'en-IN', type: SettingType.STRING, description: 'Default locale', category: 'General', isPublic: false },
    { key: 'auth.maxLoginAttempts', value: '5', type: SettingType.NUMBER, description: 'Maximum failed login attempts', category: 'Security', isPublic: false },
    { key: 'auth.lockoutDuration', value: '15', type: SettingType.NUMBER, description: 'Account lockout duration in minutes', category: 'Security', isPublic: false },
    { key: 'auth.passwordMinLength', value: '8', type: SettingType.NUMBER, description: 'Minimum password length', category: 'Security', isPublic: false },
    { key: 'auth.sessionTimeout', value: '60', type: SettingType.NUMBER, description: 'Session timeout in minutes', category: 'Security', isPublic: false },
    { key: 'notification.emailEnabled', value: 'true', type: SettingType.BOOLEAN, description: 'Enable email notifications', category: 'Notifications', isPublic: false },
    { key: 'notification.smsEnabled', value: 'false', type: SettingType.BOOLEAN, description: 'Enable SMS notifications', category: 'Notifications', isPublic: false },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log(`✅ Created ${systemSettings.length} system settings`);

  // ============================================================================
  // CREATE DEFAULT COMPANY
  // ============================================================================

  console.log('Creating default company...');

  const company = await prisma.company.upsert({
    where: { code: 'CEM' },
    update: {},
    create: {
      name: 'Chhayani Earth Movers',
      code: 'CEM',
      legalName: 'Chhayani Earth Movers Pvt Ltd',
      address: '123 Industrial Area',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400001',
      phone: '+91 1234567890',
      email: 'info@cem.com',
      website: 'https://cem.com',
      isActive: true,
      fiscalYearStart: new Date('2024-04-01'),
      fiscalYearEnd: new Date('2025-03-31'),
    },
  });

  console.log(`✅ Created company: ${company.name}`);

  // ============================================================================
  // CREATE SUPER ADMIN USER
  // ============================================================================

  console.log('Creating super admin user...');

  // Note: In production, use bcrypt to hash the password
  // For now, using a placeholder hash (will be replaced in Phase 2)
  const passwordHash = 'placeholder_hash_will_be_replaced_in_phase_2';

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@cem.com' },
    update: {},
    create: {
      email: 'admin@cem.com',
      username: 'admin',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.OWNER,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✅ Created super admin: ${superAdmin.email}`);

  // ============================================================================
  // LINK USER TO COMPANY
  // ============================================================================

  console.log('Linking user to company...');

  await prisma.companyUser.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: superAdmin.id,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: superAdmin.id,
      position: 'Super Administrator',
      department: 'Administration',
      isActive: true,
    },
  });

  console.log('✅ User linked to company');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
