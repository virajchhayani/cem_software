# CEM ERP Database Schema Documentation

## Overview

This document describes the complete PostgreSQL database schema for the CEM ERP system using Prisma ORM. The schema is designed to support a scalable, multi-tenant ERP system with comprehensive audit trails, role-based access control, and flexible configuration management.

## Design Principles

1. **UUID Primary Keys**: All tables use UUID primary keys for better security and scalability
2. **Soft Deletes**: Critical tables support soft deletes via `deletedAt` timestamp
3. **Audit Fields**: Tables include `createdBy`, `updatedBy` for tracking changes
4. **Timestamps**: All tables have `createdAt` and `updatedAt` timestamps
5. **Indexing**: Strategic indexes on frequently queried fields
6. **Cascade Deletes**: Related records are automatically cleaned up
7. **Enum Types**: Strongly typed enums for consistent data

## Database Tables

### 1. Authentication & Authorization

#### Users Table (`users`)
Stores user account information with authentication and profile data.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `email` (String, Unique): User email address
- `username` (String, Unique, Optional): Username for login
- `passwordHash` (String): Bcrypt hashed password
- `firstName` (String): User's first name
- `lastName` (String): User's last name
- `phoneNumber` (String, Optional): Contact number
- `avatar` (String, Optional): Profile picture URL
- `role` (UserRole): User's role (SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE, VIEWER)
- `isActive` (Boolean): Account status
- `isEmailVerified` (Boolean): Email verification status
- `lastLoginAt` (DateTime, Optional): Last successful login timestamp
- `emailVerifiedAt` (DateTime, Optional): Email verification timestamp
- `passwordChangedAt` (DateTime, Optional): Last password change timestamp
- `failedLoginAttempts` (Int): Count of failed login attempts
- `lockedUntil` (DateTime, Optional): Account lock expiration
- `createdAt` (DateTime): Record creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Optional): Soft delete timestamp
- `createdBy` (String, Optional): User who created the record
- `updatedBy` (String, Optional): User who last updated the record

**Indexes:**
- `email`: For login via email
- `username`: For login via username
- `role`: For filtering by role
- `isActive`: For filtering active users
- `deletedAt`: For soft delete queries

**Relations:**
- `permissions`: One-to-many with UserPermission
- `activities`: One-to-many with Audit
- `notifications`: One-to-many with Notification
- `companyUsers`: One-to-many with CompanyUser
- `settings`: One-to-many with UserSetting

#### Permissions Table (`permissions`)
Defines system permissions for fine-grained access control.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `name` (String, Unique): Human-readable permission name
- `code` (String, Unique): Machine-readable permission code
- `description` (String, Optional): Permission description
- `type` (PermissionType): Permission type (READ, WRITE, DELETE, APPROVE, EXPORT, IMPORT)
- `category` (String, Optional): Permission category (Users, Roles, etc.)
- `createdAt` (DateTime): Record creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Indexes:**
- `code`: For quick permission lookup
- `category`: For filtering by category

**Relations:**
- `userPermissions`: One-to-many with UserPermission
- `rolePermissions`: One-to-many with RolePermission

#### UserPermission Table (`user_permissions`)
Grants specific permissions to individual users.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `userId` (UUID, FK): Reference to user
- `permissionId` (UUID, FK): Reference to permission
- `grantedAt` (DateTime): When permission was granted
- `grantedBy` (String, Optional): User who granted the permission
- `expiresAt` (DateTime, Optional): Permission expiration

**Constraints:**
- Unique constraint on `(userId, permissionId)`

**Indexes:**
- `userId`: For user's permissions
- `permissionId`: For users with specific permission
- `expiresAt`: For expired permission cleanup

**Relations:**
- `user`: Many-to-one with User
- `permission`: Many-to-one with Permission

#### RolePermission Table (`role_permissions`)
Grants permissions to roles (applies to all users with that role).

**Fields:**
- `id` (UUID, PK): Unique identifier
- `role` (UserRole): Role identifier
- `permissionId` (UUID, FK): Reference to permission
- `createdAt` (DateTime): Record creation timestamp

**Constraints:**
- Unique constraint on `(role, permissionId)`

**Indexes:**
- `role`: For role's permissions
- `permissionId`: For roles with specific permission

**Relations:**
- `permission`: Many-to-one with Permission

#### RefreshToken Table (`refresh_tokens`)
Stores JWT refresh tokens for session management.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `userId` (UUID, FK): Reference to user
- `token` (String, Unique): Refresh token string
- `expiresAt` (DateTime): Token expiration
- `createdAt` (DateTime): Token creation timestamp
- `revokedAt` (DateTime, Optional): Token revocation timestamp
- `ipAddress` (String, Optional): Client IP address
- `userAgent` (String, Optional): Client user agent

**Indexes:**
- `userId`: For user's active tokens
- `token`: For token validation
- `expiresAt`: For expired token cleanup

### 2. Company & Organization

#### Company Table (`companies`)
Stores company/organization information.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `name` (String): Company display name
- `code` (String, Unique): Company code
- `legalName` (String, Optional): Legal entity name
- `taxId` (String, Optional): Tax identification number
- `registrationNumber` (String, Optional): Business registration number
- `address` (String, Optional): Street address
- `city` (String, Optional): City
- `state` (String, Optional): State/Province
- `country` (String, Optional): Country
- `postalCode` (String, Optional): Postal/ZIP code
- `phone` (String, Optional): Contact phone
- `email` (String, Optional): Contact email
- `website` (String, Optional): Company website
- `logo` (String, Optional): Logo URL
- `isActive` (Boolean): Company status
- `fiscalYearStart` (DateTime, Optional): Fiscal year start date
- `fiscalYearEnd` (DateTime, Optional): Fiscal year end date
- `createdAt` (DateTime): Record creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Optional): Soft delete timestamp
- `createdBy` (String, Optional): User who created the record
- `updatedBy` (String, Optional): User who last updated the record

**Indexes:**
- `code`: For company lookup
- `isActive`: For filtering active companies
- `deletedAt`: For soft delete queries

**Relations:**
- `users`: One-to-many with CompanyUser
- `settings`: One-to-many with CompanySetting

#### CompanyUser Table (`company_users`)
Links users to companies with position information.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `companyId` (UUID, FK): Reference to company
- `userId` (UUID, FK): Reference to user
- `position` (String, Optional): Job position/title
- `department` (String, Optional): Department name
- `joinedAt` (DateTime): Employment start date
- `leftAt` (DateTime, Optional): Employment end date
- `isActive` (Boolean): Employment status
- `createdAt` (DateTime): Record creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Optional): Soft delete timestamp

**Constraints:**
- Unique constraint on `(companyId, userId)`

**Indexes:**
- `companyId`: For company's users
- `userId`: For user's companies
- `isActive`: For filtering active employees
- `deletedAt`: For soft delete queries

**Relations:**
- `company`: Many-to-one with Company
- `user`: Many-to-one with User

### 3. Settings & Configuration

#### SystemSetting Table (`system_settings`)
Stores global system-wide settings.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `key` (String, Unique): Setting key
- `value` (String): Setting value
- `type` (SettingType): Value type (STRING, NUMBER, BOOLEAN, JSON)
- `description` (String, Optional): Setting description
- `category` (String, Optional): Setting category
- `isPublic` (Boolean): Whether setting is accessible to frontend
- `createdAt` (DateTime): Record creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Indexes:**
- `key`: For setting lookup
- `category`: For filtering by category
- `isPublic`: For public settings

#### UserSetting Table (`user_settings`)
Stores user-specific preferences.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `userId` (UUID, FK): Reference to user
- `key` (String): Setting key
- `value` (String): Setting value
- `type` (SettingType): Value type (STRING, NUMBER, BOOLEAN, JSON)
- `createdAt` (DateTime): Record creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Constraints:**
- Unique constraint on `(userId, key)`

**Indexes:**
- `userId`: For user's settings
- `key`: For setting lookup

**Relations:**
- `user`: Many-to-one with User

#### CompanySetting Table (`company_settings`)
Stores company-specific settings.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `companyId` (UUID, FK): Reference to company
- `key` (String): Setting key
- `value` (String): Setting value
- `type` (SettingType): Value type (STRING, NUMBER, BOOLEAN, JSON)
- `createdAt` (DateTime): Record creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Constraints:**
- Unique constraint on `(companyId, key)`

**Indexes:**
- `companyId`: For company's settings
- `key`: For setting lookup

**Relations:**
- `company`: Many-to-one with Company

### 4. Notifications

#### Notification Table (`notifications`)
Stores user notifications.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `userId` (UUID, FK): Reference to user
- `type` (NotificationType): Notification type (INFO, SUCCESS, WARNING, ERROR, SYSTEM)
- `title` (String): Notification title
- `message` (String): Notification message
- `data` (JSON, Optional): Additional notification data
- `status` (NotificationStatus): Notification status (UNREAD, READ, ARCHIVED)
- `isRead` (Boolean): Read status
- `readAt` (DateTime, Optional): Read timestamp
- `expiresAt` (DateTime, Optional): Expiration timestamp
- `createdAt` (DateTime): Record creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Indexes:**
- `userId`: For user's notifications
- `status`: For filtering by status
- `isRead`: For filtering read/unread
- `createdAt`: For sorting by date
- `expiresAt`: For expired notification cleanup

**Relations:**
- `user`: Many-to-one with User

### 5. Audit & Activity Logging

#### Audit Table (`audit_logs`)
Stores comprehensive audit trail of all system actions.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `action` (ActivityAction): Action type (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
- `entity` (String): Entity type (User, Company, etc.)
- `entityId` (String): Entity ID
- `userId` (UUID, FK): User who performed the action
- `changes` (JSON, Optional): Detailed changes made
- `ipAddress` (String, Optional): Client IP address
- `userAgent` (String, Optional): Client user agent
- `createdAt` (DateTime): Action timestamp

**Indexes:**
- `userId`: For user's activity
- `entity, entityId`: For entity-specific queries
- `createdAt`: For time-based queries

**Relations:**
- `user`: Many-to-one with User

## Enums

### UserRole
- `SUPER_ADMIN`: Full system access
- `ADMIN`: Administrative access (except user deletion)
- `MANAGER`: Department-level management
- `EMPLOYEE`: Standard employee access
- `VIEWER`: Read-only access

### PermissionType
- `READ`: View/Read access
- `WRITE`: Create/Update access
- `DELETE`: Delete access
- `APPROVE`: Approval access
- `EXPORT`: Export data access
- `IMPORT`: Import data access

### NotificationType
- `INFO`: Informational notification
- `SUCCESS`: Success notification
- `WARNING`: Warning notification
- `ERROR`: Error notification
- `SYSTEM`: System notification

### NotificationStatus
- `UNREAD`: Not yet read
- `READ`: Read by user
- `ARCHIVED`: Archived by user

### ActivityAction
- `CREATE`: Entity creation
- `UPDATE`: Entity update
- `DELETE`: Entity deletion
- `LOGIN`: User login
- `LOGOUT`: User logout
- `EXPORT`: Data export
- `IMPORT`: Data import
- `APPROVE`: Approval action
- `REJECT`: Rejection action

### SettingType
- `STRING`: String value
- `NUMBER`: Numeric value
- `BOOLEAN`: Boolean value
- `JSON`: JSON object value

## Relationships

```
Users (1) ----< (N) UserPermission
Users (1) ----< (N) Audit
Users (1) ----< (N) Notification
Users (1) ----< (N) CompanyUser
Users (1) ----< (N) UserSetting

Permission (1) ----< (N) User
Permission (1) ----< (N) RolePermission

Company (1) ----< (N) CompanyUser
Company (1) ----< (N) CompanySetting

CompanyUser (N) ----> (1) User
CompanyUser (N) ----> (1) Company
```

## Security Features

1. **Password Security**: Passwords are stored as bcrypt hashes
2. **Account Lockout**: Failed login attempts tracking with automatic lockout
3. **Email Verification**: Email verification status tracking
4. **Session Management**: Refresh tokens with expiration and revocation
5. **Audit Trail**: Complete audit logging of all actions
6. **Soft Deletes**: Critical data is never permanently deleted
7. **RBAC**: Comprehensive role-based access control
8. **Permission Expiration**: Time-limited permission grants

## Performance Considerations

1. **Indexes**: Strategic indexes on frequently queried fields
2. **UUID vs Integer**: UUIDs used for security and distributed systems
3. **JSON Fields**: Flexible data storage for settings and audit logs
4. **Cascade Deletes**: Automatic cleanup of related records
5. **Soft Deletes**: Prevents accidental data loss

## Future Expansion

The schema is designed to accommodate future modules:

- **Inventory Module**: Will add tables for products, warehouses, stock
- **Accounting Module**: Will add tables for accounts, transactions, invoices
- **HR Module**: Will add tables for employees, payroll, leave management
- **Project Module**: Will add tables for projects, tasks, time tracking
- **CRM Module**: Will add tables for customers, leads, opportunities

## Migration Strategy

When running migrations:

1. Always backup the database before migration
2. Test migrations in development environment first
3. Use Prisma Migrate for schema changes
4. Run seed script after initial migration
5. Monitor for performance impact after migration

## Seed Data

The seed script creates:
- 20+ system permissions
- Role-based permission assignments
- System settings (app name, security settings, etc.)
- Default company (Chhayani Earth Movers)
- Super admin user (admin@cem.com)

Run seed with: `npm run prisma:seed`
