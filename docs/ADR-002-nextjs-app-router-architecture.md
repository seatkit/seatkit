# ADR-002: Next.js 15 with App Router for Frontend Architecture

## Status
✅ **Accepted** - 2025-10-30

## Context

SeatKit requires a modern web frontend to replace the existing Swift iOS app, with the following requirements:

- **Cross-platform**: Desktop and mobile web support
- **Real-time collaboration**: Multiple staff editing reservations simultaneously
- **Performance**: Sub-200ms response for common operations
- **SEO-friendly**: Restaurant landing pages discoverable by search engines
- **Type safety**: Full TypeScript integration with existing `@seatkit/types` package
- **Multi-tenant**: Support multiple restaurants via subdomain routing (`koenji.seatkit.dev`)
- **Deployment**: Cloudflare Pages (no Vercel vendor lock-in)

The project previously documented Next.js as the frontend framework choice but did not specify **App Router vs Pages Router** or document the architectural rationale.

### The Problem

Multiple React-based solutions exist, each with trade-offs:

1. **Framework choice**: Next.js vs Vite+React vs Remix vs other
2. **Next.js router**: App Router (RSC, modern) vs Pages Router (stable, legacy)
3. **Rendering strategy**: SSR vs SSG vs CSR vs hybrid
4. **Deployment constraints**: Cloudflare Pages adapter compatibility

### Alternative Solutions Considered

#### 1. **Vite + React Router** (Client-Side Only)
**Pros**:
- Fastest dev server (esbuild)
- Simplest configuration
- Full control over bundling
- No vendor lock-in

**Cons**:
- No built-in SSR (worse SEO)
- Manual routing setup
- No file-based routing
- More configuration for optimal production build
- No Server Components

**Verdict**: ❌ Too minimal for a production restaurant app needing SEO

---

#### 2. **Remix** (Full-Stack Framework)
**Pros**:
- Web fundamentals-focused
- Excellent data loading patterns
- Progressive enhancement
- Good Cloudflare Workers support

**Cons**:
- Smaller ecosystem than Next.js
- Less TypeScript tooling
- Steeper learning curve
- Less community resources

**Verdict**: ❌ Good choice, but Next.js ecosystem advantage outweighs benefits

---

#### 3. **Next.js 15 - Pages Router** (Legacy Approach)
**Pros**:
- Mature, battle-tested (5+ years)
- More tutorials and resources
- Simpler mental model (no RSC)
- More Cloudflare adapter stability

**Cons**:
- Legacy mode (not recommended for new projects)
- Larger client bundles (no RSC optimization)
- Future-deprecated (Vercel pushing App Router)
- Worse performance than App Router

**Verdict**: ❌ Legacy mode not suitable for 2025+ project

---

#### 4. **Next.js 15 - App Router** ✅ (Modern Approach)
**Pros**:
- React Server Components (smaller client bundles)
- File-based routing with layouts
- Built-in SSR, SSG, ISR support
- Streaming and Suspense support
- Best TypeScript integration
- Largest React ecosystem
- Cloudflare Pages adapter available (`@cloudflare/next-on-pages`)
- Built-in API routes (if needed for BFF pattern)
- Excellent DX with Fast Refresh

**Cons**:
- Newer (potential bugs, less mature)
- More complex mental model (server vs client components)
- Some Cloudflare adapter limitations
- Requires understanding React Server Components

**Verdict**: ✅ **Best choice** - Modern, performant, future-proof

---

## Decision

**We will use Next.js 15 with App Router for the SeatKit web frontend.**

### Specific Choices

1. **Framework**: Next.js 15.x
2. **Router**: App Router (not Pages Router)
3. **React**: React 19 (with Server Components)
4. **Rendering Strategy**: Hybrid (SSR for landing pages, CSR for dashboard)
5. **Deployment**: Cloudflare Pages with `@cloudflare/next-on-pages` adapter
6. **Styling**: Tailwind CSS (integrates well with Next.js)
7. **Multi-tenant**: Middleware-based subdomain routing

### Rationale

1. **Performance**: React Server Components reduce client bundle size by ~30-40%
2. **SEO**: SSR for restaurant landing pages improves search discoverability
3. **Developer Experience**: Best-in-class TypeScript, Fast Refresh, tooling
4. **Ecosystem**: Largest React community, most packages, best resources
5. **Future-proof**: Next.js 15 App Router is the actively developed path forward
6. **Cloudflare Compatible**: `@cloudflare/next-on-pages` provides good adapter
7. **Type Safety**: Seamless integration with `@seatkit/types` Zod schemas
8. **Portfolio Value**: Modern Next.js 15 + React 19 demonstrates current best practices

### Implementation

#### Package Structure

```
packages/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout (server component)
│   │   ├── page.tsx           # Home page
│   │   ├── loading.tsx        # Global loading UI
│   │   ├── error.tsx          # Global error UI
│   │   └── reservations/      # Reservations feature
│   │       ├── page.tsx       # List view
│   │       ├── [id]/
│   │       │   └── edit/
│   │       │       └── page.tsx  # Edit form
│   │       └── new/
│   │           └── page.tsx   # Create form
│   ├── components/            # React components (client)
│   ├── lib/                   # Utilities, API client
│   ├── stores/                # Zustand stores (client state)
│   └── providers/             # React context providers
├── public/                    # Static assets
├── next.config.mjs           # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS config
└── tsconfig.json             # TypeScript config
```

#### Next.js Configuration

```typescript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,  // Enforce type safety
  },
  eslint: {
    ignoreDuringBuilds: false, // Enforce linting
  },
  // For Cloudflare Pages deployment
  output: 'standalone',
  experimental: {
    serverActions: true,        // Enable Server Actions
  },
};

export default nextConfig;
```

#### Multi-Tenant Routing

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Extract subdomain (e.g., "koenji" from "koenji.seatkit.dev")
  const subdomain = hostname.split('.')[0];

  // Pass subdomain to app via header
  const headers = new Headers(request.headers);
  headers.set('x-restaurant-slug', subdomain);

  return NextResponse.next({ request: { headers } });
}
```

#### TypeScript Configuration

```json
// tsconfig.json
{
  "extends": "@seatkit/config/tsconfig-nextjs.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "plugins": [
      { "name": "next" }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Consequences

### Positive
- ✅ Best performance with React Server Components
- ✅ Excellent TypeScript and developer experience
- ✅ SEO-friendly with SSR for public pages
- ✅ File-based routing reduces boilerplate
- ✅ Built-in optimizations (Image, Font, Script)
- ✅ Streaming and Suspense for better UX
- ✅ Large ecosystem and community support
- ✅ Multi-tenant via middleware is straightforward
- ✅ Cloudflare Pages deployment possible

### Negative
- ⚠️ App Router is newer (less battle-tested than Pages Router)
- ⚠️ React Server Components mental model requires learning
- ⚠️ `@cloudflare/next-on-pages` has some limitations vs Vercel
- ⚠️ Potential bundle size increase if not careful with client boundaries
- ⚠️ Some third-party libraries don't support RSC yet

### Mitigation
- Use React Server Components by default, opt into client components only when needed (`'use client'`)
- Test Cloudflare Pages deployment early to catch adapter limitations
- Follow Next.js 15 best practices for optimal bundle size
- Monitor community for RSC-compatible alternatives to unsupported libraries
- Document server vs client component patterns for consistency

## References

- **Next.js 15 Documentation**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **React Server Components**: [https://react.dev/reference/rsc/server-components](https://react.dev/reference/rsc/server-components)
- **Cloudflare Next.js Adapter**: [https://github.com/cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
- **App Router Migration**: [https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- **Architecture document**: [/ARCHITECTURE.md](/ARCHITECTURE.md)
- **Project context**: [/CLAUDE.md](/CLAUDE.md)

---

## Pattern for Future Development

### Server vs Client Components

Follow these guidelines when creating new components:

```typescript
// ✅ Do: Server Component (default)
// No 'use client' directive - runs on server
export default async function ReservationList() {
  const data = await fetchReservations(); // Can use async/await
  return <div>{/* ... */}</div>;
}

// ✅ Do: Client Component (when needed)
// Add 'use client' for interactivity, hooks, browser APIs
'use client';

import { useState } from 'react';

export function ReservationForm() {
  const [formData, setFormData] = useState({});
  return <form>{/* ... */}</form>;
}
```

### When to Use Client Components

Use `'use client'` only when you need:
- React hooks (`useState`, `useEffect`, `useContext`)
- Event handlers (`onClick`, `onSubmit`)
- Browser APIs (`localStorage`, `window`)
- Third-party libraries that require client rendering

Keep as much code as possible in Server Components for optimal performance.

### Multi-Tenant Pattern

Access restaurant context in any component:

```typescript
import { headers } from 'next/headers';

export default async function RestaurantDashboard() {
  const headersList = headers();
  const restaurantSlug = headersList.get('x-restaurant-slug') || 'koenji';

  // Fetch restaurant-specific data
  const restaurant = await getRestaurantBySlug(restaurantSlug);

  return <div>{restaurant.name}</div>;
}
```

This ensures all pages automatically support multi-tenancy without prop drilling.
