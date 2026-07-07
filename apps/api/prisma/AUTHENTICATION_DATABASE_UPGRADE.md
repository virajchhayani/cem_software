# Authentication Database Upgrade - Enterprise Level

## Overview

This document describes the enterprise-level upgrade to the authentication database schema for CEM ERP. The upgrade adds comprehensive support for multi-device authentication, session management, password reset, email verification, login history tracking, and account security features.

## Migration Details

**Migration Name**: `20240707_enhance_authentication`
**Migration File**: `prisma/migrations/20240707_enhance_authentication/migration.sql`

---

## New Enums

### SessionStatus
- `ACTIVE`: Session is currently active
- `REVOKED`: Session has been revoked by user or admin
- `EXPIRED`: Session has expired naturally

**Usage**: Tracks the lifecycle of user sessions for multi-device support.

### LoginStatus
- `SUCCESS`: Successful login attempt
- `FAILURE`: Failed login attempt (wrong credentials)
- `LOCKED`: Login attempt on locked account
- `BLOCKED`: Login attempt from blocked IP address

**Usage**: Tracks login attempt outcomes for security monitoring and account lockout logic.

### DeviceType
- `DESKTOP`: Desktop computer
- `MOBILE`: Mobile device
- `TABLET`: Tablet device
- `UNKNOWN`: Unknown or unrecognized device

**Usage**: Categorizes devices for session management and security analytics.

---

## Updated Tables

### Users Table

**New Fields Added:**
- `last_login_ip` (TEXT, Optional): IP address of last successful login
- `last_login_browser` (TEXT, Optional): Browser name from last login
- `last_login_device` (TEXT, Optional): Device type from last login

**Purpose:**
- Enhanced security tracking
- User session context
- Login history analytics
- Fraud detection

**New Relations:**
- `sessions`: One-to-many with UserSession
- `passwordResetTokens`: One-to-many with PasswordResetToken
- `emailVerificationTokens`: One-to-many with EmailVerificationToken
- `loginAttempts`: One-to-many with LoginAttempt

---

## New Tables

### 1. User Sessions Table (`user_sessions`)

**Purpose**: Manage multi-device authentication sessions with comprehensive tracking.

**Fields:**
- `id` (UUID, PK): Unique session identifier
- `userId` (UUID, FK): Reference to user
- `deviceName` (String, Optional): Human-readable device name (e.g., "John's iPhone")
- `deviceType` (DeviceType): Device category (DESKTOP, MOBILE, TABLET, UNKNOWN)
- `browser` (String, Optional): Browser name and version
- `operatingSystem` (String, Optional): Operating system name and version
- `ipAddress` (String, Optional): Client IP address
- `country` (String, Optional): Country from IP geolocation
- `city` (String, Optional): City from IP geolocation
- `userAgent` (String, Optional): Full user agent string
- `refreshTokenHash` (String, Unique): Hashed refresh token for security
- `isCurrent` (Boolean): Whether this is the current active session
- `isRevoked` (Boolean): Whether session has been revoked
- `status` (SessionStatus): Session status (ACTIVE, REVOKED, EXPIRED)
- `expiresAt` (DateTime): Session expiration timestamp
- `lastActivity` (DateTime): Last activity timestamp for session timeout
- `createdAt` (DateTime): Session creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Optional): Soft delete timestamp

**Indexes:**
- `userId`: For user's active sessions
- `refreshTokenHash`: For token validation (unique)
- `expiresAt`: For expired session cleanup
- `status`: For filtering by session status
- `isCurrent`: For identifying current session
- `deletedAt`: For soft delete queries

**Constraints:**
- Unique constraint on `refreshTokenHash`
- Foreign key to `users` with CASCADE delete

**Business Logic:**
- Only one session per user can have `isCurrent = true`
- Sessions auto-expire based on `expiresAt`
- Sessions can be revoked by user or admin
- `lastActivity` updated on each API call for session timeout
- Soft delete for audit trail

---

### 2. Password Reset Tokens Table (`password_reset_tokens`)

**Purpose**: Secure password reset functionality with token-based verification.

**Fields:**
- `id` (UUID, PK): Unique token identifier
- `userId` (UUID, FK): Reference to user requesting reset
- `token` (String, Unique): Random reset token
- `expiresAt` (DateTime): Token expiration (typically 1 hour)
- `usedAt` (DateTime, Optional): When token was used
- `createdAt` (DateTime): Token creation timestamp

**Indexes:**
- `userId`: For user's reset tokens
- `token`: For token validation (unique)
- `expiresAt`: For expired token cleanup
- `usedAt`: For tracking used tokens

**Constraints:**
- Unique constraint on `token`
- Foreign key to `users` with CASCADE delete

**Business Logic:**
- Tokens are single-use (marked by `usedAt`)
- Tokens expire after configurable time
- Multiple unused tokens can exist (user requests multiple resets)
- Used tokens cannot be reused
- Cascade delete when user is deleted

---

### 3. Email Verification Tokens Table (`email_verification_tokens`)

**Purpose**: Secure email verification with token-based confirmation.

**Fields:**
- `id` (UUID, PK): Unique token identifier
- `userId` (UUID, FK): Reference to user to verify
- `token` (String, Unique): Random verification token
- `expiresAt` (DateTime): Token expiration (typically 24-48 hours)
- `verifiedAt` (DateTime, Optional): When email was verified
- `createdAt` (DateTime): Token creation timestamp

**Indexes:**
- `userId`: For user's verification tokens
- `token`: For token validation (unique)
- `expiresAt`: For expired token cleanup
- `verifiedAt`: For tracking verification status

**Constraints:**
- Unique constraint on `token`
- Foreign key to `users` with CASCADE delete

**Business Logic:**
- Tokens are single-use (marked by `verifiedAt`)
- Tokens expire after configurable time
- User can request new verification if token expires
- Verified tokens cannot be reused
- Cascade delete when user is deleted

---

### 4. Login Attempts Table (`login_attempts`)

**Purpose**: Comprehensive login history tracking for security monitoring and account lockout.

**Fields:**
- `id` (UUID, PK): Unique attempt identifier
- `email` (String): Email address used for login attempt
- `userId` (UUID, Optional): Reference to user (if email exists)
- `ipAddress` (String, Optional): Client IP address
- `browser` (String, Optional): Browser name and version
- `deviceType` (DeviceType): Device category
- `status` (LoginStatus): Attempt status (SUCCESS, FAILURE, LOCKED, BLOCKED)
- `failureReason` (String, Optional): Reason for failure (e.g., "Invalid password", "Account locked")
- `createdAt` (DateTime): Attempt timestamp

**Indexes:**
- `email`: For login history by email
- `userId`: For login history by user
- `ipAddress`: For tracking suspicious IPs
- `status`: For filtering by attempt status
- `createdAt`: For time-based queries and cleanup

**Constraints:**
- No foreign key to users (allows tracking attempts for non-existent emails)
- Denormalized email for security (prevents user enumeration)

**Business Logic:**
- All login attempts are logged (success and failure)
- Failed attempts trigger account lockout after threshold
- Suspicious IPs can be blocked based on failure patterns
- userId is optional to prevent user enumeration attacks
- Historical data retained for security analytics
- Old records can be archived based on retention policy

---

## Relationships

```
User (1) ----< (N) UserSession
User (1) ----< (N) PasswordResetToken
User (1) ----< (N) EmailVerificationToken
User (1) ----< (N) LoginAttempt
```

**Cascade Delete Behavior:**
- When a user is deleted, all related sessions, tokens, and login attempts are automatically deleted
- This ensures data consistency and prevents orphaned records

---

## Security Features

### 1. Multi-Device Support
- Users can have multiple active sessions across devices
- Each session tracked with device details
- Users can view and revoke sessions from other devices
- Current session flag for easy identification

### 2. Refresh Token Security
- Refresh tokens stored as hashes (not plain text)
- Unique constraint prevents token reuse
- Session expiration prevents indefinite access
- Revocation capability for compromised sessions

### 3. Password Reset Security
- Single-use tokens prevent replay attacks
- Token expiration limits window of vulnerability
- Used token tracking prevents reuse
- Cascade delete on user deletion

### 4. Email Verification Security
- Single-use tokens prevent replay attacks
- Token expiration limits window of vulnerability
- Verified token tracking prevents reuse
- Cascade delete on user deletion

### 5. Login History Tracking
- All attempts logged for security monitoring
- Failed attempt tracking for account lockout
- IP tracking for suspicious activity detection
- Device tracking for anomaly detection

### 6. Account Lockout
- Failed login attempts tracked in users table
- Automatic lockout after threshold
- Lock expiration time configurable
- Lock status prevents brute force attacks

---

## Index Strategy

### Performance Optimization
- **User Sessions**: Indexed by userId, refreshTokenHash, expiresAt, status
- **Password Reset**: Indexed by userId, token, expiresAt
- **Email Verification**: Indexed by userId, token, expiresAt
- **Login Attempts**: Indexed by email, userId, ipAddress, status, createdAt

### Query Patterns
- **Session Validation**: Lookup by refreshTokenHash (unique index)
- **User Sessions**: Filter by userId and status
- **Expired Cleanup**: Query by expiresAt
- **Login History**: Filter by userId or email with date range
- **Security Monitoring**: Query by ipAddress and status

---

## Constraints

### Unique Constraints
1. `user_sessions.refresh_token_hash`: Prevents token reuse
2. `password_reset_tokens.token`: Prevents token reuse
3. `email_verification_tokens.token`: Prevents token reuse

### Foreign Key Constraints
1. `user_sessions.user_id`: Cascade delete on user deletion
2. `password_reset_tokens.user_id`: Cascade delete on user deletion
3. `email_verification_tokens.user_id`: Cascade delete on user deletion

### Default Values
- `deviceType`: Defaults to 'UNKNOWN'
- `isCurrent`: Defaults to false
- `isRevoked`: Defaults to false
- `status`: Defaults to 'ACTIVE' for sessions
- `lastActivity`: Defaults to current timestamp

---

## Data Retention Policy

### Recommended Retention Periods
- **User Sessions**: 90 days (after expiration)
- **Password Reset Tokens**: 30 days (after expiration)
- **Email Verification Tokens**: 30 days (after expiration)
- **Login Attempts**: 180 days (for security analytics)

### Cleanup Strategy
- Scheduled job to delete expired tokens
- Scheduled job to archive old login attempts
- Soft delete for sessions (audit trail)
- Hard delete for tokens (security)

---

## Migration Execution

### Prerequisites
1. Database backup completed
2. PostgreSQL version >= 14
3. UUID extension enabled
4. No active sessions during migration

### Migration Steps
1. Create new enums
2. Add columns to users table
3. Create new tables
4. Create indexes
5. Drop old refresh_tokens table
6. Generate Prisma client

### Rollback Strategy
1. Restore from backup
2. Or create reverse migration to:
   - Drop new tables
   - Remove new columns from users
   - Drop new enums
   - Restore old refresh_tokens table

---

## API Integration Notes

### Session Management
- Create session on successful login
- Update lastActivity on each request
- Check expiration on each request
- Revoke session on logout
- List sessions for user dashboard
- Revoke specific session from user dashboard

### Password Reset
- Create token on reset request
- Send email with token link
- Validate token on reset
- Mark token as used
- Update user password
- Delete used tokens

### Email Verification
- Create token on registration
- Send email with verification link
- Validate token on verification
- Mark token as verified
- Update user emailVerifiedAt
- Delete verified tokens

### Login History
- Log all login attempts
- Track failed attempts for lockout
- Monitor suspicious IPs
- Provide login history to users
- Alert on unusual login patterns

---

## Performance Considerations

### Index Impact
- New indexes will increase storage by ~10-15%
- Write operations slightly slower due to index updates
- Read operations significantly faster for common queries

### Query Performance
- Session validation: O(1) via unique index
- User sessions list: O(log n) via userId index
- Login history: O(log n) via composite indexes
- Token validation: O(1) via unique index

### Storage Requirements
- User sessions: ~500 bytes per session
- Password tokens: ~200 bytes per token
- Email tokens: ~200 bytes per token
- Login attempts: ~300 bytes per attempt

---

## Security Best Practices

### Token Generation
- Use cryptographically secure random tokens
- Minimum 32 bytes for tokens
- Hash refresh tokens before storage
- Use bcrypt or argon2 for hashing

### Session Management
- Implement session timeout (e.g., 30 minutes inactivity)
- Limit concurrent sessions per user (e.g., 10)
- Force re-authentication for sensitive operations
- Implement session rotation on password change

### Login Security
- Implement rate limiting per IP
- Implement CAPTCHA after multiple failures
- Monitor for brute force patterns
- Block suspicious IPs automatically

### Data Protection
- Encrypt sensitive data at rest
- Use TLS for all database connections
- Implement audit logging for all auth operations
- Regular security audits

---

## Monitoring & Alerting

### Key Metrics to Monitor
- Failed login attempts per user
- Failed login attempts per IP
- Active sessions per user
- Token usage patterns
- Account lockout rate

### Alert Thresholds
- > 5 failed attempts from same IP in 5 minutes
- > 10 failed attempts for same user in 1 hour
- > 20 active sessions for same user
- Unusual login location changes
- Token reuse attempts

---

## Future Enhancements

### Potential Additions
1. Two-factor authentication (2FA) support
2. Biometric authentication tokens
3. Social login integration
4. Single sign-on (SSO) support
5. Session analytics dashboard
6. Automated threat detection
7. IP reputation integration
8. Device fingerprinting

### Scalability Considerations
- Partition login_attempts by date for large datasets
- Shard user_sessions by userId for multi-tenant
- Implement caching for frequently accessed sessions
- Use read replicas for login history queries

---

## Conclusion

This enterprise-level authentication database upgrade provides:
- ✅ Multi-device session management
- ✅ Secure refresh token handling
- ✅ Password reset functionality
- ✅ Email verification system
- ✅ Comprehensive login history
- ✅ Account lockout mechanism
- ✅ Security monitoring capabilities
- ✅ Audit trail compliance

The schema is production-ready and follows enterprise security best practices.
