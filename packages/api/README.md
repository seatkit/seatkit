# @seatkit/api

Backend API server for SeatKit restaurant reservation management system.

## Tech Stack

- **Framework**: Fastify with TypeScript
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Validation**: Zod schemas from @seatkit/types
- **Real-time**: Supabase Realtime WebSockets

## Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

### 3. Database Setup

Generate and run database migrations:

```bash
pnpm db:generate  # Generate migrations from schema
pnpm db:migrate   # Apply migrations to database
pnpm db:studio    # Open Drizzle Studio (database GUI)
```

### 4. Start Development Server

```bash
pnpm dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Health Check
- `GET /health` - Server health status

```json
{
  "status": "ok",
  "timestamp": "2025-10-25T22:34:21.145Z",
  "environment": "development"
}
```

### Reservations

- ✅ `GET /api/reservations` - List all reservations
- ✅ `POST /api/reservations` - Create new reservation
- ✅ `PUT /api/reservations/:id` - Update existing reservation
- ✅ `DELETE /api/reservations/:id` - Delete reservation

**Example Response** (GET /api/reservations):
```json
{
  "reservations": [],
  "count": 0
}
```

**Example Request** (POST /api/reservations):
```json
{
  "date": "2025-10-29T19:30:00.000Z",
  "duration": 120,
  "partySize": 4,
  "category": "dinner",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0100"
  },
  "status": "confirmed",
  "createdBy": "user_123"
}
```

### Coming Soon
- `GET /api/reservations/:id` - Get specific reservation
- WebSocket real-time updates
- Table assignment endpoints

## Testing

### Quick Start

```bash
# Authenticate with Google Cloud (required for test database)
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=seatkit-dev

# Run tests with automatic database setup
pnpm test:local
```

### Test Commands

```bash
# Run all tests once (requires database setup)
pnpm test

# Run tests with automatic database setup (recommended)
pnpm test:local

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test -- --coverage
```

### What `test:local` Does

The `test:local` script handles the complete test setup automatically:

1. **Fetches Credentials**: Gets test database URL from GCP Secret Manager
2. **Runs Migrations**: Executes `pnpm db:migrate:test` to set up schema
3. **Runs Tests**: Executes Vitest with the test database configured

This ensures your test database is always up-to-date before running tests.

### Manual Test Setup

If you prefer to run tests manually or don't have GCP access:

```bash
# 1. Create test database
createdb seatkit_test

# 2. Set test database URL
export TEST_DATABASE_URL="postgresql://localhost:5432/seatkit_test"

# 3. Run migrations
pnpm db:migrate:test

# 4. Run tests
pnpm test
```

### Test Database

Tests use a **separate PostgreSQL database** (`seatkit_test`) to avoid affecting development data:

- Database is automatically reset between test runs
- Migrations run before tests to ensure schema is up-to-date
- Test data is isolated and doesn't persist

### CI/CD

In GitHub Actions, tests run with a PostgreSQL service container:

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_DB: seatkit_test
      POSTGRES_PASSWORD: postgres
```

No GCP authentication required in CI - environment variables are set directly.

## Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm typecheck` - Type checking
- `pnpm test` - Run tests (requires database setup)
- `pnpm test:local` - Run tests with automatic database setup (recommended)
- `pnpm test:watch` - Run tests in watch mode
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Apply database migrations (development)
- `pnpm db:migrate:test` - Apply database migrations (test database)
- `pnpm db:studio` - Open Drizzle Studio

## Project Structure

```
src/
├── index.ts          # Main server setup
├── db/               # Database configuration and schema
│   ├── index.ts      # Database connection
│   ├── schema/       # Drizzle schema definitions
│   └── migrations/   # Generated SQL migrations
├── routes/           # API route handlers
│   └── reservations.ts
├── lib/              # Utility libraries
└── scripts/          # Database and utility scripts
    └── migrate.ts
```

## License

Apache-2.0