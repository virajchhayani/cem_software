# Security & Documentation - CEM ERP API

## Overview

This document describes the security measures, logging, exception handling, rate limiting, Swagger documentation, and unit testing implementation for CEM ERP API.

---

## Security Measures

### 1. Helmet - Security Headers

**Purpose**: Sets various HTTP headers to secure the application against well-known web vulnerabilities.

**Implementation**: Applied globally in `main.ts`

**Security Headers Set**:
- **X-Content-Type-Options**: Prevents MIME-type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-XSS-Protection**: Enables XSS protection
- **Strict-Transport-Security**: Enforces HTTPS (in production)
- **Content-Security-Policy**: Controls resource loading
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Controls browser features

**Usage**:
```typescript
import helmet from 'helmet';

app.use(helmet());
```

**Configuration**:
```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

---

### 2. Rate Limiting

**Purpose**: Prevents brute force attacks and API abuse by limiting request rates.

**Implementation**: Uses `@nestjs/throttler` module

**Default Configuration**:
```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000,      // Time window in milliseconds (1 minute)
    limit: 10,       // Maximum requests per window
  },
])
```

**Custom Rate Limiting**:
```typescript
@Throttle(5, 60)  // 5 requests per minute
@Post('sensitive-endpoint')
sensitiveEndpoint() { }
```

**Rate Limiting by Endpoint**:

**Login Endpoint** (recommended):
```typescript
@Throttle(5, 60)  // 5 login attempts per minute
@Post('login')
login() { }
```

**Password Reset Endpoint** (recommended):
```typescript
@Throttle(3, 3600)  // 3 password reset attempts per hour
@Post('password-reset/initiate')
initiatePasswordReset() { }
```

**Rate Limiting Response**:
```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "error": "Too Many Requests"
}
```

**Custom Throttle Guard**:
```typescript
@Injectable()
export class ThrottleGuard extends NestThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip || req.connection.remoteAddress;
  }

  protected errorMessage: string = 'Too many requests, please try again later';
}
```

---

### 3. CORS Configuration

**Purpose**: Controls cross-origin resource sharing to prevent unauthorized access.

**Implementation**: Configured in `main.ts`

**Configuration**:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
});
```

**Environment Variables**:
```env
FRONTEND_URL=http://localhost:3000
```

**Production Configuration**:
```typescript
app.enableCors({
  origin: [
    'https://cem-erp.com',
    'https://app.cem-erp.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
});
```

---

### 4. Input Validation

**Purpose**: Validates and sanitizes user input to prevent injection attacks.

**Implementation**: Uses `class-validator` and `class-transformer`

**Global Validation Pipe**:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,                    // Strip non-whitelisted properties
    forbidNonWhitelisted: true,         // Throw error if non-whitelisted properties
    transform: true,                    // Transform payloads to DTO instances
    disableErrorMessages: process.env.NODE_ENV === 'production',  // Hide errors in production
  }),
);
```

**DTO Validation Example**:
```typescript
export class CreateUserDto {
  @IsString()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;
}
```

---

## Exception Filters

### 1. HttpExceptionFilter

**Purpose**: Catches all HTTP exceptions and formats error responses consistently.

**Location**: `src/common/filters/http-exception.filter.ts`

**Error Response Format**:
```json
{
  "statusCode": 404,
  "timestamp": "2024-07-07T10:00:00.000Z",
  "path": "/api/users/123",
  "method": "GET",
  "message": "User not found",
  "error": "Not Found",
  "details": null
}
```

**Features**:
- Logs all errors with stack traces
- Formats error responses consistently
- Includes request context (path, method, timestamp)
- Preserves original error messages

**Usage**: Applied globally in `main.ts`

---

### 2. ValidationExceptionFilter

**Purpose**: Catches validation errors and formats them with field-level details.

**Location**: `src/common/filters/validation-exception.filter.ts`

**Validation Error Response**:
```json
{
  "statusCode": 400,
  "timestamp": "2024-07-07T10:00:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "email must be a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters long"
    }
  ]
}
```

**Features**:
- Extracts field names from validation messages
- Provides detailed field-level errors
- Logs validation warnings
- User-friendly error messages

**Usage**: Applied globally in `main.ts`

---

## Logging

### LoggingInterceptor

**Purpose**: Logs all incoming requests and outgoing responses.

**Location**: `src/common/interceptors/logging.interceptor.ts`

**Log Format**:
```
Incoming Request: POST /api/auth/login - IP: 192.168.1.1 - UserAgent: Mozilla/5.0...
Outgoing Response: POST /api/auth/login - Status: 200 - Duration: 150ms
Request Error: POST /api/auth/login - Error: Invalid credentials - Duration: 50ms
```

**Features**:
- Logs request method, URL, IP, and user agent
- Logs response status and duration
- Logs errors with stack traces
- Performance monitoring (request duration)

**Usage**: Applied globally in `main.ts`

**Log Levels**:
- **LOG**: Normal request/response logging
- **WARN**: Validation errors
- **ERROR**: Application errors

**Production Logging**:
```typescript
// Consider using Winston or Pino for production
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

WinstonModule.forRoot({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

---

## Response Transformation

### TransformInterceptor

**Purpose**: Transforms all responses to a consistent format.

**Location**: `src/common/interceptors/transform.interceptor.ts`

**Response Format**:
```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "message": "Request successful",
  "timestamp": "2024-07-07T10:00:00.000Z"
}
```

**Features**:
- Consistent response format across all endpoints
- Success flag for easy error handling
- Timestamp for response tracking
- Message for user feedback

**Usage**: Applied globally in `main.ts`

---

## Swagger Documentation

### Configuration

**Location**: `src/main.ts`

**Swagger Setup**:
```typescript
const config = new DocumentBuilder()
  .setTitle('CEM ERP API')
  .setDescription('Chhayani Earth Movers Enterprise Resource Planning System API')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .addTag('auth', 'Authentication endpoints')
  .addTag('users', 'User management endpoints')
  .addTag('permissions', 'Permission management endpoints')
  .addTag('roles', 'Role management endpoints')
  .build();
```

**Access**: `http://localhost:3001/api/docs`

### API Documentation with Swagger

**Adding Documentation to Controllers**:
```typescript
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    // Implementation
  }
}
```

**Adding Documentation to DTOs**:
```typescript
@ApiProperty({ example: 'user@example.com' })
@IsEmail()
email: string;

@ApiProperty({ example: 'P@ssw0rd123', minLength: 8 })
@IsString()
@MinLength(8)
password: string;
```

**Authentication in Swagger**:
1. Click "Authorize" button in Swagger UI
2. Enter JWT token (without "Bearer " prefix)
3. Click "Authorize"
4. All subsequent requests will include the token

---

## Unit Testing

### Test Structure

**Location**: `src/auth/auth.spec.ts`

**Test Setup**:
```typescript
describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  // ... other mocks

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        // ... other providers
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Test Examples

**Test: validateUser - Valid Credentials**:
```typescript
it('should return user if credentials are valid', async () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    passwordHash: await bcrypt.hash('password', 10),
    isActive: true,
    lockedUntil: null,
  };

  mockUsersService.findByEmail.mockResolvedValue(mockUser);
  jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

  const result = await service.validateUser('test@example.com', 'password');

  expect(result).toEqual(mockUser);
  expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
});
```

**Test: validateUser - Invalid Credentials**:
```typescript
it('should return null if password is invalid', async () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    passwordHash: await bcrypt.hash('password', 10),
    isActive: true,
    lockedUntil: null,
  };

  mockUsersService.findByEmail.mockResolvedValue(mockUser);
  jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

  const result = await service.validateUser('test@example.com', 'wrong-password');

  expect(result).toBeNull();
});
```

**Test: generateTokens**:
```typescript
it('should generate access and refresh tokens', async () => {
  const mockAccessToken = 'access-token';
  const mockRefreshToken = 'refresh-token';

  mockJwtService.signAsync
    .mockResolvedValueOnce(mockAccessToken)
    .mockResolvedValueOnce(mockRefreshToken);

  const result = await service.generateTokens('1', 'test@example.com', 'EMPLOYEE');

  expect(result).toHaveProperty('accessToken', mockAccessToken);
  expect(result).toHaveProperty('refreshToken', mockRefreshToken);
  expect(result).toHaveProperty('expiresIn');
  expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
});
```

### Running Tests

**All Tests**:
```bash
npm test
```

**Watch Mode**:
```bash
npm run test:watch
```

**Coverage Report**:
```bash
npm run test:cov
```

**E2E Tests**:
```bash
npm run test:e2e
```

### Test Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

---

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files
- Use `.env.example` as template
- Rotate secrets regularly
- Use different secrets for development/staging/production

### 2. Password Security
- Use bcrypt with minimum 10 rounds
- Never store plain text passwords
- Implement password complexity requirements
- Enforce password rotation

### 3. Token Security
- Use strong secrets for JWT signing
- Implement token expiration
- Use separate secrets for access/refresh tokens
- Implement token rotation

### 4. Input Validation
- Validate all user input
- Sanitize data before processing
- Use parameterized queries
- Implement rate limiting

### 5. Error Handling
- Never expose sensitive information in errors
- Log errors securely
- Use generic error messages in production
- Implement proper exception handling

### 6. Logging
- Log security events
- Monitor for suspicious activity
- Implement log rotation
- Secure log storage

### 7. API Security
- Implement authentication
- Use HTTPS in production
- Implement rate limiting
- Use CORS properly

### 8. Dependencies
- Keep dependencies updated
- Use `npm audit` regularly
- Review security advisories
- Use lock files

---

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Request Rate**: Monitor for unusual spikes
2. **Error Rate**: Alert on high error rates
3. **Response Time**: Monitor performance degradation
4. **Failed Logins**: Alert on brute force attempts
5. **Rate Limit Hits**: Monitor for abuse

### Recommended Tools

- **Application Monitoring**: New Relic, Datadog, AppDynamics
- **Log Aggregation**: ELK Stack, Splunk, Graylog
- **Error Tracking**: Sentry, Rollbar, Bugsnag
- **Performance Monitoring**: APM tools
- **Security Monitoring**: SIEM solutions

---

## Security Checklist

### Development
- [ ] Environment variables configured
- [ ] CORS configured correctly
- [ ] Input validation implemented
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Rate limiting configured
- [ ] Security headers configured

### Production
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] Error messages sanitized
- [ ] Logging enabled
- [ ] Monitoring configured
- [ ] Secrets rotated
- [ ] Dependencies updated
- [ ] Security audit performed

---

## Next Steps

1. **Implement Winston**: Replace console logging with Winston
2. **Add API Key Authentication**: Implement API key support for external integrations
3. **Implement IP Whitelisting**: Add IP-based access control
4. **Add Request Signing**: Implement request signing for sensitive endpoints
5. **Implement 2FA**: Add two-factor authentication
6. **Add Security Headers**: Configure additional security headers
7. **Implement Audit Logging**: Add comprehensive audit trail
8. **Add Security Monitoring**: Implement real-time security monitoring
9. **Implement DDoS Protection**: Add DDoS protection measures
10. **Add Penetration Testing**: Schedule regular penetration tests

---

## Configuration

### Environment Variables

```env
# Security
NODE_ENV=production
FRONTEND_URL=https://cem-erp.com

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Swagger
SWAGGER_ENABLED=false  # Disable in production
```

---

## Troubleshooting

### Helmet Issues
- **Problem**: CORS errors after adding Helmet
- **Solution**: Ensure CORS is configured before Helmet

### Rate Limiting Issues
- **Problem**: Legitimate requests blocked
- **Solution**: Adjust rate limits or implement whitelisting

### Swagger Issues
- **Problem**: Swagger not accessible
- **Solution**: Ensure Swagger is enabled and route is correct

### Test Failures
- **Problem**: Tests failing due to missing dependencies
- **Solution**: Ensure all mocks are properly configured
