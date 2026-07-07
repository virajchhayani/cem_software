# Swagger API Documentation - CEM ERP Authentication

## Overview

This document describes the Swagger API documentation for the CEM ERP Authentication endpoints.

---

## Documented Endpoints

### 1. POST /auth/login

**Summary**: User login

**Description**: Authenticate user with email and password. Returns JWT tokens and sets HTTP-only cookies.

**Authentication**: Public

**Request Body**:
```typescript
{
  email: string;           // Required, valid email
  password: string;        // Required, min 8 characters
  deviceName?: string;     // Optional, device name
  deviceType?: string;     // Optional, DESKTOP/MOBILE/TABLET
  browser?: string;        // Optional, browser name
  operatingSystem?: string; // Optional, OS name
  ipAddress?: string;      // Optional, IP address
  country?: string;        // Optional, country code
  city?: string;          // Optional, city name
}
```

**Response (200)**:
```typescript
{
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions?: string[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
```

**Headers**:
- `Set-Cookie`: HTTP-only cookies for access_token, refresh_token, and session_id

**Error Responses**:
- `401` - Invalid credentials
- `429` - Too many login attempts - account locked

---

### 2. POST /auth/refresh

**Summary**: Refresh access token

**Description**: Refresh access token using refresh token. Returns new tokens with rotation.

**Authentication**: JWT Refresh Token

**Request Headers**:
- `Authorization`: Bearer {refreshToken}

**Response (200)**:
```typescript
{
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions?: string[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
```

**Error Responses**:
- `401` - Invalid or expired refresh token

---

### 3. POST /auth/logout

**Summary**: Logout current session

**Description**: Logout from current session. Clears HTTP-only cookies and revokes session.

**Authentication**: JWT Access Token

**Response (200)**:
```typescript
{
  message: "Logout successful";
}
```

**Error Responses**:
- `401` - Unauthorized - invalid or missing token

---

### 4. POST /auth/logout-all

**Summary**: Logout all sessions

**Description**: Logout from all sessions across all devices. Clears cookies and revokes all sessions.

**Authentication**: JWT Access Token

**Response (200)**:
```typescript
{
  message: "All sessions logged out successfully";
}
```

**Error Responses**:
- `401` - Unauthorized - invalid or missing token

---

### 5. POST /auth/change-password

**Summary**: Change password

**Description**: Change user password. Requires old password for verification. Revokes all sessions.

**Authentication**: JWT Access Token

**Request Body**:
```typescript
{
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

**Response (200)**:
```typescript
{
  message: "Password has been changed successfully";
}
```

**Error Responses**:
- `400` - Invalid old password or weak new password
- `401` - Unauthorized - invalid or missing token

---

### 6. POST /auth/password-reset/initiate

**Summary**: Initiate password reset

**Description**: Send password reset email to user. Does not reveal if email exists.

**Authentication**: Public

**Request Body**:
```typescript
{
  email: string;
}
```

**Response (200)**:
```typescript
{
  message: "If the email exists, a password reset link has been sent";
}
```

---

### 7. POST /auth/password-reset/confirm

**Summary**: Reset password with token

**Description**: Reset password using token received in email. Token is single-use and expires in 1 hour.

**Authentication**: Public

**Request Body**:
```typescript
{
  token: string;
  newPassword: string;
  confirmPassword: string;
}
```

**Response (200)**:
```typescript
{
  message: "Password has been reset successfully";
}
```

**Error Responses**:
- `400` - Invalid or expired token

---

### 8. GET /auth/me

**Summary**: Get current user profile

**Description**: Get authenticated user information including current session.

**Authentication**: JWT Access Token

**Response (200)**:
```typescript
{
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  sessionId: string;
}
```

**Error Responses**:
- `401` - Unauthorized - invalid or missing token

---

### 9. GET /auth/sessions

**Summary**: Get all user sessions

**Description**: Get all active and inactive sessions for the authenticated user.

**Authentication**: JWT Access Token

**Response (200)**:
```typescript
[
  {
    id: string;
    deviceName: string;
    deviceType: string;
    browser: string;
    operatingSystem: string;
    ipAddress: string;
    country?: string;
    city?: string;
    loginTime: Date;
    lastActivity: Date;
    isCurrent: boolean;
    status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
    expiresAt: Date;
    deviceDescription: string;
  }
]
```

**Error Responses**:
- `401` - Unauthorized - invalid or missing token

---

### 10. DELETE /auth/sessions/:id

**Summary**: Revoke specific session

**Description**: Revoke a specific session by ID. Cannot revoke current session.

**Authentication**: JWT Access Token

**Parameters**:
- `id` (path): Session ID to revoke

**Response (200)**:
```typescript
{
  message: "Session revoked successfully";
}
```

**Error Responses**:
- `400` - Session not found or does not belong to user
- `401` - Unauthorized - invalid or missing token

---

## Response DTOs

### LoginResponseDto
```typescript
{
  user: UserDto;
  tokens: TokensDto;
}
```

### UserDto
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
}
```

### TokensDto
```typescript
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### SessionResponseDto
```typescript
{
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  country?: string;
  city?: string;
  loginTime: Date;
  lastActivity: Date;
  isCurrent: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  expiresAt: Date;
  deviceDescription: string;
}
```

### UserProfileDto
```typescript
{
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  sessionId: string;
}
```

### MessageResponseDto
```typescript
{
  message: string;
}
```

---

## Authentication & Authorization

### JWT Authentication
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry
- **Token Rotation**: New tokens on each refresh
- **Header**: `Authorization: Bearer {token}`

### Cookie Authentication
- **HTTP-only**: Prevents XSS access
- **Secure**: HTTPS only in production
- **SameSite**: Strict (prevents CSRF)
- **Cookies**:
  - `access_token` - 15 minutes
  - `refresh_token` - 7 days
  - `session_id` - 7 days

### Authorization
- **Role-Based**: SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE, VIEWER
- **Permission-Based**: Granular permissions (e.g., users.read, users.write)
- **Resource Ownership**: User can only access their own resources

---

## Error Responses

### Standard Error Format
```typescript
{
  statusCode: number;
  message: string;
  error: string;
}
```

### Common Error Codes
- `400` - Bad Request (validation error, invalid input)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Cookie Documentation

### Access Token Cookie
```
Name: access_token
Value: {jwt_token}
HttpOnly: true
Secure: true (production)
SameSite: strict
MaxAge: 900000 (15 minutes)
Path: /
Domain: {configured domain}
```

### Refresh Token Cookie
```
Name: refresh_token
Value: {jwt_token}
HttpOnly: true
Secure: true (production)
SameSite: strict
MaxAge: 604800000 (7 days)
Path: /auth/refresh
Domain: {configured domain}
```

### Session ID Cookie
```
Name: session_id
Value: {user_id}
HttpOnly: true
Secure: true (production)
SameSite: strict
MaxAge: 604800000 (7 days)
Path: /
Domain: {configured domain}
```

---

## Swagger UI Access

**Development**: http://localhost:3001/api/docs
**Production**: https://api.yourdomain.com/api/docs

**Features**:
- Interactive API testing
- Request/response examples
- Authentication support (Bearer token)
- Schema documentation
- Error response documentation

---

## Examples

### Login Request
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "P@ssw0rd123"
  }'
```

### Get Profile Request
```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer {access_token}"
```

### Get Sessions Request
```bash
curl -X GET http://localhost:3001/auth/sessions \
  -H "Authorization: Bearer {access_token}"
```

### Revoke Session Request
```bash
curl -X DELETE http://localhost:3001/auth/sessions/{session_id} \
  -H "Authorization: Bearer {access_token}"
```

---

## Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (HTTP-only cookies)
3. **Implement token rotation** on refresh
4. **Handle token expiration** gracefully
5. **Validate all inputs** on client and server
6. **Use rate limiting** on public endpoints
7. **Log all authentication events** for security
8. **Implement session timeout** for inactivity
9. **Revoke sessions** on password change
10. **Use strong passwords** with validation
