# RBAC (Role-Based Access Control) - CEM ERP API

## Overview

This document describes the complete RBAC implementation for CEM ERP, including guards, decorators, and middleware for authorization.

---

## Guards

### 1. JwtAuthGuard (`guards/jwt-auth.guard.ts`)

**Purpose**: Protects routes requiring JWT authentication.

**Usage**:
```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
getProtectedData(@CurrentUser() user: CurrentUserData) {
  return { message: 'This is protected', user };
}
```

**Features**:
- Validates JWT access tokens
- Extracts user from token
- Throws 401 if token is invalid

---

### 2. JwtRefreshGuard (`guards/jwt-refresh.guard.ts`)

**Purpose**: Protects refresh token endpoint.

**Usage**:
```typescript
@UseGuards(JwtRefreshGuard)
@Post('refresh')
refresh(@CurrentUser() user: CurrentUserData) {
  return this.authService.refreshTokens(refreshToken);
}
```

**Features**:
- Validates JWT refresh tokens
- Checks session validity
- Throws 401 if token is invalid or session is revoked

---

### 3. RolesGuard (`guards/roles.guard.ts`)

**Purpose**: Enforces role-based access control.

**Usage**:
```typescript
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin-only')
getAdminData() {
  return { message: 'Admin only' };
}
```

**Features**:
- Checks if user has required role
- Supports multiple roles (any match)
- SUPER_ADMIN and ADMIN bypass checks

**Available Roles**:
- SUPER_ADMIN
- ADMIN
- MANAGER
- EMPLOYEE
- VIEWER

---

### 4. PermissionsGuard (`guards/permissions.guard.ts`)

**Purpose**: Enforces permission-based access control.

**Usage**:
```typescript
@RequirePermissions('users.read', 'users.write')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Get('users')
getUsers() {
  return this.usersService.findAll();
}
```

**Features**:
- Checks if user has required permissions
- Supports multiple permissions (all required)
- SUPER_ADMIN bypasses all permission checks
- TODO: Integrate with AuthorizationService for permission loading

**Permission Types**:
- READ
- WRITE
- DELETE
- APPROVE
- EXPORT
- IMPORT

---

### 5. OwnerGuard (`guards/owner.guard.ts`)

**Purpose**: Enforces resource ownership checks.

**Usage**:
```typescript
@Owner('userId')
@UseGuards(JwtAuthGuard, OwnerGuard)
@Get('users/:userId')
getUserById(@Param('userId') userId: string) {
  return this.usersService.findById(userId);
}
```

**Features**:
- Checks if user owns the resource
- SUPER_ADMIN and ADMIN bypass ownership checks
- Configurable parameter name for resource ID
- Throws 403 if not owner

---

## Decorators

### 1. @CurrentUser()

**Purpose**: Injects current user into controller method.

**Usage**:
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getCurrentUser(@CurrentUser() user: CurrentUserData) {
  return user;
}
```

**Returns**:
```typescript
{
  id: string;
  email: string;
  role: string;
  sessionId: string;
  firstName: string;
  lastName: string;
}
```

---

### 2. @Public()

**Purpose**: Marks route as public (no authentication required).

**Usage**:
```typescript
@Public()
@Post('login')
login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}
```

**Features**:
- Bypasses JWT authentication
- Used for login, register, password reset endpoints

---

### 3. @Roles()

**Purpose**: Specifies required roles for route.

**Usage**:
```typescript
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin-data')
getAdminData() {
  return { message: 'Admin data' };
}
```

**Parameters**:
- Accepts multiple roles
- User must have at least one of the specified roles

---

### 4. @RequirePermissions()

**Purpose**: Specifies required permissions for route.

**Usage**:
```typescript
@RequirePermissions('users.read', 'users.write')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Get('users')
getUsers() {
  return this.usersService.findAll();
}
```

**Variants**:
- `@RequirePermissions()` - All permissions required
- `@RequireAnyPermission()` - Any permission sufficient
- `@RequireAllPermissions()` - All permissions required

---

### 5. @Owner()

**Purpose**: Specifies resource ownership check.

**Usage**:
```typescript
@Owner('userId')
@UseGuards(JwtAuthGuard, OwnerGuard)
@Patch('users/:userId')
updateUser(@Param('userId') userId: string, @Body() updateUserDto: UpdateUserDto) {
  return this.usersService.update(userId, updateUserDto);
}
```

**Parameters**:
- `paramName`: Name of the parameter containing the resource ID

---

## Middleware

### 1. AuthorizationMiddleware (`middleware/authorization.middleware.ts`)

**Purpose**: Global authorization checks for user status.

**Features**:
- Checks if user account is active
- Checks if user email is verified
- Checks if user account is locked
- Applied globally or to specific routes

**Usage**:
```typescript
// In module configuration
export class AppModule implements NestModule {
  configure(consumer: MiddlewareBuilder) {
    consumer
      .apply(AuthorizationMiddleware)
      .forRoutes('*');
  }
}
```

---

### 2. AuditMiddleware (`middleware/audit.middleware.ts`)

**Purpose**: Logs all non-GET requests for audit trail.

**Features**:
- Logs request method, URL, user, timestamp
- Logs request body
- Logs response status
- Applied globally or to specific routes

**Usage**:
```typescript
// In module configuration
export class AppModule implements NestModule {
  configure(consumer: MiddlewareBuilder) {
    consumer
      .apply(AuditMiddleware)
      .exclude('auth/login', 'auth/refresh')
      .forRoutes('*');
  }
}
```

---

### 3. RoleMiddleware (`middleware/role.middleware.ts`)

**Purpose**: Middleware-based role checking (alternative to RolesGuard).

**Usage**:
```typescript
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
@Get('admin-data')
getAdminData() {
  return { message: 'Admin data' };
}
```

**Note**: Typically used with guards, but can be applied as middleware.

---

### 4. OwnerMiddleware (`middleware/owner.middleware.ts`)

**Purpose**: Middleware-based ownership checking (alternative to OwnerGuard).

**Usage**:
```typescript
@Owner('userId')
@UseGuards(JwtAuthGuard)
@Patch('users/:userId')
updateUser(@Param('userId') userId: string) {
  return this.usersService.update(userId, updateUserDto);
}
```

**Note**: Typically used with guards, but can be applied as middleware.

---

### 5. PermissionMiddleware (`middleware/permission.middleware.ts`)

**Purpose**: Middleware-based permission checking (alternative to PermissionsGuard).

**Usage**:
```typescript
@RequirePermissions('users.read')
@UseGuards(JwtAuthGuard)
@Get('users')
getUsers() {
  return this.usersService.findAll();
}
```

**Note**: Typically used with guards, but can be applied as middleware.

---

## Usage Examples

### Example 1: Public Route
```typescript
@Public()
@Post('auth/login')
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}
```

### Example 2: Authenticated Route
```typescript
@UseGuards(JwtAuthGuard)
@Get('auth/me')
async getCurrentUser(@CurrentUser() user: CurrentUserData) {
  return user;
}
```

### Example 3: Role-Based Access
```typescript
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin/dashboard')
async getAdminDashboard() {
  return { message: 'Admin dashboard' };
}
```

### Example 4: Permission-Based Access
```typescript
@RequirePermissions('users.read', 'users.write')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Get('users')
async getUsers() {
  return this.usersService.findAll();
}
```

### Example 5: Resource Ownership
```typescript
@Owner('userId')
@UseGuards(JwtAuthGuard, OwnerGuard)
@Patch('users/:userId')
async updateUser(@Param('userId') userId: string, @Body() updateUserDto: UpdateUserDto) {
  return this.usersService.update(userId, updateUserDto);
}
```

### Example 6: Combined Guards
```typescript
@Roles(UserRole.ADMIN)
@RequirePermissions('users.delete')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Delete('users/:userId')
async deleteUser(@Param('userId') userId: string) {
  return this.usersService.delete(userId);
}
```

---

## Role Hierarchy

```
SUPER_ADMIN (Level 5)
  ├── Full access to all resources
  ├── Can manage all users
  └── Can manage all permissions

ADMIN (Level 4)
  ├── Full access to most resources
  ├── Can manage users (except SUPER_ADMIN)
  └── Can manage permissions (except SUPER_ADMIN)

MANAGER (Level 3)
  ├── Access to department resources
  ├── Can manage team members
  └── Can approve requests

EMPLOYEE (Level 2)
  ├── Access to assigned resources
  ├── Can create and edit own data
  └── Can view team data

VIEWER (Level 1)
  ├── Read-only access
  ├── Can view assigned resources
  └── Cannot modify data
```

---

## Permission Structure

**Categories**:
- `users.*` - User management
- `roles.*` - Role management
- `permissions.*` - Permission management
- `companies.*` - Company management
- `projects.*` - Project management
- `reports.*` - Report access
- `settings.*` - System settings

**Actions**:
- `read` - View resources
- `write` - Create and edit resources
- `delete` - Delete resources
- `approve` - Approve requests
- `export` - Export data
- `import` - Import data

**Examples**:
- `users.read` - View users
- `users.write` - Create/edit users
- `users.delete` - Delete users
- `projects.read` - View projects
- `projects.write` - Create/edit projects
- `reports.export` - Export reports

---

## Best Practices

1. **Use @Public()** for login, register, password reset endpoints
2. **Use @CurrentUser()** to get authenticated user data
3. **Use @Roles()** for role-based access control
4. **Use @RequirePermissions()** for granular permission control
5. **Use @Owner()** for resource ownership checks
6. **Combine guards** for complex authorization requirements
7. **Apply middleware globally** for audit logging and status checks
8. **Use SUPER_ADMIN role** sparingly and with caution
9. **Document custom permissions** in code comments
10. **Test authorization** with different user roles

---

## Security Considerations

1. **Always use HTTPS** in production
2. **Never expose sensitive data** in error messages
3. **Log all authorization failures** for security monitoring
4. **Implement rate limiting** on authentication endpoints
5. **Use short-lived access tokens** (15 minutes)
6. **Use refresh tokens** with rotation
7. **Revoke sessions** on password change
8. **Implement account lockout** after failed attempts
9. **Require email verification** for new accounts
10. **Regular security audits** of permissions and roles

---

## Next Steps

1. Integrate AuthorizationService with PermissionsGuard
2. Implement permission caching for performance
3. Add permission templates for common use cases
4. Implement permission inheritance
5. Add permission expiry support
6. Implement permission audit logging
7. Add permission analytics dashboard
8. Create permission management UI
9. Implement dynamic permissions
10. Add permission bulk operations
