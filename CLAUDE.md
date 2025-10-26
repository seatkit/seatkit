# SeatKit - Claude Collaboration Context

> **Last Updated**: 2025-10-26
> **Project Status**: Backend Infrastructure Complete ✅
> **Current Phase**: API Development & Testing
> **Next Milestone**: Complete CRUD Operations

---

## 🎯 Project Overview

**SeatKit** is an open-source restaurant reservation management system, designed specifically for high-turnover, small-seat restaurants that need sophisticated table management and real-time collaboration.

### Origin Story

- **Original**: iOS Swift app "KoenjiApp" built for a specific Japanese-Venetian restaurant
- **Production**: 9 months in production, 1 restaurant, proven solution
- **Migration Goal**: Port to modern TypeScript web application for broader adoption
- **Vision**: Open source tool for any restaurant to configure and deploy

### Why This Project Matters

- **Problem**: Small restaurants (14-18 seats) with high turnover need sophisticated reservation management
- **Solution**: Real-time, collaborative, visual reservation system with automated sales tracking
- **Impact**: Transforms manual reservation chaos into streamlined, data-driven operations

---

## 🏪 Business Context

### Restaurant Profile: Koenji (Original Customer)

- **Concept**: Japanese-Venetian fusion restaurant
- **Size**: 14 dining seats + 4-6 counter bar seats (18-20 total)
- **Style**: Mid-range, high-turnover, intimate atmosphere
- **Beverages**: Japanese sake + natural wines
- **Challenge**: Maximize reservations in minimal space while maintaining quality service

### Current Usage Statistics (Last 7 Days)

- **Database Operations**: 144,220 reads, 1,436 writes
- **API Requests**: 9,000 accepted requests
- **Real-time Connections**: Peak of 6 concurrent snapshot listeners
- **User Base**: ~15 staff members across multiple devices

### Core Business Requirements

1. **High-Turnover Optimization**: Fit maximum reservations without overcrowding
2. **Visual Layout Management**: Staff need to "see" table arrangements and availability
3. **Real-Time Collaboration**: Multiple staff updating reservations simultaneously
4. **Sales Automation**: End-of-shift data entry with manager-only editing
5. **Flexibility**: Handle walk-ins, changes, and special requests dynamically

---

## 🚀 Technical Mission

### Current State (Swift iOS App)

- **Platform**: iOS-only Swift application
- **Architecture**: MVVM + Clean Architecture, dual SQLite/Firestore storage
- **Key Strengths**: Type safety, offline-first, real-time sync, complex domain modeling
- **Limitations**: iOS-only, single restaurant, over-complex layout system

### Target State (TypeScript Web App)

- **Platform**: Modern web application (desktop + mobile responsive)
- **Architecture**: Modular TypeScript ecosystem (see [ARCHITECTURE.md](./ARCHITECTURE.md))
- **Key Improvements**: Cross-platform, configurable, simplified complexity, open source
- **Performance Target**: Match or exceed Swift app responsiveness

### Migration Strategy

- **Approach**: Parallel development (Swift app continues in production)
- **Data**: No migration required initially
- **Features**: Core features first, then expand beyond original scope
- **Timeline**: Foundation → Core → Features → Polish

---

## 🎯 Success Criteria

### MVP Definition

**A working reservation management system that staff can use for core operations:**

✅ **Essential Features (Must Have)**

- Timeline/Gantt chart view of reservations
- List view with filtering and search
- Real-time collaborative editing
- Basic restaurant configuration (hours, reservation times)
- Multi-device support (desktop + mobile)

🎯 **Important Features (Should Have)**

- Sales data entry and basic analytics
- Table layout visualization (simplified from Swift version)
- Session management (who's editing what)
- Reservation categories (lunch/dinner/special)

💡 **Nice to Have Features (Could Have)**

- Advanced analytics and reporting
- Multi-restaurant support
- Customer-facing booking interface
- Advanced table assignment algorithms

### Performance Targets

- **Responsiveness**: Sub-200ms for common operations
- **Concurrent Users**: Support 15 staff members simultaneously
- **Real-time Updates**: <1 second propagation across devices
- **Reliability**: 99.9% uptime for core features

### User Experience Goals

- **Intuitive**: Staff can learn core features in <30 minutes
- **Fast**: No lag that slows down in-restaurant operations
- **Reliable**: Works consistently across devices and network conditions
- **Flexible**: Adapts to different restaurant needs through configuration

---

## 🛠 Development Context

### Solo Developer Project

- **Primary Developer**: Matteo Nassini
- **Goals**: Skill showcase, open source contribution, potential future business
- **Approach**: High-quality, well-documented, production-ready code
- **Timeline**: No hard deadlines, focus on doing it right

### Technology Decisions Made (Phase 1)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete details:

- **Language**: TypeScript 5.x (strict mode) + Node.js 22 + Pure ESM
- **Monorepo**: Turborepo + pnpm workspaces
- **Validation**: Zod for runtime type safety
- **Workflow**: GitHub Flow + Conventional Commits + Changesets
- **Package Structure**: types → utils/engine/ui → api/web

### Code Quality Standards

- **Type Safety**: Maximum TypeScript strictness, runtime validation with Zod
- **Testing**: Comprehensive unit tests, integration tests, E2E for critical paths
- **Documentation**: Code should be self-documenting, complex logic explained
- **Performance**: Profile and optimize real-time operations
- **Security**: Validate all inputs, secure authentication, audit dependencies

### Recent Architectural Decisions (Date Handling)

- **Date Objects**: Use `z.coerce.date()` for unified Date handling across API/DB layers
- **Serialization**: Custom Fastify serializer converts Date objects to ISO strings in JSON responses
- **Validation**: Single Zod schema serves as source of truth for both input validation and type definitions
- **Error Handling**: Standardized error responses (to be centralized in future PR)

---

## 📊 Project Architecture

### Package Organization

```
seatkit/
├── packages/
│   ├── types/          # Zod schemas + TypeScript types (FOUNDATION)
│   ├── utils/          # Shared utilities
│   ├── engine/         # Business logic (reservations, tables, clustering)
│   ├── ui/             # shadcn-based design system
│   ├── api/            # Backend API + database layer
│   ├── web/            # Frontend web application
│   └── config/         # Shared tooling configs
├── docs/              # Comprehensive documentation
└── tools/             # Development utilities
```

### Package Development Status

Current implementation progress across packages:

- ✅ **@seatkit/types** - Complete
  - All domain schemas implemented (Reservation, Table, Session, Sales, Profile, Restaurant, Room)
  - Zod validation with TypeScript type inference
  - Result type utilities for functional error handling
  - Comprehensive test coverage

- ✅ **@seatkit/utils** - Complete
  - Date/time utilities (UTC-based, immutable operations)
  - Money formatting with Intl.NumberFormat
  - Full test coverage with edge cases

- ✅ **@seatkit/eslint-config** - Complete
  - Shared ESLint configuration across packages
  - TypeScript-aware linting rules

- 🚧 **@seatkit/engine** - Not Started
  - Business logic layer (reservations, table clustering, availability)
  - Domain operations and algorithms

- ✅ **@seatkit/api** - CRUD Endpoints In Progress
  - Fastify backend server with Google Secret Manager integration
  - Drizzle ORM + Supabase PostgreSQL with Session Pooler
  - Database schema and migrations working
  - Custom Date serializer for Fastify + Zod + Drizzle integration
  - REST API endpoints:
    - GET /api/reservations ✅
    - POST /api/reservations ✅
    - PUT /api/reservations/:id (pending)
    - DELETE /api/reservations/:id (pending)
  - Health check endpoint ✅

- 🚧 **@seatkit/ui** - Not Started
  - shadcn/ui-based design system
  - Reusable React components

- 🚧 **@seatkit/web** - Not Started
  - Next.js 15 + React 19 frontend
  - Redux Toolkit + RTK Query state management

### Domain Model Overview

**Core Entities** (detailed in [DOMAIN.md](./docs/DOMAIN.md)):

- **Reservation**: Customer booking with time, party size, status, category
- **Table**: Physical restaurant table with capacity, position, availability
- **Session**: Active user session with editing state, device info
- **Sales**: Daily/monthly/yearly sales data with category breakdowns
- **Profile**: User account with permissions and preferences

### Real-Time Architecture

- **Challenge**: Multiple staff editing reservations simultaneously
- **Solution**: Real-time sync with conflict resolution
- **Technology**: WebSockets or Server-Sent Events (TBD in Phase 2)
- **Strategy**: Optimistic updates with rollback on conflicts

---

## 🎨 User Experience Vision

### Primary Users: Restaurant Staff

- **Hosts/Hostesses**: Quick reservation lookup, seating management
- **Servers**: Table status, guest information, special requests
- **Managers**: Sales data, analytics, system configuration
- **Owners**: Business insights, performance tracking

### Key User Workflows

1. **Taking a Reservation**: Phone call → find available slot → confirm booking
2. **Managing Tables**: Visual layout → assign parties → track status
3. **Handling Changes**: Guest calls → modify reservation → update staff
4. **End of Service**: Enter sales data → review day performance
5. **Weekly Planning**: Analyze trends → adjust availability → optimize layout

### Interface Philosophy

- **Mobile-First**: Works perfectly on phones (staff always have phones)
- **Desktop-Enhanced**: Larger screens show more information, better for managers
- **Touch-Friendly**: Large buttons, gestures, no tiny controls
- **Fast Navigation**: Common operations accessible in 2-3 taps/clicks
- **Visual Clarity**: Clear status indicators, intuitive color coding

---

## 🌟 Open Source Strategy

### Target Audience

- **Primary**: Independent restaurants (2-50 seats) needing reservation management
- **Secondary**: Developers wanting to learn modern TypeScript architecture
- **Tertiary**: Hospitality tech companies looking for white-label solutions

### Differentiation

- **Specialized**: Built for small, high-turnover restaurants (not generic booking system)
- **Open Source**: Free alternative to expensive SaaS solutions
- **Configurable**: Adaptable to different restaurant types and workflows
- **Modern Tech**: Showcase of current TypeScript/React best practices
- **Real-World Proven**: Based on production-tested Swift application

### Contribution Strategy

- **Documentation**: Comprehensive guides for setup, configuration, development
- **Examples**: Multiple restaurant configurations (café, fine dining, bar)
- **Modularity**: Clear package boundaries enable focused contributions
- **Standards**: High code quality bars with automated testing and review
- **Community**: Welcoming to developers and restaurant operators alike

---

## 📈 Future Vision

### Short Term (3-6 months)

- Complete TypeScript port of core features
- Deploy first working version
- Basic restaurant configuration system
- Initial open source release

### Medium Term (6-12 months)

- Multi-restaurant support
- Advanced analytics and reporting
- Customer-facing booking interface
- Mobile app (React Native or PWA)

### Long Term (1+ years)

- Thriving open source community
- Ecosystem of plugins and integrations
- Potential SaaS offering for managed hosting
- Industry recognition as go-to small restaurant solution

---

## 🤝 Collaboration Guidelines

### Working with Claude

- **Context**: This document provides essential project context for all discussions
- **Decisions**: Reference [ARCHITECTURE.md](./ARCHITECTURE.md) for technical decisions
- **Features**: See [FEATURES.md](./docs/FEATURES.md) for detailed specifications
- **Domain**: Check [DOMAIN.md](./docs/DOMAIN.md) for business logic questions

### Development Priorities

1. **Correctness**: Get the domain model and business logic right
2. **Performance**: Real-time operations must be fast and reliable
3. **User Experience**: Staff efficiency is paramount
4. **Maintainability**: Code should be easy to understand and extend
5. **Documentation**: Every design decision should be explained

### Communication Style

- **Be Direct**: Clear, actionable feedback preferred
- **Show Examples**: Code examples better than abstract descriptions
- **Consider Users**: Always think about restaurant staff using this daily
- **Think Modular**: Solutions should fit the package architecture
- **Plan Ahead**: Consider implications for open source contributors

---

## 📁 Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture decisions
- **[DOMAIN.md](./docs/DOMAIN.md)** - Business domain and restaurant operations
- **[MIGRATION.md](./docs/MIGRATION.md)** - Swift to TypeScript migration strategy
- **[FEATURES.md](./docs/FEATURES.md)** - Feature specifications and roadmap
- **[TECHNICAL_CONTEXT.md](./docs/TECHNICAL_CONTEXT.md)** - Development standards and patterns

---

_This document serves as the primary context for all SeatKit development. Keep it updated as the project evolves and new insights emerge._
