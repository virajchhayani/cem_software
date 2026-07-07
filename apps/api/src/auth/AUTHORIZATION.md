# Authorization - CEM ERP Authentication

## Overview

This document describes the complete authorization system for CEM ERP, including roles, permissions, owner guards, decorators, and middleware.

---

## Role-Based Access Control (RBAC)

### User Roles

The system supports the following hierarchical roles:

1. **SUPER_ADMIN** - Full system access, can manage all resources
2. **ADMIN** - Administrative access, can manage most resources
3. **MANAGER** - Management access, can manage team resources
4. **EMPLOYEE** - Standard employee access
5. **VIEWER** - Read-only access

### Role Hierarchy

```
SUPER_ADMIN
  └── ADMIN
      └── MANAGER
          └── EMPLOYEE
              └── VIEWER
```

Higher roles inherit all permissions of lower roles.

---

## Permissions

### Permission Structure

Permissions are granular controls that define what actions users can perform on specific resources.

**Permission Schema**:
```typescript
{
  id: string;              // UUID
  name: string;            // Human-readable name
  code: string;            // Unique code (e.g., "users.read")
  description?: string;    // Description
  type: PermissionType;    // READ | WRITE | DELETE | APPROVE | EXPORT | IMPORT
  category?: string;       // Category (e.g., "users", "inventory")
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Permission Types

- **READ** - View resources
- **WRITE** - Create and update resources
- **DELETE** - Delete resources
- **APPROVE** - Approve requests
- **EXPORT** - Export data
- **IMPORT** - Import data

### Permission Assignment

Permissions can be assigned at two levels:

1. **Role-Based** - Permissions assigned to a role apply to all users with that role
2. **User-Based** - Permissions assigned directly to a specific user (overrides role permissions)

### Permission Examples

```
users.read          - Read user information
users.write         - Create/update users
users.delete        - Delete users
inventory.read      - Read inventory
inventory.write     - Create/update inventory
reports.export      - Export reports
reports.approve     - Approve reports
```

---

## Guards

### 1. RolesGuard

**Purpose**: Enforces role-based access control

**Location**: `src/auth/guards/roles.guard.ts`

**Usage**:
```typescript
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin-only')
getAdminRoute() { }
```

**Behavior**:
- Checks if route has required roles via `@Roles()` decorator
- Compares user role against required roles
- Returns 403 Forbidden if user lacks required role
- Returns true if no roles are specified (public route)

**Example**:
```typescript
@Controller('users')
export class UsersController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAllUsers() {
    // Only ADMIN and MANAGER can access
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: CurrentUserData) {
    // All authenticated users can access
  }
}
```

---

### 2. PermissionsGuard

**Purpose**: Enforces permission-based access control

**Location**: `src/auth/guards/permissions.guard.ts`

**Usage**:
```typescript
@RequirePermissions('users.read', 'users.write')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post('users')
createUser() { }
```

**Behavior**:
- Checks if route has required permissions via `@RequirePermissions()` decorator
- Fetches user permissions from database (user-specific + role-based)
- Validates user has required permissions
- Returns 403 Forbidden if user lacks required permissions
- SUPER_ADMIN and ADMIN roles bypass permission checks

**Permission Modes**:

**Require All Permissions** (default):
```typescript
@RequirePermissions('users.read', 'users.write')
// User must have BOTH permissions
```

**Require Any Permission**:
```typescript
@RequireAnyPermission('users.read', 'users.write')
// User must have AT LEAST ONE permission
```

**Example**:
```typescript
@Controller('inventory')
export class InventoryController {
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('inventory.read')
  async getInventory() {
    // Users with inventory.read permission
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('inventory.write')
  async createInventoryItem() {
    // Users with inventory.write permission
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAllPermissions('inventory.write', 'inventory.delete')
  async deleteInventoryItem() {
    // Users must have BOTH permissions
  }
}
```

---

### 3. OwnerGuard

**Purpose**: Ensures users can only access resources they own

**Location**: `src/auth/guards/owner.guard.ts`

**Usage**:
```typescript
@Owner('userId')
@UseGuards(JwtAuthGuard, OwnerGuard)
@Get('posts/:userId')
getUserPosts() { }
```

**Behavior**:
- Checks if route has owner check via `@Owner()` decorator
- Extracts user ID from request parameters
- Compares authenticated user ID with resource owner ID
- SUPER_ADMIN and ADMIN roles bypass owner checks
- Returns 403 Forbidden if user is not the owner

**Example**:
```typescript
@Controller('documents')
export class DocumentsController {
  @Get(':userId')
  @UseGuards(JwtAuthGuard, OwnerGuard)
  @Owner('userId')
  async getUserDocuments(@Param('userId') userId: string) {
    // Only the owner (or ADMIN/SUPER_ADMIN) can access
  }

  @Post(':userId')
  @UseGuards(JwtAuthGuard, OwnerGuard)
  @Owner('userId')
  async createDocument(@Param('userId') userId: string) {
    // Only the owner (or ADMIN/SUPER_ADMIN) can create
  }
}
```

**Parameter Name**:
The `@Owner()` decorator accepts a parameter name to specify which parameter contains the user ID:

```typescript
@Owner('userId')  // Default, checks params.userId
@Owner('id')      // Checks params.id
@Owner('ownerId') // Checks params.ownerId
```

---

## Decorators

### 1. @Roles

**Purpose**: Marks route with required user roles

**Location**: `src/auth/decorators/roles.decorator.ts`

**Usage**:
```typescript
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Get('admin-only')
getAdminRoute() { }
```

**Parameters**: Variable number of roles

**Behavior**: Sets metadata with required roles for use by RolesGuard

---

### 2. @RequirePermissions

**Purpose**: Marks route with required permissions

**Location**: `src/auth/decorators/permissions.decorator.ts`

**Usage**:
```typescript
// Require all permissions (default)
@RequirePermissions('users.read', 'users.write')

// Require any permission
@RequireAnyPermission('users.read', 'users.write')

// Require all permissions (explicit)
@RequireAllPermissions('users.read', 'users.write')
```

**Parameters**: Variable number of permission codes

**Behavior**: Sets metadata with required permissions for use by PermissionsGuard

---

### 3. @Owner

**Purpose**: Marks route with owner check

**Location**: `src/auth/decorators/owner.decorator.ts`

**Usage**:
```typescript
@Owner('userId')
@Get('posts/:userId')
getUserPosts() { }
```

**Parameters**: Parameter name (default: 'userId')

**Behavior**: Sets metadata with parameter name for use by OwnerGuard

---

### 4. @Public

**Purpose**: Marks route as public (bypasses authentication)

**Location**: `src/auth/decorators/public.decorator.ts`

**Usage**:
```typescript
@Public()
@Post('login')
login() { }
```

**Behavior**: Sets metadata to indicate route is public

---

### 5. @CurrentUser

**Purpose**: Injects authenticated user into controller method

**Location**: `src/auth/decorators/current-user.decorator.ts`

**Usage**:
```typescript
@Get('profile')
getProfile(@CurrentUser() user: CurrentUserData) {
  return user;
}

// Or extract specific property
@Get('email')
getEmail(@CurrentUser('email') email: string) {
  return email;
}
```

**Behavior**: Extracts user object from request and returns it or specific property

---

## Middleware

### 1. AuthorizationMiddleware

**Purpose**: Global authorization checks

**Location**: `src/auth/middleware/authorization.middleware.ts`

**Usage**: Applied globally or to specific routes

**Behavior**:
- Checks if user account is active
- Checks if user email is verified
- Checks if user account is locked
- Throws ForbiddenException if checks fail

**Example Application**:
```typescript
// In AppModule or specific module
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthorizationMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
```

---

### 2. AuditMiddleware

**Purpose**: Logs all non-GET requests for audit trail

**Location**: `src/auth/middleware/audit.middleware.ts`

**Usage**: Applied globally or to specific routes

**Behavior**:
- Intercepts response after it's sent
- Logs non-GET requests to audit table
- Records action, entity, entity ID, user ID, changes, IP address, user agent
- Maps HTTP methods to actions (POST→CREATE, PUT→UPDATE, etc.)
- Extracts entity name and ID from path

**Example Application**:
```typescript
// In AppModule or specific module
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuditMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
```

**Audit Log Structure**:
```typescript
{
  id: string;
  action: ActivityAction;  // CREATE | UPDATE | DELETE | LOGIN | LOGOUT | etc.
  entity: string;         // e.g., "users", "inventory"
  entityId: string;       // e.g., "123"
  userId: string;         // User who performed the action
  changes: Json;          // Additional context
  ipAddress: string;      // Client IP address
  userAgent: string;      // Client user agent
  createdAt: DateTime;
}
```

---

## AuthorizationService

**Purpose**: Central service for permission management

**Location**: `src/auth/services/authorization.service.ts`

**Methods**:

### getUserPermissions(userId: string)

Returns all permissions for a user (user-specific + role-based).

**Returns**: Array of Permission objects

### hasPermission(userId: string, permissionCode: string)

Checks if user has a specific permission.

**Returns**: boolean

### hasAllPermissions(userId: string, permissionCodes: string[])

Checks if user has all specified permissions.

**Returns**: boolean

### hasAnyPermission(userId: string, permissionCodes: string[])

Checks if user has at least one of the specified permissions.

**Returns**: boolean

### grantPermissionToUser(userId, permissionId, grantedBy?, expiresAt?)

Grants a permission to a specific user.

**Returns**: UserPermission object

### revokePermissionFromUser(userId, permissionId)

Revokes a permission from a specific user.

**Returns**: void

### grantPermissionToRole(role, permissionId)

Grants a permission to a role.

**Returns**: RolePermission object

### revokePermissionFromRole(role, permissionId)

Revokes a permission from a role.

**Returns**: void

### getAllPermissions()

Returns all permissions in the system.

**Returns**: Array of Permission objects

### getPermissionByCode(code)

Returns a permission by its code.

**Returns**: Permission object or null

### createPermission(data)

Creates a new permission.

**Returns**: Permission object

### updatePermission(id, data)

Updates an existing permission.

**Returns**: Permission object

### deletePermission(id)

Deletes a permission.

**Returns**: Permission object

---

## Usage Examples

### Example 1: Role-Based Protection

```typescript
@Controller('admin')
export class AdminController {
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getDashboard() {
    // Only ADMIN and SUPER_ADMIN can access
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getAllUsers() {
    // Only SUPER_ADMIN can access
  }
}
```

### Example 2: Permission-Based Protection

```typescript
@Controller('inventory')
export class InventoryController {
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('inventory.read')
  async getInventory() {
    // Users with inventory.read permission
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('inventory.write')
  async createItem() {
    // Users with inventory.write permission
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAllPermissions('inventory.write', 'inventory.delete')
  async deleteItem() {
    // Users must have both permissions
  }
}
```

### Example 3: Owner-Based Protection

```typescript
@Controller('documents')
export class DocumentsController {
  @Get(':userId')
  @UseGuards(JwtAuthGuard, OwnerGuard)
  @Owner('userId')
  async getUserDocuments(@Param('userId') userId: string) {
    // Only owner or ADMIN/SUPER_ADMIN
  }

  @Post(':userId')
  @UseGuards(JwtAuthGuard, OwnerGuard)
  @Owner('userId')
  async createDocument(@Param('userId') userId: string) {
    // Only owner or ADMIN/SUPER_ADMIN
  }
}
```

### Example 4: Combined Protection

```typescript
@Controller('projects')
export class ProjectsController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @RequirePermissions('projects.read')
  async getProjects() {
    // Must have role AND permission
  }

  @Post(':userId')
  @UseGuards(JwtAuthGuard, OwnerGuard, PermissionsGuard)
  @Owner('userId')
  @RequirePermissions('projects.write')
  async createProject(@Param('userId') userId: string) {
    // Must be owner AND have permission
  }
}
```

---

## Security Best Practices

### 1. Defense in Depth
- Use multiple guards for critical endpoints
- Combine role-based and permission-based checks
- Implement owner checks for user-specific resources

### 2. Principle of Least Privilege
- Grant minimum required permissions
- Use role-based permissions for common access
- Use user-specific permissions for exceptions

### 3. Audit Trail
- Log all authorization decisions
- Track permission changes
- Monitor failed access attempts

### 4. Regular Reviews
- Review user permissions regularly
- Revoke unused permissions
- Update role permissions as needed

### 5. Secure Defaults
- Default to deny access
- Explicitly grant permissions
- Use whitelist approach

---

## Database Tables Used

1. **users** - User accounts with roles
2. **permissions** - Permission definitions
3. **user_permissions** - User-specific permission assignments
4. **role_permissions** - Role-based permission assignments
5. **audit_logs** - Audit trail for authorization events

---

## Next Steps

1. **Implement Permission Loading**: Add permission loading to JWT strategy
2. **Add Permission Caching**: Cache user permissions for performance
3. **Implement Permission UI**: Create UI for managing permissions
4. **Add Permission Templates**: Create permission templates for common roles
5. **Implement Permission Inheritance**: Add hierarchical permission inheritance
6. **Add Permission Groups**: Group related permissions
7. **Implement Dynamic Permissions**: Support dynamic permission evaluation
8. **Add Permission Expiry**: Support time-limited permissions
9. **Implement Permission Audit**: Log all permission changes
10. **Add Permission Analytics**: Track permission usage patterns

---

## Configuration

### Environment Variables

```env
# Authorization settings
AUTH_DEFAULT_ROLE=EMPLOYEE
AUTH_REQUIRE_EMAIL_VERIFICATION=false
AUTH_REQUIRE_ACTIVE_ACCOUNT=true
```

---

## Testing

### Role Guard Test

```typescript
describe('RolesGuard', () => {
  it('should allow access when user has required role', async () => {
    // Test implementation
  });

  it('should deny access when user lacks required role', async () => {
    // Test implementation
  });
});
```

### Permission Guard Test

```typescript
describe('PermissionsGuard', () => {
  it('should allow access when user has required permissions', async () => {
    // Test implementation
  });

  it('should deny access when user lacks required permissions', async () => {
    // Test implementation
  });
});
```

### Owner Guard Test

```typescript
describe('OwnerGuard', () => {
  it('should allow access when user is owner', async () => {
    // Test implementation
  });

  it('should deny access when user is not owner', async () => {
    // Test implementation
  });

  it('should allow access for ADMIN role', async () => {
    // Test implementation
  });
});
```
