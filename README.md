# CEM ERP - Chhayani Earth Movers Enterprise Resource Planning System

## Overview

CEM ERP is a production-grade, modular, and scalable Enterprise Resource Planning system designed for Chhayani Earth Movers. This system is built using modern technologies and follows enterprise-grade architecture patterns to support more than 30 modules in the future.

## Phase 1 Status

**Current Phase: Phase 1 - Architecture Initialization**

This phase focuses on establishing the complete project architecture, folder structure, configuration files, and development environment setup. No business logic or database implementation has been done yet.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Tables**: TanStack Table
- **Forms**: React Hook Form
- **Validation**: Zod

### Backend
- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT + Refresh Token
- **API Documentation**: Swagger
- **Access Control**: RBAC (Role-Based Access Control)

### DevOps
- **Containerization**: Docker & Docker Compose
- **Version Control**: Git
- **Code Quality**: ESLint
- **Code Formatting**: Prettier
- **Git Hooks**: Husky
- **Pre-commit**: lint-staged

---

## Project Structure

```
cem-erp/
├── apps/
│   ├── web/                    # Next.js Frontend Application
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # Reusable UI components
│   │   ├── features/           # Feature-based modules (auth, dashboard, etc.)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── providers/          # React context providers
│   │   ├── services/           # API service layer
│   │   ├── store/              # Zustand state management
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Utility functions
│   │   ├── styles/             # Global styles
│   │   ├── config/             # Configuration files
│   │   ├── constants/          # Application constants
│   │   └── public/             # Static assets
│   │
│   └── api/                    # NestJS Backend Application
│       ├── src/
│       │   ├── auth/           # Authentication module
│       │   ├── users/          # Users module
│       │   ├── roles/          # Roles module
│       │   ├── permissions/    # Permissions module
│       │   ├── dashboard/      # Dashboard module
│       │   ├── company/        # Company module
│       │   ├── settings/       # Settings module
│       │   ├── notifications/  # Notifications module
│       │   ├── activity/       # Activity logging module
│       │   ├── common/         # Common utilities and decorators
│       │   ├── database/       # Database configuration
│       │   ├── config/         # Application configuration
│       │   ├── main.ts         # Application entry point
│       │   └── app.module.ts    # Root module
│       └── prisma/
│           └── schema.prisma   # Prisma schema
│
├── packages/                   # Shared Packages (Monorepo)
│   ├── ui/                     # Shared UI components
│   │   └── src/
│   │       └── index.ts
│   │
│   ├── types/                  # Shared TypeScript types
│   │   └── src/
│   │       └── index.ts
│   │
│   └── utils/                  # Shared utility functions
│       └── src/
│           └── index.ts
│
├── docker-compose.yml          # Docker Compose configuration
├── .gitignore                  # Git ignore rules
├── .eslintrc.json             # ESLint configuration
├── .prettierrc                # Prettier configuration
├── .prettierignore            # Prettier ignore rules
├── .husky/                    # Git hooks
│   ├── pre-commit             # Pre-commit hook
│   └── commit-msg             # Commit message hook
├── package.json               # Root package.json with workspaces
└── README.md                  # This file
```

---

## Folder Explanations

### Root Level

- **`apps/`**: Contains all application-specific code (frontend and backend)
- **`packages/`**: Contains shared packages that can be used across applications in the monorepo
- **`docker-compose.yml`**: Defines multi-container Docker application for development and production
- **`.gitignore`**: Specifies intentionally untracked files to ignore
- **`.eslintrc.json`**: ESLint configuration for code linting
- **`.prettierrc`**: Prettier configuration for code formatting
- **`.prettierignore`**: Files to ignore during Prettier formatting
- **`.husky/`**: Git hooks for automating tasks before commits
- **`package.json`**: Root package.json with workspace configuration for monorepo management

### Frontend (`apps/web/`)

- **`app/`**: Next.js 15 App Router directory for pages and layouts
  - Contains route-based file structure for pages
  - Includes `layout.tsx` for root layout and `page.tsx` for home page
  - Supports nested layouts and routing
  
- **`components/`**: Reusable UI components
  - Generic components used across the application
  - Examples: Button, Input, Modal, etc.
  - Can be organized by category (ui, forms, layout, etc.)
  
- **`features/`**: Feature-based module organization
  - Each feature is a self-contained module with its own components, hooks, and services
  - Examples: auth, dashboard, inventory, accounting, etc.
  - Follows feature-based architecture for better scalability
  
- **`hooks/`**: Custom React hooks
  - Reusable hooks for common functionality
  - Examples: useAuth, useLocalStorage, useDebounce, etc.
  
- **`providers/`**: React Context providers
  - Global state providers and context wrappers
  - Examples: QueryClientProvider, ThemeProvider, AuthProvider
  
- **`services/`**: API service layer
  - HTTP client configuration and API endpoints
  - Abstraction layer for backend communication
  - Uses TanStack Query for data fetching
  
- **`store/`**: Zustand state management stores
  - Global state stores using Zustand
  - Examples: authStore, uiStore, userStore
  
- **`types/`**: TypeScript type definitions
  - Frontend-specific type definitions
  - Interfaces, types, and enums used in the frontend
  
- **`utils/`**: Utility functions
  - Helper functions used across the frontend
  - Examples: formatters, validators, converters
  
- **`styles/`**: Global styles and CSS
  - Global CSS files, theme configurations
  - Custom styles that don't fit in component-level CSS
  
- **`config/`**: Configuration files
  - Frontend configuration (API URLs, feature flags, etc.)
  - Environment-specific configurations
  
- **`constants/`**: Application constants
  - Constant values used throughout the application
  - Examples: API endpoints, error messages, status codes
  
- **`public/`**: Static assets
  - Images, fonts, icons, and other static files
  - Served directly by Next.js

### Backend (`apps/api/`)

- **`src/auth/`**: Authentication module
  - JWT authentication implementation
  - Login, logout, token refresh
  - Password management
  
- **`src/users/`**: Users module
  - User management CRUD operations
  - User profile management
  - User-related business logic
  
- **`src/roles/`**: Roles module
  - Role management for RBAC
  - Role assignments and permissions
  
- **`src/permissions/`**: Permissions module
  - Permission management for RBAC
  - Permission checking and enforcement
  
- **`src/dashboard/`**: Dashboard module
  - Dashboard statistics and analytics
  - KPI calculations and aggregations
  
- **`src/company/`**: Company module
  - Company information management
  - Company settings and preferences
  
- **`src/settings/`**: Settings module
  - Application settings
  - User preferences and configurations
  
- **`src/notifications/`**: Notifications module
  - Notification system
  - Email, SMS, in-app notifications
  
- **`src/activity/`**: Activity logging module
  - Audit trail and activity logging
  - User action tracking
  
- **`src/common/`**: Common utilities
  - Shared decorators, guards, interceptors
  - Common utilities used across modules
  
- **`src/database/`**: Database configuration
  - Prisma client configuration
  - Database connection management
  
- **`src/config/`**: Application configuration
  - Environment configuration
  - App-wide settings
  
- **`src/main.ts`**: Application entry point
  - NestJS application bootstrap
  - Server configuration and middleware setup
  
- **`src/app.module.ts`**: Root module
  - Root NestJS module importing all other modules
  
- **`prisma/schema.prisma`**: Prisma schema
  - Database schema definition
  - Models and relationships

### Shared Packages (`packages/`)

- **`packages/ui/`**: Shared UI components
  - Reusable UI components used across frontend and potentially other apps
  - Styled with Tailwind CSS
  - Follows component library patterns
  
- **`packages/types/`**: Shared TypeScript types
  - Common type definitions used across frontend and backend
  - Ensures type consistency across the monorepo
  - Reduces type duplication
  
- **`packages/utils/`**: Shared utility functions
  - Common utility functions used across the monorepo
  - Examples: formatters, validators, helpers
  - Reduces code duplication

---

## Architecture Principles

### Clean Architecture
- Separation of concerns between layers
- Dependency inversion
- Business logic independence from frameworks

### Feature-Based Architecture
- Modules organized by business features
- Each feature is self-contained
- Easier to maintain and scale

### SOLID Principles
- **Single Responsibility**: Each module/class has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable for base types
- **Interface Segregation**: Clients shouldn't depend on unused interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

### Code Reusability
- Shared packages for common functionality
- No code duplication
- DRY (Don't Repeat Yourself) principle

### Strict TypeScript
- No `any` types (except in specific cases)
- Strict type checking enabled
- Proper type definitions for all code

### Environment Variables
- All configuration through environment variables
- No hardcoded sensitive data
- Environment-specific configurations

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cem-erp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   For Frontend (`apps/web/.env.local`):
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   # Edit .env.local with your configuration
   ```
   
   For Backend (`apps/api/.env`):
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Ensure PostgreSQL is running
   # Run Prisma migrations (when implemented in future phases)
   cd apps/api
   npx prisma migrate dev
   ```

### Development

1. **Start both frontend and backend**
   ```bash
   npm run dev
   ```
   This starts:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - API Docs: http://localhost:3001/api/docs

2. **Start frontend only**
   ```bash
   npm run dev:web
   ```

3. **Start backend only**
   ```bash
   npm run dev:api
   ```

### Building

1. **Build all applications**
   ```bash
   npm run build
   ```

2. **Build frontend only**
   ```bash
   npm run build:web
   ```

3. **Build backend only**
   ```bash
   npm run build:api
   ```

### Code Quality

1. **Lint all code**
   ```bash
   npm run lint
   ```

2. **Fix linting issues**
   ```bash
   npm run lint:fix
   ```

3. **Format code**
   ```bash
   npm run format
   ```

4. **Type checking**
   ```bash
   npm run typecheck
   ```

### Docker Deployment

1. **Build and start all services**
   ```bash
   npm run docker:up
   ```

2. **Stop all services**
   ```bash
   npm run docker:down
   ```

3. **View logs**
   ```bash
   npm run docker:logs
   ```

---

## Available Scripts

### Root Scripts
- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:web` - Start frontend only
- `npm run dev:api` - Start backend only
- `npm run build` - Build all applications
- `npm run build:web` - Build frontend only
- `npm run build:api` - Build backend only
- `npm run lint` - Lint all code
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format all code
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Type check all code
- `npm run clean` - Clean all build artifacts
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers
- `npm run docker:build` - Build Docker images
- `npm run docker:logs` - View Docker logs

### Frontend Scripts (`apps/web/`)
- `npm run dev` - Start Next.js development server
- `npm run build` - Build Next.js for production
- `npm run start` - Start Next.js production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run typecheck` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

### Backend Scripts (`apps/api/`)
- `npm run dev` - Start NestJS in watch mode
- `npm run build` - Build NestJS for production
- `npm run start` - Start NestJS production server
- `npm run start:prod` - Start NestJS in production mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run Prisma migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed database
- `npm run clean` - Clean build artifacts

---

## Git Hooks

The project uses Husky for Git hooks:

### Pre-commit Hook
- Runs `lint-staged` to lint and format staged files
- Ensures code quality before commits

### Commit-msg Hook
- Validates commit messages using commitlint
- Ensures conventional commit format

---

## Environment Variables

### Frontend Environment Variables
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_APP_NAME` - Application name
- `NEXT_PUBLIC_APP_URL` - Application URL
- `NODE_ENV` - Environment (development/production)

### Backend Environment Variables
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRES_IN` - JWT expiration time
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `JWT_REFRESH_EXPIRES_IN` - JWT refresh token expiration
- `BCRYPT_ROUNDS` - Bcrypt hashing rounds

---

## Future Phases

This is Phase 1 of the CEM ERP system. Future phases will include:

- **Phase 2**: Authentication & Authorization Implementation
- **Phase 3**: Database Schema Design & Implementation
- **Phase 4**: Core Module Development (Dashboard, Users, Roles)
- **Phase 5**: Business Module Development (Inventory, Accounting, HR, etc.)
- **Phase 6**: Advanced Features (Reports, Analytics, Integrations)
- **Phase 7**: Testing & Quality Assurance
- **Phase 8**: Deployment & Monitoring

---

## Contributing

This is an internal project for Chhayani Earth Movers. Contribution guidelines will be established in future phases.

---

## License

Proprietary - Chhayani Earth Movers

---

## Support

For support, please contact the development team.

---

**Phase 1 Complete**: Project architecture initialized successfully. Ready for Phase 2 development.
