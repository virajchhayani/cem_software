# Authentication Module Architecture

## Overview

This document outlines the complete architecture for the CEM ERP Authentication module, including folder structure, dependencies, configuration, and patterns.

---

## Folder Structure

```
src/auth/
├── auth.module.ts                 # Main module definition
├── auth.controller.ts             # Authentication endpoints
├── auth.service.ts                # Authentication business logic
├── auth.config.ts                 # Authentication configuration
│
├── controllers/                   # Route controllers
│   └── (auth.controller.ts - moved here)
│
├── services/                      # Business logic services
│   ├── auth.service.ts            # Main authentication service
│   └── authorization.service.ts   # Permission management
│
├── repositories/                  # Data access layer
│   ├── auth.repository.ts         # Authentication data access
│   ├── user.repository.ts         # User data access
│   └── session.repository.ts      # Session data access
│
├── guards/                        # Route guards
│   ├── jwt-auth.guard.ts          # JWT authentication guard
│   ├── jwt-refresh.guard.ts       # Refresh token guard
│   ├── roles.guard.ts             # Role-based access guard
│   ├── permissions.guard.ts      # Permission-based access guard
│   ├── owner.guard.ts             # Resource ownership guard
│   └── throttle.guard.ts          # Rate limiting guard
│
├── decorators/                    # Custom decorators
│   ├── public.decorator.ts        # Public route marker
│   ├── roles.decorator.ts         # Role requirement marker
│   ├── permissions.decorator.ts   # Permission requirement marker
│   ├── owner.decorator.ts         # Owner check marker
│   └── current-user.decorator.ts  # Current user injector
│
├── dto/                           # Data Transfer Objects
│   ├── login.dto.ts               # Login request DTO
│   ├── register.dto.ts            # Registration request DTO
│   ├── change-password.dto.ts     # Password change DTO
│   ├── forgot-password.dto.ts      # Forgot password DTO
│   ├── reset-password.dto.ts      # Reset password DTO
│   └── refresh-token.dto.ts       # Token refresh DTO
│
├── strategies/                    # Passport strategies
│   ├── jwt.strategy.ts            # JWT access token strategy
│   ├── jwt-refresh.strategy.ts    # JWT refresh token strategy
│   └── local.strategy.ts          # Local authentication strategy
│
├── interfaces/                    # TypeScript interfaces
│   ├── jwt-payload.interface.ts   # JWT payload interface
│   ├── tokens.interface.ts        # Token response interface
│   ├── auth-response.interface.ts # Auth response interface
│   └── user.interface.ts          # User interface
│
├── constants/                     # Constants and enums
│   ├── auth.constants.ts          # Authentication constants
│   ├── token.constants.ts         # Token constants
│   └── role.constants.ts          # Role constants
│
├── events/                        # Event emitters and handlers
│   ├── auth.events.ts             # Authentication events
│   └── auth.listeners.ts          # Event listeners
│
├── utils/                         # Utility functions
│   ├── password-validator.ts      # Password validation utility
│   ├── token-generator.ts         # Token generation utility
│   └── crypto.util.ts             # Cryptography utilities
│
└── middlewares/                   # Custom middlewares
    ├── auth.middleware.ts         # Authentication middleware
    └── audit.middleware.ts        # Audit logging middleware
```

---

## Module Configuration

### auth.module.ts

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { AuthorizationService } from './services/authorization.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { AuthRepository } from './repositories/auth.repository';
import { UserRepository } from './repositories/user.repository';
import { SessionRepository } from './repositories/session.repository';
import { AuthConfig } from './auth.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forFeature([AuthConfig]),
    
    // Database
    DatabaseModule,
    UsersModule,
    
    // Authentication
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),
    
    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
    
    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60000),
          limit: configService.get<number>('THROTTLE_LIMIT', 10),
        },
      ],
    }),
  ],
  
  controllers: [AuthController],
  
  providers: [
    // Services
    AuthService,
    AuthorizationService,
    
    // Repositories
    AuthRepository,
    UserRepository,
    SessionRepository,
    
    // Strategies
    JwtStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
    
    // Guards (Global)
    // { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  
  exports: [
    AuthService,
    AuthorizationService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
```

---

## Dependencies

### Production Dependencies

```json
{
  "@nestjs/common": "^10.3.0",
  "@nestjs/core": "^10.3.0",
  "@nestjs/platform-express": "^10.3.0",
  "@nestjs/config": "^3.1.0",
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "@nestjs/throttler": "^5.1.0",
  "@nestjs/swagger": "^7.2.0",
  "@prisma/client": "^5.9.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "passport-local": "^1.0.0",
  "bcrypt": "^5.1.1",
  "class-validator": "^0.14.1",
  "class-transformer": "^0.5.1",
  "cookie-parser": "^1.4.6",
  "helmet": "^7.1.0",
  "reflect-metadata": "^0.2.1",
  "rxjs": "^7.8.1"
}
```

### Development Dependencies

```json
{
  "@nestjs/cli": "^10.3.0",
  "@nestjs/schematics": "^10.1.0",
  "@nestjs/testing": "^10.3.0",
  "@types/express": "^4.17.21",
  "@types/jest": "^29.5.11",
  "@types/node": "^22.0.0",
  "@types/passport-jwt": "^4.0.0",
  "@types/passport-local": "^1.0.38",
  "@types/bcrypt": "^5.0.2",
  "@types/cookie-parser": "^1.4.6",
  "@types/helmet": "^0.0.48",
  "@typescript-eslint/eslint-plugin": "^8.0.0",
  "@typescript-eslint/parser": "^8.0.0",
  "eslint": "^9.0.0",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-prettier": "^5.1.0",
  "jest": "^29.7.0",
  "prettier": "^3.2.0",
  "prisma": "^5.9.0",
  "source-map-support": "^0.5.21",
  "ts-jest": "^29.1.1",
  "ts-loader": "^9.5.1",
  "ts-node": "^10.9.2",
  "tsconfig-paths": "^4.2.0",
  "typescript": "^5.4.0"
}
```

---

## Configuration

### auth.config.ts

```typescript
import { registerAs } from '@nestjs/config';

export const AuthConfig = registerAs('auth', () => ({
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Password Configuration
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128'),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },
  
  // Token Configuration
  token: {
    resetPasswordExpiry: parseInt(process.env.RESET_PASSWORD_EXPIRY || '3600000'),
    emailVerificationExpiry: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || '86400000'),
  },
  
  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000'),
    limit: parseInt(process.env.THROTTLE_LIMIT || '10'),
  },
  
  // Session Configuration
  session: {
    maxSessions: parseInt(process.env.MAX_SESSIONS || '5'),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'),
  },
  
  // Security
  security: {
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    requireActiveAccount: process.env.REQUIRE_ACTIVE_ACCOUNT === 'true',
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '1800000'),
  },
}));
```

### Environment Configuration

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Password Configuration
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
BCRYPT_ROUNDS=10

# Token Configuration
RESET_PASSWORD_EXPIRY=3600000
EMAIL_VERIFICATION_EXPIRY=86400000

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10

# Session Configuration
MAX_SESSIONS=5
SESSION_TIMEOUT=3600000

# Security
REQUIRE_EMAIL_VERIFICATION=false
REQUIRE_ACTIVE_ACCOUNT=true
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=1800000

# Application
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PORT=3001
```

---

## Constants

### auth.constants.ts

```typescript
export const AUTH_CONSTANTS = {
  // Token Types
  TOKEN_TYPE: {
    ACCESS: 'access',
    REFRESH: 'refresh',
    RESET_PASSWORD: 'reset_password',
    EMAIL_VERIFICATION: 'email_verification',
  },
  
  // Token Expiry
  TOKEN_EXPIRY: {
    ACCESS: '15m',
    REFRESH: '7d',
    RESET_PASSWORD: '1h',
    EMAIL_VERIFICATION: '24h',
  },
  
  // Cookie Names
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    SESSION_ID: 'session_id',
  },
  
  // Error Messages
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_NOT_FOUND: 'User not found',
    USER_ALREADY_EXISTS: 'User already exists',
    TOKEN_EXPIRED: 'Token has expired',
    TOKEN_INVALID: 'Invalid token',
    ACCOUNT_LOCKED: 'Account is temporarily locked',
    EMAIL_NOT_VERIFIED: 'Email must be verified',
    ACCOUNT_INACTIVE: 'Account is inactive',
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTER_SUCCESS: 'Registration successful',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    EMAIL_VERIFIED: 'Email verified successfully',
  },
};
```

### role.constants.ts

```typescript
export const ROLE_CONSTANTS = {
  ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    EMPLOYEE: 'EMPLOYEE',
    VIEWER: 'VIEWER',
  },
  
  ROLE_HIERARCHY: {
    SUPER_ADMIN: 5,
    ADMIN: 4,
    MANAGER: 3,
    EMPLOYEE: 2,
    VIEWER: 1,
  },
};
```

### token.constants.ts

```typescript
export const TOKEN_CONSTANTS = {
  ALGORITHM: 'HS256',
  ISSUER: 'cem-erp',
  AUDIENCE: 'cem-erp-api',
  
  TOKEN_PREFIX: 'Bearer ',
  
  HEADER_NAME: 'Authorization',
};
```

---

## Interfaces

### jwt-payload.interface.ts

```typescript
export interface JwtPayload {
  sub: string;           // User ID
  email: string;         // User email
  role: string;          // User role
  sessionId: string;     // Session ID
  iat?: number;          // Issued at
  exp?: number;          // Expiration
}

export interface JwtRefreshPayload {
  sub: string;           // User ID
  sessionId: string;     // Session ID
  tokenId: string;      // Token ID
  type: 'refresh';       // Token type
  iat?: number;
  exp?: number;
}
```

### tokens.interface.ts

```typescript
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tokens: Tokens;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### auth-response.interface.ts

```typescript
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
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
  };
}
```

### user.interface.ts

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}
```

---

## Repository Pattern

### auth.repository.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: any) {
    return this.prisma.user.create({
      data,
    });
  }

  async updateUser(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findSession(sessionId: string) {
    return this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });
  }

  async createSession(data: any) {
    return this.prisma.userSession.create({
      data,
    });
  }

  async updateSession(sessionId: string, data: any) {
    return this.prisma.userSession.update({
      where: { id: sessionId },
      data,
    });

  async deleteSession(sessionId: string) {
    return this.prisma.userSession.delete({
      where: { id: sessionId },
    });
  }

  async deleteAllSessions(userId: string) {
    return this.prisma.userSession.deleteMany({
      where: { userId },
    });
  }
}
```

### user.repository.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: any) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findAll(filters: any = {}) {
    return this.prisma.user.findMany({
      where: filters,
    });
  }

  async count(filters: any = {}) {
    return this.prisma.user.count({
      where: filters,
    });
  }
}
```

### session.repository.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.userSession.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId },
    });
  }

  async findByRefreshToken(refreshToken: string) {
    return this.prisma.userSession.findFirst({
      where: { refreshToken },
    });
  }

  async create(data: any) {
    return this.prisma.userSession.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.userSession.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.userSession.delete({
      where: { id },
    });
  }

  async deleteByUserId(userId: string) {
    return this.prisma.userSession.deleteMany({
      where: { userId },
    });
  }

  async revokeAllByUserId(userId: string) {
    return this.prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }
}
```

---

## Global Configuration (main.ts)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers with Helmet
  app.use(helmet());

  // Cookie parser
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Global exception filters
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalFilters(new ValidationExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Swagger documentation
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
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
```

---

## Module Dependencies

### Required Modules

1. **ConfigModule** - Environment configuration
2. **DatabaseModule** - Prisma ORM
3. **UsersModule** - User management
4. **PassportModule** - Authentication strategies
5. **JwtModule** - JWT token management
6. **ThrottlerModule** - Rate limiting

### Optional Modules

1. **EventsModule** - Event-driven architecture
2. **CacheModule** - Token caching
3. **ScheduleModule** - Token cleanup jobs

---

## Architecture Principles

### 1. Separation of Concerns
- Controllers handle HTTP requests/responses
- Services contain business logic
- Repositories handle data access
- DTOs define data structures
- Guards protect routes
- Interceptors transform requests/responses

### 2. Dependency Injection
- All services injected via constructor
- Repositories injected into services
- Configuration injected via ConfigService

### 3. Modular Design
- Each module can be imported independently
- Clear module boundaries
- Reusable components

### 4. Type Safety
- Strong TypeScript typing
- Interfaces for all data structures
- DTOs for validation

### 5. Security First
- Input validation
- Output sanitization
- Rate limiting
- Security headers
- Secure token handling

---

## Data Flow

### Login Flow

```
Client Request
    ↓
AuthController
    ↓
AuthService.validateUser()
    ↓
AuthRepository.findUserByEmail()
    ↓
PrismaService
    ↓
Database
    ↓
AuthService.generateTokens()
    ↓
JwtService.signAsync()
    ↓
AuthRepository.createSession()
    ↓
Response with tokens
```

### Protected Route Flow

```
Client Request (with JWT)
    ↓
JwtAuthGuard
    ↓
JwtStrategy.validate()
    ↓
JwtService.verifyAsync()
    ↓
AuthService.getUserPermissions()
    ↓
PermissionsGuard (if applicable)
    ↓
Controller Method
    ↓
Response
```

---

## Next Steps

1. **Implement Repository Pattern** - Create repository classes
2. **Implement Services** - Create service classes with business logic
3. **Implement Controllers** - Create controller classes with routes
4. **Implement Guards** - Create guard classes for protection
5. **Implement Strategies** - Create Passport strategies
6. **Implement DTOs** - Create DTOs with validation
7. **Implement Events** - Create event emitters and listeners
8. **Implement Utils** - Create utility functions
9. **Implement Middleware** - Create custom middleware
10. **Write Tests** - Create unit and integration tests

---

## Notes

- This architecture follows NestJS best practices
- Repository pattern abstracts data access
- Dependency injection enables testing
- Modular design allows for scalability
- Type safety ensures code quality
- Security is built into the architecture
