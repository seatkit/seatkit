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

### Reservations (Coming Soon)
- `GET /api/reservations` - List reservations
- `POST /api/reservations` - Create reservation
- `PUT /api/reservations/:id` - Update reservation
- `DELETE /api/reservations/:id` - Delete reservation

## Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm typecheck` - Type checking
- `pnpm test` - Run tests
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Apply database migrations
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