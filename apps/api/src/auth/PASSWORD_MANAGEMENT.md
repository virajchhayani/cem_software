# Password Management - CEM ERP Authentication

## Overview

This document describes the complete password management implementation for CEM ERP, including forgot password, reset password, change password, and password validation.

---

## Password Validation

### Password Requirements

All passwords must meet the following requirements:

- **Minimum Length**: 8 characters
- **Maximum Length**: 128 characters
- **Lowercase Letter**: At least one (a-z)
- **Uppercase Letter**: At least one (A-Z)
- **Number**: At least one (0-9)
- **Special Character**: At least one (@$!%*?&)
- **Not Common**: Cannot be a common password
- **No Sequential Characters**: Cannot contain sequential characters (e.g., "123", "abc")
- **No Repeated Characters**: Cannot contain 3+ repeated characters (e.g., "aaa")

### Password Strength Scoring

The password validator calculates a strength score based on:

- **Length**: 10 points (base) + 5 points for 12+ chars + 5 points for 16+ chars
- **Lowercase**: 10 points
- **Uppercase**: 10 points
- **Number**: 10 points
- **Special Character**: 10 points
- **Common Password**: -20 points
- **Sequential Characters**: -10 points
- **Repeated Characters**: -10 points

**Strength Levels**:
- **Weak**: Score < 30
- **Fair**: Score 30-49
- **Good**: Score 50-69
- **Strong**: Score 70+

### Password Validator

**Location**: `src/auth/utils/password-validator.ts`

**Methods**:

#### `validate(password: string): PasswordValidationResult`

Validates a password and returns detailed validation results.

**Returns**:
```typescript
{
  isValid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  errors: string[];
  score: number;
}
```

**Example**:
```typescript
const result = PasswordValidator.validate('MyP@ssw0rd123');
// {
//   isValid: true,
//   strength: 'strong',
//   errors: [],
//   score: 70
// }
```

#### `getPasswordRequirements(): string[]`

Returns an array of password requirements for display to users.

**Returns**:
```typescript
[
  'At least 8 characters long',
  'At least one lowercase letter',
  'At least one uppercase letter',
  'At least one number',
  'At least one special character (@$!%*?&)',
  'Not a common password',
  'No sequential characters',
  'No repeated characters'
]
```

---

## API Endpoints

### 1. Forgot Password API

**Endpoint**: `POST /auth/password-reset/initiate`
**Authentication**: Public
**Request Body**:
```typescript
{
  email: string;
}
```

**Response**:
```typescript
{
  message: 'If the email exists, a password reset link has been sent'
}
```

**Process Flow**:
1. Validate email format
2. Check if user exists (don't reveal if not)
3. Delete any existing unused reset tokens
4. Generate secure reset token (64-character hex)
5. Set token expiration to 1 hour
6. Store token in database
7. Send email with reset link (TODO: implement email service)
8. Return success message (same whether user exists or not)

**Security Features**:
- User enumeration prevention (same response for existing/non-existing users)
- Single-use tokens
- Token expiration (1 hour)
- Secure token generation (crypto.randomBytes)
- Automatic cleanup of old tokens

**Email Template** (TODO):
```
Subject: Reset Your CEM ERP Password

Hello,

We received a request to reset your password for CEM ERP.

Click the link below to reset your password:
https://cem-erp.com/auth/reset-password?token=<token>

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Best regards,
CEM ERP Team
```

---

### 2. Reset Password API

**Endpoint**: `POST /auth/password-reset/confirm`
**Authentication**: Public
**Request Body**:
```typescript
{
  token: string;
  newPassword: string;
  confirmPassword: string;
}
```

**Validation Rules**:
- Token must be valid and not expired
- Token must not have been used
- New password must meet all requirements
- New password must be different from old password
- New password and confirm password must match

**Response**:
```typescript
{
  message: 'Password has been reset successfully'
}
```

**Process Flow**:
1. Validate token exists and is valid
2. Check token has not expired
3. Check token has not been used
4. Validate new password strength
5. Check new password is different from old password
6. Hash new password with bcrypt
7. Update user password in database
8. Update password changed timestamp
9. Reset failed login attempts
10. Clear account lockout
11. Mark token as used
12. Revoke all user sessions (force re-login)
13. Return success message

**Security Features**:
- Token validation
- Token expiration checking
- Single-use token enforcement
- Password strength validation
- Password reuse prevention
- Session revocation on password change
- Account lockout reset

**Error Responses**:

**Invalid Token**:
```json
{
  "statusCode": 400,
  "message": "Invalid or expired reset token"
}
```

**Token Expired**:
```json
{
  "statusCode": 400,
  "message": "Token has expired"
}
```

**Token Already Used**:
```json
{
  "statusCode": 400,
  "message": "Token has already been used"
}
```

**Password Validation Failed**:
```json
{
  "statusCode": 400,
  "message": {
    "message": "Password validation failed",
    "errors": [
      "Password must be at least 8 characters long",
      "Password must contain at least one uppercase letter"
    ],
    "strength": "weak"
  }
}
```

**Password Same as Old**:
```json
{
  "statusCode": 400,
  "message": "New password must be different from current password"
}
```

**Passwords Don't Match**:
```json
{
  "message": "Passwords do not match"
}
```

---

### 3. Change Password API

**Endpoint**: `POST /auth/password/change`
**Authentication**: Protected (requires valid access token)
**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**:
```typescript
{
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

**Validation Rules**:
- User must be authenticated
- Old password must be correct
- New password must meet all requirements
- New password must be different from old password
- New password and confirm password must match

**Response**:
```typescript
{
  message: 'Password has been changed successfully'
}
```

**Process Flow**:
1. Extract user from access token
2. Verify old password is correct
3. Validate new password strength
4. Check new password is different from old password
5. Hash new password with bcrypt
6. Update user password in database
7. Update password changed timestamp
8. Reset failed login attempts
9. Clear account lockout
10. Revoke all user sessions (force re-login on all devices)
11. Return success message

**Security Features**:
- Authentication required
- Old password verification
- Password strength validation
- Password reuse prevention
- Session revocation on password change
- Account lockout reset
- Force re-login on all devices

**Error Responses**:

**Current Password Incorrect**:
```json
{
  "statusCode": 400,
  "message": "Current password is incorrect"
}
```

**Password Validation Failed**:
```json
{
  "statusCode": 400,
  "message": {
    "message": "Password validation failed",
    "errors": [
      "Password must be at least 8 characters long",
      "Password must contain at least one uppercase letter"
    ],
    "strength": "weak"
  }
}
```

**Password Same as Old**:
```json
{
  "statusCode": 400,
  "message": "New password must be different from current password"
}
```

**Passwords Don't Match**:
```json
{
  "message": "Passwords do not match"
}
```

---

### 4. Validate Password Strength API

**Endpoint**: `POST /auth/password/validate`
**Authentication**: Public
**Request Body**:
```typescript
{
  password: string;
}
```

**Response**:
```typescript
{
  isValid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  errors: string[];
  score: number;
  requirements: string[];
}
```

**Process Flow**:
1. Validate password against all requirements
2. Calculate strength score
3. Determine strength level
4. Collect validation errors
5. Return complete validation result

**Use Cases**:
- Real-time password strength indicator on signup form
- Real-time password strength indicator on password change form
- User feedback during password entry

**Example Response**:
```json
{
  "isValid": false,
  "strength": "fair",
  "errors": [
    "Password must contain at least one uppercase letter",
    "Password must contain at least one special character (@$!%*?&)"
  ],
  "score": 30,
  "requirements": [
    "At least 8 characters long",
    "At least one lowercase letter",
    "At least one uppercase letter",
    "At least one number",
    "At least one special character (@$!%*?&)",
    "Not a common password",
    "No sequential characters",
    "No repeated characters"
  ]
}
```

---

## Data Transfer Objects (DTOs)

### ForgotPasswordDto

**Location**: `src/auth/dto/forgot-password.dto.ts`

```typescript
export class ForgotPasswordDto {
  @IsString()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;
}
```

### ResetPasswordDto

**Location**: `src/auth/dto/reset-password.dto.ts`

```typescript
export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/^(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/^(?=.*\d)/, { message: 'Password must contain at least one number' })
  @Matches(/^(?=.*[@$!%*?&])/, { message: 'Password must contain at least one special character' })
  newPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  confirmPassword: string;
}
```

### ChangePasswordDto

**Location**: `src/auth/dto/change-password.dto.ts`

```typescript
export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/^(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/^(?=.*\d)/, { message: 'Password must contain at least one number' })
  @Matches(/^(?=.*[@$!%*?&])/, { message: 'Password must contain at least one special character' })
  oldPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/^(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/^(?=.*\d)/, { message: 'Password must contain at least one number' })
  @Matches(/^(?=.*[@$!%*?&])/, { message: 'Password must contain at least one special character' })
  newPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  confirmPassword: string;
}
```

---

## Security Best Practices

### 1. Password Storage
- Passwords are never stored in plain text
- Bcrypt hashing with 10 rounds
- Salt is automatically handled by bcrypt
- Hash comparison is constant-time

### 2. Token Security
- Reset tokens are 64-character hex strings
- Generated using crypto.randomBytes (cryptographically secure)
- Tokens expire after 1 hour
- Tokens are single-use
- Tokens are stored in database (not in URL)

### 3. Session Management
- All sessions are revoked on password change
- Forces re-login on all devices
- Prevents session hijacking
- Resets failed login attempts
- Clears account lockout

### 4. User Enumeration Prevention
- Same response for existing/non-existing users
- No email disclosure in error messages
- Generic success messages

### 5. Password Strength
- Comprehensive validation rules
- Strength scoring system
- Real-time validation feedback
- Common password blacklist
- Sequential character detection
- Repeated character detection

### 6. Password Reuse Prevention
- New password must differ from old password
- Checked via bcrypt comparison
- Prevents password cycling

---

## Database Tables Used

1. **users** - User account information and password hash
2. **password_reset_tokens** - Password reset tokens
3. **user_sessions** - Session management (revoked on password change)

---

## Services Used

1. **AuthService** - Password management logic
2. **UsersService** - User CRUD operations
3. **PasswordResetTokensService** - Password reset token management
4. **UserSessionsService** - Session management (revocation)
5. **PasswordValidator** - Password validation utility

---

## Testing

### Forgot Password Flow Test

```bash
# Initiate password reset
curl -X POST http://localhost:3001/auth/password-reset/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cem.com"
  }'
```

### Reset Password Flow Test

```bash
# Reset password with token
curl -X POST http://localhost:3001/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123...",
    "newPassword": "NewP@ssw0rd123",
    "confirmPassword": "NewP@ssw0rd123"
  }'
```

### Change Password Flow Test

```bash
# Change password (authenticated)
curl -X POST http://localhost:3001/auth/password/change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "oldPassword": "OldP@ssw0rd123",
    "newPassword": "NewP@ssw0rd456",
    "confirmPassword": "NewP@ssw0rd456"
  }'
```

### Validate Password Strength Test

```bash
# Validate password strength
curl -X POST http://localhost:3001/auth/password/validate \
  -H "Content-Type: application/json" \
  -d '{
    "password": "MyP@ssw0rd"
  }'
```

---

## Next Steps

1. **Implement Email Service**: Add email sending capability for password reset links
2. **Add Rate Limiting**: Implement rate limiting for password reset endpoint
3. **Add CAPTCHA**: Add CAPTCHA after multiple failed password reset attempts
4. **Add Password History**: Track password history to prevent reuse
5. **Add Password Expiry**: Implement password expiry policy
6. **Add 2FA**: Add two-factor authentication for password changes
7. **Add Audit Logging**: Log all password change events
8. **Add IP Blocking**: Block suspicious IPs attempting password reset
9. **Add Email Templates**: Create professional email templates
10. **Add SMS Backup**: Add SMS as backup for password reset

---

## Configuration

### Environment Variables

```env
# Password reset token expiration (in milliseconds)
PASSWORD_RESET_TOKEN_EXPIRY=3600000

# Bcrypt rounds for password hashing
BCRYPT_ROUNDS=10

# Maximum password reset attempts per hour
PASSWORD_RESET_MAX_ATTEMPTS=5
```

---

## Common Passwords Blacklist

The following passwords are blocked as they are too common:

- password
- 123456
- 12345678
- qwerty
- abc123
- password123
- admin
- letmein
- welcome
- monkey
- dragon
- master
- hello
- football
- iloveyou
- princess
- sunshine
- ashley
- bailey
- passw0rd
- shadow
- 1234567890
- 111111
- 123123

This list can be extended as needed.
