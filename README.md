# SeatKit

> Open-source restaurant reservation management system for high-turnover, small-seat restaurants

[![CI](https://github.com/seatkit/seatkit/actions/workflows/ci.yml/badge.svg)](https://github.com/seatkit/seatkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE.md)

**Status**: 🚧 Early Development - API Backend Phase

---

## 🎯 What is SeatKit?

SeatKit is a modern, modular reservation management system built specifically for small restaurants (14-20 seats) with high turnover. Originally deployed as an iOS Swift app for a Japanese-Venetian restaurant in Venice, we're rebuilding it as an open-source TypeScript web application.

### Why SeatKit?

- **Built for Small Restaurants**: Designed for intimate venues where every seat counts
- **Real-Time Collaboration**: Multiple staff members can manage reservations simultaneously
- **Visual Table Management**: See your floor layout and availability at a glance
- **Automated Sales Tracking**: End-of-shift data entry with manager-only editing
- **Open Source & Self-Hosted**: Own your data, customize to your needs

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+ (check: `node --version`)
- **pnpm** 9+ (check: `pnpm --version`)
- **PostgreSQL** 14+ (for local development)
- **Google Cloud** account (for Secret Manager in production)

### 1. Clone the Repository

```bash
git clone https://github.com/seatkit/seatkit.git
cd seatkit
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all dependencies for the monorepo workspace.

### 3. Set Up Local Secrets (Development)

The API uses Google Cloud Secret Manager in production, but for local development you have **three options**:

#### **Option 1: Local `.env` File** (Recommended for Contributors)

Create `packages/api/.env` manually:

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/seatkit_dev
TEST_DATABASE_URL=postgresql://localhost:5432/seatkit_test

# Supabase (use local Supabase or public test instance)
SUPABASE_URL=http://localhost:54321
SUPABASE_PUBLISHABLE_KEY=your-local-key
SUPABASE_SECRET_KEY=your-local-key
```

The Fastify server will automatically fall back to `.env` if GCP authentication fails.

#### **Option 2: Use GCP Secret Manager** (For Core Team)

If you have access to the project's GCP account:

```bash
# Authenticate with Google Cloud
gcloud auth application-default login

# Set project ID
export GOOGLE_CLOUD_PROJECT=seatkit-dev

# Secrets will be fetched automatically on startup
pnpm dev
```

**Note**: You need IAM permissions (`roles/secretmanager.secretAccessor`) on the project to access secrets.

#### **Option 3: Your Own GCP Project**

Set up your own GCP project and secrets:

```bash
cd packages/api
# Edit the script with your credentials
pnpm secrets:setup

# Then set your project ID
export GOOGLE_CLOUD_PROJECT=your-project-id
```

This uploads secrets to your GCP project. See [SECURITY.md](./SECURITY.md) for details.

### 4. Set Up Database

```bash
# Create databases
createdb seatkit_dev
createdb seatkit_test

# Run migrations
cd packages/api
pnpm db:migrate
pnpm db:migrate:test
```

### 5. Build Packages

```bash
# From root
pnpm build
```

This builds all TypeScript packages in dependency order.

### 6. Run Tests

```bash
pnpm test
```

### 7. Start Development Server

```bash
# API server (port 3001)
cd packages/api
pnpm dev
```

Visit `http://localhost:3001/health` to verify the API is running.

---

## 📦 Project Structure

```
seatkit/
├── packages/
│   ├── types/          # ✅ Zod schemas + TypeScript types
│   ├── utils/          # ✅ Shared utilities (date, money, database)
│   ├── api/            # 🚧 Fastify backend + Drizzle ORM
│   ├── engine/         # 📝 Business logic (coming soon)
│   ├── ui/             # 📝 React components (coming soon)
│   └── web/            # 📝 Next.js frontend (coming soon)
├── docs/               # Architecture decision records & guides
└── .github/workflows/  # CI/CD pipelines
```

**Legend**: ✅ Complete | 🚧 In Progress | 📝 Planned

---

## 🛠 Development Workflow

### Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Run tests
pnpm test

# Run tests in watch mode
pnpm --filter @seatkit/api test:watch

# Clean all build artifacts
pnpm clean
```

### Package-Specific Commands

```bash
# Work on a specific package
cd packages/api

# Start dev server
pnpm dev

# Run migrations
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### TypeScript Watch Mode (Recommended)

For real-time type checking during development:

```bash
# Watch all packages
pnpm typecheck:watch

# Or watch specific package
cd packages/types
pnpm typecheck:watch
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development guidelines.

---

## 🏗 Architecture

SeatKit uses a modern monorepo architecture with:

- **Language**: TypeScript 5.x (strict mode) + Node.js 22
- **Package Manager**: pnpm workspaces
- **Build Tool**: Turborepo for fast, cached builds
- **Validation**: Zod for runtime type safety
- **Backend**: Fastify + Drizzle ORM + PostgreSQL
- **Frontend**: Next.js 15 + React 19 (coming soon)
- **Testing**: Vitest + GitHub Actions CI

### Key Design Decisions

- **Pure ESM**: All packages use ES modules
- **Date Handling**: `z.coerce.date()` for unified Date objects across API/DB layers
- **Error Handling**: Result types (`Ok` / `Err`) for type-safe error handling
- **Monorepo**: Shared code, coordinated releases, type-safe cross-package imports

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete technical details.

---

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture & decisions
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow & guidelines
- **[CLAUDE.md](./CLAUDE.md)** - Project context for AI assistance
- **[docs/DOMAIN.md](./docs/DOMAIN.md)** - Business domain & restaurant operations
- **[docs/FEATURES.md](./docs/FEATURES.md)** - Feature specifications
- **[docs/MIGRATION.md](./docs/MIGRATION.md)** - Swift → TypeScript migration notes
- **[docs/ADR-001](./docs/ADR-001-undefined-vs-null-handling.md)** - Architecture decision records

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @seatkit/types test

# Run tests in watch mode
pnpm --filter @seatkit/api test:watch

# Run with coverage
pnpm test -- --coverage
```

### Test Database

Tests use a separate PostgreSQL database (`seatkit_test`) to avoid affecting development data. Migrations run automatically before tests in CI.

---

## 🔒 Security

### Secrets Management

SeatKit uses **Google Cloud Secret Manager** for production secrets. For local development:

**Contributors**: Use a local `.env` file (no GCP account needed)
**Core Team**: Authenticate with `gcloud auth application-default login`
**Your Own Setup**: Run `pnpm secrets:setup` to configure your GCP project

### Secret Names (GCP)

Production and development secrets are stored with environment prefixes:
- `seatkit-dev-supabase-url`
- `seatkit-dev-supabase-publishable-key`
- `seatkit-dev-supabase-secret-key`
- `seatkit-dev-database-url`

Replace `dev` with `prod` for production secrets.

### Authentication Flow

1. **Try GCP Secret Manager** (if `GOOGLE_CLOUD_PROJECT` is set)
2. **Fallback to `.env` file** (in development mode)
3. **Fail** if neither is available

See [SECURITY.md](./SECURITY.md) for security policies and best practices.

---

## 🤝 Contributing

We welcome contributions! This project is in early development, so there's plenty to do.

### Ways to Contribute

- **Code**: Implement features, fix bugs, improve tests
- **Documentation**: Improve guides, add examples, fix typos
- **Design**: UI/UX feedback, component designs
- **Testing**: Try the system, report issues, write tests

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm test && pnpm lint`)
5. Commit with conventional commits (`git commit -m "feat: add amazing feature"`)
6. Push to your fork (`git push origin feat/amazing-feature`)
7. Open a Pull Request

See [DEVELOPMENT.md](./DEVELOPMENT.md) for coding standards.

---

## 📋 Current Progress

### ✅ Phase 1: Foundation (Complete)

- [x] Monorepo setup with Turborepo
- [x] TypeScript configuration (strict mode)
- [x] Core type system (`@seatkit/types`)
- [x] Shared utilities (`@seatkit/utils`)
- [x] ESLint + Prettier configuration
- [x] GitHub Actions CI/CD
- [x] Conventional commits + Changesets

### 🚧 Phase 2: Backend API (In Progress)

- [x] Fastify server setup
- [x] Drizzle ORM + PostgreSQL schema
- [x] Google Secret Manager integration
- [x] Database migrations
- [x] GET /api/reservations
- [x] POST /api/reservations
- [ ] PUT /api/reservations/:id
- [ ] DELETE /api/reservations/:id
- [ ] WebSocket real-time updates

### 📝 Phase 3: Frontend (Planned)

- [ ] Next.js 15 setup
- [ ] React 19 + Redux Toolkit
- [ ] shadcn/ui design system
- [ ] Timeline/Gantt chart view
- [ ] Table layout visualization
- [ ] Real-time collaboration

See [docs/FEATURES.md](./docs/FEATURES.md) for complete roadmap.

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see [LICENSE.md](LICENSE.md) for details.

### Third-Party Notices

See [NOTICE.md](NOTICE.md) for third-party software attributions.

---

## 🙏 Acknowledgments

- **Original iOS App**: Built in Swift for Koenji restaurant (Venice, Italy)
- **Inspiration**: 9 months of production usage informed this redesign
- **Tech Stack**: Built with amazing open-source tools (Fastify, Drizzle, Zod, Next.js)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/seatkit/seatkit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/seatkit/seatkit/discussions)
- **Email**: matteo@seatkit.dev (coming soon)

---

**Built with ❤️ for small restaurants**
