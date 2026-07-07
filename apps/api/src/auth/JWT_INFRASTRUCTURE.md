# JWT Infrastructure - CEM ERP Authentication

## Overview

This document describes the complete JWT infrastructure for CEM ERP authentication, including Passport strategies, guards, decorators, services, and cookie configuration.

---

## Architecture Components

### 1. JWT Strategies

#### JwtStrategy (`strategies/jwt.strategy.ts`)
**Purpose**: Validates access tokens for protected routes

**Configuration**:
- Extracts JWT from `Authorization` header as Bearer token
- Uses `JWT_SECRET` from environment variables
- Validates token expiration
- Returns user object if valid

**Validation Logic**:
1. Extracts user ID from token payload
2. Fetches user from database
3. Checks if user exists and is active
4. Returns sanitized user object (id, email, role, firstName, lastName)

**Usage**: Applied via `JwtAuthGuard` for protected routes

---

#### JwtRefreshStrategy (`strategies/jwt-refresh.strategy.ts`)
**Purpose**: Validates refresh tokens for token renewal

**Configuration**:
- Extracts JWT from `Authorization` header as Bearer token
- Uses `JWT_REFRESH_SECRET` from environment variables
- Validates token expiration
- Passes request to callback for additional validation

**Validation Logic**:
1. Extracts user ID and session ID from token payload
2. Fetches user from database
3. Checks if user exists and is active
4. Verifies refresh token exists in session table
5. Validates session belongs to user
6. Checks if session is revoked or expired
7. Returns user object with session ID

**Usage**: Applied via `JwtRefreshGuard` for refresh token endpoint

---

### 2. Guards

#### JwtAuthGuard (`guards/jwt-auth.guard.ts`)
**Purpose**: Protects routes that require valid access token

**Implementation**: Extends Passport's `AuthGuard('jwt')`

**Usage**:
```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
getProtectedRoute() { }
```

**Behavior**:
- Extracts and validates JWT from Authorization header
- Returns 401 Unauthorized if token is invalid or missing
- Attaches user object to request for use in controllers

---

#### JwtRefreshGuard (`guards/jwt-refresh.guard.ts`)
**Purpose**: Protects refresh token endpoint

**Implementation**: Extends Passport's `AuthGuard('jwt-refresh')`

**Usage**:
```typescript
@UseGuards(JwtRefreshGuard)
@Post('refresh')
refreshTokens() { }
```

**Behavior**:
- Extracts and validates refresh token from Authorization header
- Returns 401 Unauthorized if token is invalid or missing
- Attaches user object with session ID to request

---

#### RolesGuard (`guards/roles.guard.ts`)
**Purpose**: Enforces role-based access control

**Implementation**: Implements `CanActivate` interface

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

---

### 3. Decorators

#### @Roles (`decorators/roles.decorator.ts`)
**Purpose**: Marks route with required user roles

**Usage**:
```typescript
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Get('management')
getManagementRoute() { }
```

**Behavior**:
- Sets metadata with required roles
- Used by `RolesGuard` to enforce access control

---

#### @Public (`decorators/public.decorator.ts`)
**Purpose**: Marks route as public (bypasses JWT authentication)

**Usage**:
```typescript
@Public()
@Post('login')
login() { }
```

**Behavior**:
- Sets metadata to indicate route is public
- Used by global authentication guard to skip validation

---

#### @CurrentUser (`decorators/current-user.decorator.ts`)
**Purpose**: Injects current authenticated user into controller method

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

**Behavior**:
- Extracts user object from request
- Returns entire user object or specific property
- Type-safe with `CurrentUserData` interface

---

### 4. Interfaces

#### JwtPayload (`interfaces/jwt-payload.interface.ts`)
**Purpose**: Defines JWT token payload structure

**Fields**:
- `sub`: User ID (subject)
- `email`: User email
- `role`: User role
- `iat`: Issued at (optional)
- `exp`: Expiration (optional)

---

#### JwtRefreshPayload (`interfaces/jwt-payload.interface.ts`)
**Purpose**: Defines refresh token payload structure

**Fields**:
- Extends `JwtPayload`
- `sessionId`: Session ID for token validation
- `type`: Token type ('refresh')

---

#### Tokens (`interfaces/tokens.interface.ts`)
**Purpose**: Defines token response structure

**Fields**:
- `accessToken`: JWT access token
- `refreshToken`: JWT refresh token
- `expiresIn`: Access token expiration in seconds

---

#### LoginResponse (`interfaces/tokens.interface.ts`)
**Purpose**: Defines login response structure

**Fields**:
- `user`: User object (id, email, firstName, lastName, role)
- `tokens`: Token object (accessToken, refreshToken, expiresIn)

---

### 5. AuthService (`auth.service.ts`)

**Purpose**: Core authentication business logic

**Key Methods**:

#### `validateUser(email, password)`
- Validates user credentials
- Checks account status and lockout
- Returns user object if valid

#### `login(email, password, deviceInfo)`
- Validates credentials
- Logs login attempt (success/failure)
- Handles account lockout logic
- Updates user's last login information
- Generates access and refresh tokens
- Creates user session with device tracking
- Returns login response with user and tokens

#### `refreshTokens(refreshToken)`
- Validates refresh token
- Verifies session exists and is valid
- Generates new access and refresh tokens
- Updates session with new refresh token hash
- Returns new tokens

#### `logout(userId, sessionId)`
- Revokes specific session
- Marks session as revoked

#### `logoutAll(userId)`
- Revokes all sessions for user
- Used for security (e.g., password change)

#### `generateTokens(userId, email, role, sessionId?)`
- Generates JWT access token
- Generates JWT refresh token
- Returns tokens with expiration

#### `initiatePasswordReset(email)`
- Creates password reset token
- Sends email with reset link
- Does not reveal if user exists

#### `resetPassword(token, newPassword)`
- Validates reset token
- Updates user password
- Marks token as used
- Revokes all sessions

#### `initiateEmailVerification(userId)`
- Creates email verification token
- Sends email with verification link

#### `verifyEmail(token)`
- Validates verification token
- Marks email as verified
- Marks token as verified

---

### 6. AuthController (`auth.controller.ts`)

**Purpose**: HTTP endpoints for authentication

**Endpoints**:

#### POST `/auth/login` (Public)
- Authenticates user with email and password
- Returns access and refresh tokens
- Creates session with device tracking

#### POST `/auth/refresh` (Public + Refresh Guard)
- Refreshes access token using refresh token
- Returns new access and refresh tokens

#### POST `/auth/logout` (Protected)
- Logs out current session
- Revokes session

#### POST `/auth/logout-all` (Protected)
- Logs out all sessions
- Revokes all user sessions

#### POST `/auth/password-reset/initiate` (Public)
- Initiates password reset
- Sends email with reset link

#### POST `/auth/password-reset/confirm` (Public)
- Resets password using token
- Updates password and revokes sessions

#### POST `/auth/email-verification/initiate` (Protected)
- Initiates email verification
- Sends email with verification link

#### POST `/auth/email-verification/confirm` (Public)
- Verifies email using token
- Marks email as verified

#### GET `/auth/me` (Protected)
- Returns current user information

---

### 7. Cookie Configuration (`config/cookie.config.ts`)

**Purpose**: Defines cookie settings for token storage

**Configuration Options**:

#### Access Token Cookie
- `httpOnly`: Prevents JavaScript access (XSS protection)
- `secure`: HTTPS only in production
- `sameSite`: CSRF protection
- `maxAge`: 15 minutes
- `path`: `/`

#### Refresh Token Cookie
- `httpOnly`: Prevents JavaScript access
- `secure`: HTTPS only in production
- `sameSite`: CSRF protection
- `maxAge`: 7 days
- `path`: `/auth/refresh`

#### Session Cookie
- `httpOnly`: Prevents JavaScript access
- `secure`: HTTPS only in production
- `sameSite`: CSRF protection
- `maxAge`: 7 days
- `path`: `/`

---

## Security Features

### 1. Token Security
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Separate secrets for access and refresh tokens
- Tokens stored as hashes in database

### 2. Session Management
- Multi-device session support
- Session tracking with device information
- Session revocation capability
- Session expiration handling
- Activity tracking for timeout

### 3. Account Security
- Failed login attempt tracking
- Account lockout after threshold
- Lockout duration configuration
- Password reset with single-use tokens
- Email verification with single-use tokens

### 4. Cookie Security
- HttpOnly cookies prevent XSS
- Secure flag in production
- SameSite strict for CSRF protection
- Separate paths for different token types

### 5. Role-Based Access Control
- Hierarchical role system
- Route-level role enforcement
- Guard-based protection
- Decorator-based role specification

---

## Token Flow

### Login Flow
1. User submits email and password
2. Server validates credentials
3. Server logs login attempt
4. Server generates access token (15 min expiry)
5. Server generates refresh token (7 day expiry)
6. Server creates session with device tracking
7. Server returns tokens to client

### Access Token Usage
1. Client includes access token in Authorization header
2. JwtAuthGuard validates token
3. Request proceeds if valid
4. User object attached to request

### Refresh Token Flow
1. Client includes refresh token in Authorization header
2. JwtRefreshGuard validates token
3. Server verifies session exists and is valid
4. Server generates new access and refresh tokens
5. Server updates session with new refresh token hash
6. Server returns new tokens to client

### Logout Flow
1. Client sends logout request
2. Server revokes session
3. Tokens become invalid
4. Client must re-authenticate

---

## Environment Variables

Required environment variables:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d
auth.maxLoginAttempts=5
auth.lockoutDuration=15
```

---

## Dependencies

Required packages:
- `@nestjs/jwt` - JWT token generation and validation
- `@nestjs/passport` - Passport integration
- `passport-jwt` - JWT strategy for Passport
- `bcrypt` - Password hashing
- `@prisma/client` - Database client

---

## Integration Points

### Required Services (to be implemented)
- `UsersService` - User CRUD operations
- `UserSessionsService` - Session management
- `LoginAttemptsService` - Login attempt logging
- `EmailVerificationTokensService` - Email verification tokens
- `PasswordResetTokensService` - Password reset tokens
- `DatabaseModule` - Prisma client provider

### Required Modules (to be implemented)
- `UsersModule` - User management module
- `DatabaseModule` - Database configuration module

---

## Best Practices

1. **Never expose secrets** - Keep JWT secrets in environment variables
2. **Use HTTPS in production** - Enable secure flag for cookies
3. **Rotate secrets regularly** - Change JWT secrets periodically
4. **Monitor failed attempts** - Track and alert on suspicious activity
5. **Implement rate limiting** - Prevent brute force attacks
6. **Log security events** - Audit all authentication events
7. **Use short-lived access tokens** - Reduce exposure window
8. **Implement token rotation** - Refresh tokens on each use
9. **Revoke sessions on password change** - Force re-authentication
10. **Validate all inputs** - Sanitize and validate all user inputs

---

## Next Steps

1. Implement required services (UsersService, UserSessionsService, etc.)
2. Implement required modules (UsersModule, DatabaseModule)
3. Add global authentication guard to AppModule
4. Implement rate limiting for login endpoint
5. Add email service for password reset and email verification
6. Implement device fingerprinting for enhanced security
7. Add two-factor authentication (2FA) support
8. Implement session analytics dashboard
9. Add audit logging for all authentication events
10. Implement IP-based blocking for suspicious activity
