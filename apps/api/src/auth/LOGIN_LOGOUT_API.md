# Login & Logout API - CEM ERP Authentication

## Overview

This document describes the complete Login & Logout API implementation for CEM ERP, including session creation, login history tracking, and token management.

---

## API Endpoints

### 1. Login API

**Endpoint**: `POST /auth/login`
**Authentication**: Public
**Request Body**:
```typescript
{
  email: string;
  password: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  operatingSystem?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}
```

**Response**:
```typescript
{
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
```

**Process Flow**:
1. Validate user credentials (email + password)
2. Check account status (active, locked)
3. Log login attempt (success or failure)
4. Handle account lockout on repeated failures
5. Update user's last login information
6. Generate access token (15 min expiry)
7. Generate refresh token (7 day expiry)
8. Create user session with device tracking
9. Mark session as current
10. Mark other sessions as not current
11. Return user and tokens

**Security Features**:
- Password validation with bcrypt
- Account lockout after 5 failed attempts
- Lockout duration: 15 minutes
- Failed attempt tracking
- Device information logging
- IP address logging
- Session creation with device tracking

---

### 2. Refresh Token API

**Endpoint**: `POST /auth/refresh`
**Authentication**: Public (requires valid refresh token)
**Request Headers**:
```
Authorization: Bearer <refresh_token>
```

**Response**:
```typescript
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

**Process Flow**:
1. Extract refresh token from Authorization header
2. Validate refresh token signature
3. Verify session exists and is valid
4. Check session belongs to user
5. Verify session is not revoked
6. Check session has not expired
7. Generate new access token
8. Generate new refresh token
9. Update session with new refresh token hash
10. Update session last activity
11. Return new tokens

**Security Features**:
- Token validation with separate refresh secret
- Session verification
- Token rotation (new tokens on each refresh)
- Activity tracking
- Expiration checking

---

### 3. Logout API

**Endpoint**: `POST /auth/logout`
**Authentication**: Protected (requires valid access token)
**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```typescript
{
  message: 'Logged out successfully'
}
```

**Process Flow**:
1. Extract user from access token
2. Extract session ID from token
3. Revoke specific session
4. Mark session as revoked
5. Update session status to REVOKED
6. Return success message

**Security Features**:
- Session-specific logout
- Session revocation
- Token invalidation

---

### 4. Logout All API

**Endpoint**: `POST /auth/logout-all`
**Authentication**: Protected (requires valid access token)
**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```typescript
{
  message: 'All sessions logged out successfully'
}
```

**Process Flow**:
1. Extract user from access token
2. Revoke all active sessions for user
3. Mark all sessions as revoked
4. Update all session statuses to REVOKED
5. Return success message

**Security Features**:
- Global logout for user
- All session revocation
- Used for security events (password change, compromise)

---

### 5. Get Current User API

**Endpoint**: `GET /auth/me`
**Authentication**: Protected (requires valid access token)
**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```typescript
{
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}
```

**Process Flow**:
1. Extract user from access token
2. Return user information
3. Excludes sensitive data (password, etc.)

---

## Session Creation

### Session Data Structure

When a user logs in, a session is created with the following information:

```typescript
{
  id: string;                    // UUID
  userId: string;                // User ID
  deviceName?: string;           // e.g., "John's iPhone"
  deviceType: DeviceType;        // DESKTOP | MOBILE | TABLET | UNKNOWN
  browser?: string;              // e.g., "Chrome 120.0"
  operatingSystem?: string;      // e.g., "Windows 11"
  ipAddress?: string;            // Client IP address
  country?: string;              // From IP geolocation
  city?: string;                 // From IP geolocation
  userAgent?: string;            // Full user agent string
  refreshTokenHash: string;      // Hashed refresh token
  isCurrent: boolean;            // true for current session
  isRevoked: boolean;            // false initially
  status: SessionStatus;         // ACTIVE initially
  expiresAt: DateTime;           // 7 days from creation
  lastActivity: DateTime;        // Current timestamp
  createdAt: DateTime;           // Current timestamp
  updatedAt: DateTime;           // Current timestamp
  deletedAt?: DateTime;          // For soft delete
}
```

### Session Management

**Current Session**:
- Only one session per user has `isCurrent = true`
- When a new session is created, previous sessions are marked as not current
- Used for identifying the active session

**Session Revocation**:
- Sessions can be revoked individually or all at once
- Revoked sessions have `isRevoked = true` and `status = REVOKED`
- Revoked sessions cannot be used for token refresh

**Session Expiration**:
- Sessions expire after 7 days
- Expired sessions have `status = EXPIRED`
- Expired sessions cannot be used for token refresh

**Activity Tracking**:
- `lastActivity` is updated on each token refresh
- Can be used for session timeout logic
- Helps identify inactive sessions

---

## Login History

### Login Attempt Data Structure

Every login attempt is logged with the following information:

```typescript
{
  id: string;                    // UUID
  email: string;                 // Email used for login
  userId?: string;               // User ID (if user exists)
  ipAddress?: string;            // Client IP address
  browser?: string;              // Browser name and version
  deviceType: DeviceType;        // Device type
  status: LoginStatus;           // SUCCESS | FAILURE | LOCKED | BLOCKED
  failureReason?: string;        // Reason for failure
  createdAt: DateTime;           // Attempt timestamp
}
```

### Login Attempt Tracking

**Successful Attempts**:
- Status: `SUCCESS`
- Logs user ID, IP, browser, device
- Updates user's last login information
- Resets failed login attempt counter

**Failed Attempts**:
- Status: `FAILURE`
- Logs email (not user ID to prevent enumeration)
- Increments failed login attempt counter
- Triggers account lockout after threshold

**Locked Attempts**:
- Status: `LOCKED`
- Occurs when account is locked
- Logs attempt even if credentials are correct
- Prevents login until lockout expires

**Blocked Attempts**:
- Status: `BLOCKED`
- Occurs when IP is blocked
- Used for IP-based blocking
- Prevents login from suspicious IPs

### Account Lockout Logic

**Lockout Threshold**: 5 failed attempts
**Lockout Duration**: 15 minutes

**Process**:
1. Each failed attempt increments counter
2. After 5 attempts, account is locked
3. Lockout time is set to current time + 15 minutes
4. All login attempts during lockout return LOCKED status
5. Successful login resets counter and clears lockout

**Configuration**:
```env
auth.maxLoginAttempts=5
auth.lockoutDuration=15
```

---

## Security Features

### 1. Password Security
- Passwords hashed with bcrypt (10 rounds)
- Never stored in plain text
- Password change tracking
- Password reset with single-use tokens

### 2. Token Security
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Separate secrets for access and refresh tokens
- Tokens stored as hashes in database
- Token rotation on refresh

### 3. Session Security
- Multi-device session support
- Session tracking with device information
- Session revocation capability
- Session expiration handling
- Activity tracking for timeout

### 4. Login Security
- Failed attempt tracking
- Account lockout after threshold
- Lockout duration configuration
- IP address logging
- Device information logging
- User enumeration prevention

### 5. Audit Trail
- comprehensive login history
- Success and failure logging
- Device and IP tracking
- Failure reason logging
- Timestamp tracking

---

## Error Responses

### Login Errors

**Invalid Credentials**:
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

**Account Inactive**:
```json
{
  "statusCode": 401,
  "message": "User account is inactive"
}
```

**Account Locked**:
```json
{
  "statusCode": 401,
  "message": "Account is temporarily locked"
}
```

### Refresh Token Errors

**Invalid Token**:
```json
{
  "statusCode": 401,
  "message": "Invalid refresh token"
}
```

**Token Expired**:
```json
{
  "statusCode": 401,
  "message": "Refresh token has expired"
}
```

**Session Revoked**:
```json
{
  "statusCode": 401,
  "message": "Refresh token has been revoked"
}
```

### Logout Errors

**No Active Session**:
```json
{
  "statusCode": 400,
  "message": "No active session found"
}
```

---

## Rate Limiting

**Default Configuration**:
- 10 requests per minute per IP
- Configured via ThrottlerModule

**Login-Specific Rate Limiting** (to be implemented):
- 5 login attempts per minute per IP
- 10 login attempts per hour per email
- Prevents brute force attacks

---

## Next Steps

1. **Implement Rate Limiting**: Add specific rate limiting for login endpoint
2. **Add Email Service**: Implement email sending for password reset and email verification
3. **Add Device Fingerprinting**: Enhance device detection for security
4. **Add 2FA Support**: Implement two-factor authentication
5. **Add Session Analytics**: Create dashboard for session management
6. **Add Audit Logging**: Log all authentication events
7. **Add IP Blocking**: Implement automatic IP blocking for suspicious activity
8. **Add CAPTCHA**: Add CAPTCHA after multiple failures
9. **Add Session Timeout**: Implement automatic session timeout
10. **Add Biometric Auth**: Support biometric authentication

---

## Testing

### Login Flow Test

```bash
# Successful login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cem.com",
    "password": "password123",
    "deviceName": "Test Device",
    "deviceType": "DESKTOP",
    "browser": "Chrome",
    "ipAddress": "192.168.1.1"
  }'
```

### Refresh Token Flow Test

```bash
# Refresh tokens
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <refresh_token>"
```

### Logout Flow Test

```bash
# Logout current session
curl -X POST http://localhost:3001/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>"

# Logout all sessions
curl -X POST http://localhost:3001/auth/logout-all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>"
```

### Get Current User Test

```bash
# Get current user
curl -X GET http://localhost:3001/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>"
```

---

## Database Tables Used

1. **users** - User account information
2. **user_sessions** - Session management
3. **login_attempts** - Login history tracking
4. **password_reset_tokens** - Password reset tokens
5. **email_verification_tokens** - Email verification tokens

---

## Services Used

1. **AuthService** - Core authentication logic
2. **UsersService** - User CRUD operations
3. **UserSessionsService** - Session management
4. **LoginAttemptsService** - Login attempt logging
5. **EmailVerificationTokensService** - Email verification tokens
6. **PasswordResetTokensService** - Password reset tokens
