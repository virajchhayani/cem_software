# Testing Guide - CEM ERP API

## Overview

This document describes the testing structure and guidelines for the CEM ERP API.

---

## Test Structure

```
test/
├── auth/
│   ├── auth.service.spec.ts           # AuthService unit tests
│   ├── token.service.spec.ts           # TokenService unit tests
│   └── guards/
│       ├── jwt-auth.guard.spec.ts      # JWT guard tests
│       ├── jwt-refresh.guard.spec.ts   # Refresh guard tests
│       ├── roles.guard.spec.ts         # Roles guard tests
│       ├── permissions.guard.spec.ts    # Permissions guard tests
│       └── owner.guard.spec.ts         # Owner guard tests
└── auth.controller.spec.ts             # AuthController integration tests
```

---

## Unit Tests

### AuthService Tests (`auth.service.spec.ts`)

**Test Coverage:**
- `validateUser` - User validation with credentials
- `login` - Login with valid/invalid credentials
- `logout` - Session logout
- `logoutAll` - Logout from all sessions
- `refreshTokens` - Token refresh with rotation
- `changePassword` - Password change operations
- `initiatePasswordReset` - Password reset initiation
- `resetPassword` - Password reset with token
- `getSessions` - Retrieve user sessions
- `deleteSession` - Revoke specific session

**Running Tests:**
```bash
npm run test test/auth/auth.service.spec.ts
```

---

### TokenService Tests (`token.service.spec.ts`)

**Test Coverage:**
- `generateTokens` - Access and refresh token generation
- `verifyAccessToken` - Access token verification
- `verifyRefreshToken` - Refresh token verification
- `hashRefreshToken` - Refresh token hashing
- `compareRefreshToken` - Refresh token comparison
- `rotateRefreshToken` - Token rotation
- `parseTimeToMs` - Time parsing utility
- `getAccessTokenExpiration` - Access token expiry
- `getRefreshTokenExpiration` - Refresh token expiry

**Running Tests:**
```bash
npm run test test/auth/token.service.spec.ts
```

---

### Guard Tests

#### JWT Auth Guard (`jwt-auth.guard.spec.ts`)
- Valid token authentication
- Missing token handling
- Invalid token handling
- Malformed token handling

#### JWT Refresh Guard (`jwt-refresh.guard.spec.ts`)
- Valid refresh token authentication
- Missing token handling
- Invalid token handling
- Token type validation

#### Roles Guard (`roles.guard.spec.ts`)
- No roles required
- User has required role
- User has one of multiple roles
- User lacks required role
- User has no role

#### Permissions Guard (`permissions.guard.spec.ts`)
- No permissions required
- SUPER_ADMIN bypass
- ADMIN bypass
- User has all required permissions
- User lacks required permissions
- Unauthenticated user

#### Owner Guard (`owner.guard.spec.ts`)
- No owner check required
- SUPER_ADMIN bypass
- ADMIN bypass
- User owns resource
- User doesn't own resource
- Unauthenticated user
- Resource ID not found

**Running Guard Tests:**
```bash
npm run test test/auth/guards/
```

---

## Integration Tests

### AuthController Tests (`auth.controller.spec.ts`)

**Test Coverage:**
- `POST /auth/login` - Login endpoint
- `POST /auth/logout` - Logout endpoint
- `POST /auth/logout-all` - Logout all sessions
- `POST /auth/change-password` - Change password
- `GET /auth/me` - Get current user
- `GET /auth/sessions` - Get user sessions
- `DELETE /auth/sessions/:id` - Revoke session

**Running Integration Tests:**
```bash
npm run test:e2e test/auth/auth.controller.spec.ts
```

---

## Running Tests

### Run All Tests
```bash
npm run test
```

### Run Unit Tests Only
```bash
npm run test test/auth/
```

### Run Integration Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npm run test test/auth/auth.service.spec.ts
```

### Run Tests with Coverage
```bash
npm run test:cov
```

---

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up database state before each test
3. **Mocking**: Mock external dependencies (services, databases)
4. **Assertions**: Use clear and specific assertions
5. **Coverage**: Aim for >80% code coverage
6. **Edge Cases**: Test error conditions and edge cases
7. **Performance**: Tests should run quickly
8. **Readability**: Use descriptive test names

---

## Test Data

### Mock User
```typescript
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: bcrypt.hashSync('Password123!', 12),
  firstName: 'John',
  lastName: 'Doe',
  role: 'EMPLOYEE',
  isActive: true,
  isEmailVerified: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
};
```

### Mock Session
```typescript
const mockSession = {
  id: 'session-1',
  userId: 'user-1',
  deviceName: 'Test Device',
  deviceType: 'DESKTOP',
  browser: 'Chrome',
  operatingSystem: 'Windows',
  ipAddress: '192.168.1.1',
  isCurrent: true,
  isRevoked: false,
  expiresAt: new Date(Date.now() + 3600000),
};
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
      - run: npm run test:cov
```

---

## Troubleshooting

### Tests Failing with Database Errors
- Ensure test database is configured
- Check database connection string
- Verify Prisma client is generated

### Tests Failing with JWT Errors
- Check JWT_SECRET configuration
- Verify token generation logic
- Ensure token expiration is valid

### Tests Running Slowly
- Use mocks instead of real database connections
- Reduce test data size
- Parallelize independent tests

---

## Next Steps

1. Add E2E tests for complete user flows
2. Add performance tests
3. Add load testing
4. Add security testing
5. Add API contract testing
6. Add visual regression testing
