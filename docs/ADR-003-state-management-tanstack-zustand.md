# ADR-003: TanStack Query + Zustand for State Management

## Status
✅ **Accepted** - 2025-10-30
⚠️ **Override** - Supersedes previous Redux Toolkit + RTK Query decision

## Context

SeatKit's web application requires sophisticated state management to handle:

- **Server state**: Reservations, tables, sales data from REST API
- **Real-time updates**: Multiple staff editing simultaneously (future: Supabase Realtime)
- **Optimistic updates**: Instant UI feedback before API confirmation
- **UI state**: Modals, filters, form drafts, notifications
- **Cache invalidation**: Keep data fresh across operations
- **Error handling**: Graceful failure recovery and rollback

The project previously documented **Redux Toolkit + RTK Query** as the state management solution (ARCHITECTURE.md, Phase 3). However, after detailed analysis, we identified a more suitable modern approach for this project's specific needs.

### The Problem

State management in modern React apps involves two distinct concerns:

1. **Server State**: API data with caching, loading, error, refetching logic
2. **UI State**: Client-side state (modals, filters, form inputs)

Redux Toolkit + RTK Query handles both but introduces significant boilerplate, especially for CRUD operations across multiple entities (Reservations, Tables, Sessions, Sales, Profiles, Restaurants, Rooms).

### Alternative Solutions Considered

#### 1. **Redux Toolkit + RTK Query** (Previous Decision)
**Pros**:
- Mature, battle-tested (large ecosystem)
- Single store for all state
- Excellent DevTools
- Predictable state updates
- Good documentation

**Cons**:
- **High boilerplate**: ~160 LoC per entity × 7 entities = ~1,120 LoC
- API definition, slice creation, store configuration, tag invalidation
- Steep learning curve for contributors
- Complex setup for real-time integration
- Action creators, reducers, selectors all need definition
- Not optimized for server state specifically

**Example (Reservations only)**:
```typescript
// API definition (~50 lines)
export const reservationsApi = createApi({
  reducerPath: 'reservationsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Reservation'],
  endpoints: (builder) => ({
    getReservations: builder.query<ReservationsResponse, void>({
      query: () => '/reservations',
      providesTags: ['Reservation'],
    }),
    createReservation: builder.mutation<Reservation, CreateReservationInput>({
      query: (body) => ({
        url: '/reservations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Reservation'],
    }),
    // ... updateReservation, deleteReservation
  }),
});

// Slice for additional state (~40 lines)
const reservationsSlice = createSlice({
  name: 'reservations',
  initialState: { filters: {}, selectedId: null },
  reducers: {
    setFilters: (state, action) => { state.filters = action.payload; },
    selectReservation: (state, action) => { state.selectedId = action.payload; },
  },
});

// Store configuration (~30 lines)
export const store = configureStore({
  reducer: {
    [reservationsApi.reducerPath]: reservationsApi.reducer,
    reservations: reservationsSlice.reducer,
    // ... repeat for 6 more entities
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(reservationsApi.middleware),
});

// Export hooks
export const {
  useGetReservationsQuery,
  useCreateReservationMutation,
  useUpdateReservationMutation,
  useDeleteReservationMutation,
} = reservationsApi;
```

**Total per entity**: ~160 lines × 7 entities = **~1,120 lines of boilerplate**

**Verdict**: ❌ Too much boilerplate for a solo dev project with clear CRUD patterns

---

#### 2. **Zustand Only** (Minimalist Approach)
**Pros**:
- Minimal boilerplate (~30 LoC per entity)
- Simple hooks API
- No Provider wrappers needed
- Easy to learn

**Cons**:
- Manual API call management
- No built-in caching strategy
- No refetching/polling logic
- Need to build optimistic updates yourself
- No devtools by default

**Verdict**: ❌ Too minimal - would spend time rebuilding features TanStack Query provides

---

#### 3. **TanStack Query Only** (Server State Specialist)
**Pros**:
- Built for server state (caching, refetching, deduplication)
- Optimistic updates out of the box
- Excellent DevTools
- ~40 LoC per entity
- Automatic background refetching
- Polling support for real-time updates

**Cons**:
- No solution for UI state (modals, filters)
- Would need another library for local state
- Not a "complete" solution alone

**Verdict**: ⚠️ Excellent for API, but needs pairing with UI state solution

---

#### 4. **TanStack Query + Zustand** ✅ (Hybrid Approach)
**Pros**:
- **Best of both worlds**: TanStack Query for server, Zustand for UI
- **Minimal boilerplate**: ~40 LoC (TanStack) + ~20 LoC (Zustand) = ~60 LoC per entity
- Clear separation of concerns (server vs client state)
- Both libraries work great with React Server Components
- Simple learning curve for contributors
- Modern, industry-standard approach
- Great for real-time integration (Supabase Realtime + TanStack Query)

**Cons**:
- Two libraries instead of one
- Need to coordinate state across both
- Slightly less integrated DevTools

**Example (Reservations only)**:
```typescript
// TanStack Query hooks (~40 lines)
export function useReservations() {
  return useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const res = await fetch('/api/reservations');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateReservationInput) => {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

// Zustand store for UI state (~20 lines)
export const useReservationStore = create<ReservationUIState>((set) => ({
  filters: { status: undefined, dateRange: undefined },
  selectedId: null,
  isModalOpen: false,
  setFilters: (filters) => set({ filters }),
  selectReservation: (id) => set({ selectedId: id }),
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));
```

**Total per entity**: ~60 lines × 7 entities = **~420 lines total** (vs 1,120 for Redux)

**Savings**: **~700 lines of code** across all entities

**Verdict**: ✅ **Best choice** - minimal boilerplate, clear patterns, modern approach

---

## Decision

**We will use TanStack Query for server state management and Zustand for UI state management, overriding the previous Redux Toolkit + RTK Query decision.**

### Specific Choices

1. **Server State**: TanStack Query (React Query) v5
2. **UI State**: Zustand v4
3. **Caching Strategy**: Stale-while-revalidate with 5-minute cache time
4. **Real-time**: TanStack Query polling (Phase 1) → Supabase Realtime + invalidation (Phase 2)
5. **Optimistic Updates**: TanStack Query's `onMutate` + `onError` rollback
6. **DevTools**: TanStack Query DevTools + Zustand DevTools

### Rationale

1. **Code Volume**: Saves ~700 LoC compared to Redux Toolkit (~63% reduction)
2. **Learning Curve**: TanStack Query + Zustand simpler to learn than Redux patterns
3. **Server State Specialist**: TanStack Query purpose-built for API data management
4. **Separation of Concerns**: Server state (TanStack) vs UI state (Zustand) clearly separated
5. **Real-time Friendly**: Easier integration with Supabase Realtime (just invalidate queries on WebSocket events)
6. **Modern Standard**: Industry momentum toward TanStack Query for React server state
7. **Solo Dev Efficiency**: Less code = less to maintain alone
8. **Portfolio Value**: Demonstrates knowledge of modern React patterns (2024+)
9. **Next.js Compatible**: Both libraries work seamlessly with React Server Components

### Implementation

#### TanStack Query Setup

```typescript
// src/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

#### Query Hooks Pattern

```typescript
// src/lib/queries/reservations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Reservation, CreateReservationInput } from '@seatkit/types';

// GET /api/reservations
export function useReservations() {
  return useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const res = await fetch('/api/reservations');
      if (!res.ok) throw new Error('Failed to fetch reservations');
      return res.json() as Promise<{ reservations: Reservation[]; count: number }>;
    },
  });
}

// POST /api/reservations
export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReservationInput) => {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create reservation');
      return res.json() as Promise<{ reservation: Reservation }>;
    },
    // Optimistic update
    onMutate: async (newReservation) => {
      await queryClient.cancelQueries({ queryKey: ['reservations'] });
      const previous = queryClient.getQueryData(['reservations']);

      queryClient.setQueryData(['reservations'], (old: any) => ({
        reservations: [...(old?.reservations || []), { ...newReservation, id: 'temp' }],
        count: (old?.count || 0) + 1,
      }));

      return { previous };
    },
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['reservations'], context.previous);
      }
    },
    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

// PUT /api/reservations/:id
export function useUpdateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Reservation> & { id: string }) => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update reservation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

// DELETE /api/reservations/:id
export function useDeleteReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete reservation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
```

#### Zustand Store Pattern

```typescript
// src/stores/ui-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ReservationFilters {
  status?: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled';
  dateRange?: { start: Date; end: Date };
  search?: string;
}

interface UIState {
  // Modal state
  isDeleteModalOpen: boolean;
  deleteModalReservationId: string | null;
  openDeleteModal: (id: string) => void;
  closeDeleteModal: () => void;

  // Filter state
  filters: ReservationFilters;
  setFilters: (filters: ReservationFilters) => void;
  clearFilters: () => void;

  // Selection state
  selectedReservationId: string | null;
  selectReservation: (id: string | null) => void;

  // Notification state
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools((set) => ({
    // Modal state
    isDeleteModalOpen: false,
    deleteModalReservationId: null,
    openDeleteModal: (id) => set({ isDeleteModalOpen: true, deleteModalReservationId: id }),
    closeDeleteModal: () => set({ isDeleteModalOpen: false, deleteModalReservationId: null }),

    // Filter state
    filters: {},
    setFilters: (filters) => set({ filters }),
    clearFilters: () => set({ filters: {} }),

    // Selection state
    selectedReservationId: null,
    selectReservation: (id) => set({ selectedReservationId: id }),

    // Notification state
    toasts: [],
    addToast: (message, type) =>
      set((state) => ({
        toasts: [...state.toasts, { id: crypto.randomUUID(), message, type }],
      })),
    removeToast: (id) =>
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      })),
  }))
);
```

#### Usage in Components

```typescript
// Client Component example
'use client';

import { useReservations, useDeleteReservation } from '@/lib/queries/reservations';
import { useUIStore } from '@/stores/ui-store';

export function ReservationList() {
  const { data, isLoading, error } = useReservations();
  const deleteMutation = useDeleteReservation();
  const { openDeleteModal, filters } = useUIStore();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.reservations.map((reservation) => (
        <div key={reservation.id}>
          <span>{reservation.customer.name}</span>
          <button onClick={() => openDeleteModal(reservation.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## Consequences

### Positive
- ✅ **63% less boilerplate code** (~700 LoC saved vs Redux Toolkit)
- ✅ Clear separation between server and UI state
- ✅ Built-in caching, refetching, and optimistic updates
- ✅ Simpler learning curve for contributors
- ✅ Better integration with Supabase Realtime (just invalidate queries)
- ✅ Modern, industry-standard approach (TanStack Query growing rapidly)
- ✅ Excellent DevTools for both libraries
- ✅ Works seamlessly with Next.js App Router and React Server Components

### Negative
- ⚠️ Overrides previous architectural decision (requires documentation update)
- ⚠️ Two libraries instead of one (but both are lightweight)
- ⚠️ Less integrated state (server vs UI separated)
- ⚠️ TanStack Query has a different mental model than Redux

### Mitigation
- Document the change in ARCHITECTURE.md and reference this ADR
- Create clear patterns and examples for both TanStack Query and Zustand usage
- Provide code snippets for common operations (CRUD, optimistic updates, filters)
- Train contributors on TanStack Query concepts (queries, mutations, cache invalidation)
- Use TypeScript to enforce correct usage patterns

## References

- **TanStack Query Documentation**: [https://tanstack.com/query/latest](https://tanstack.com/query/latest)
- **Zustand Documentation**: [https://docs.pmnd.rs/zustand](https://docs.pmnd.rs/zustand)
- **TanStack Query + Next.js**: [https://tanstack.com/query/latest/docs/framework/react/guides/ssr](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
- **Zustand Best Practices**: [https://docs.pmnd.rs/zustand/guides/typescript](https://docs.pmnd.rs/zustand/guides/typescript)
- **Previous Decision**: ARCHITECTURE.md, Phase 3 (Redux Toolkit + RTK Query)
- **Project context**: [/CLAUDE.md](/CLAUDE.md)

---

## Pattern for Future Features

### Adding a New Entity (Example: Tables)

**Step 1: Create TanStack Query hooks** (~40 lines)

```typescript
// src/lib/queries/tables.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useTables() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const res = await fetch('/api/tables');
      if (!res.ok) throw new Error('Failed to fetch tables');
      return res.json();
    },
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create table');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

// ... useUpdateTable, useDeleteTable
```

**Step 2: Add UI state to Zustand if needed** (~10 lines)

```typescript
// src/stores/ui-store.ts
interface UIState {
  // ... existing state

  // Tables UI state
  selectedTableId: string | null;
  isTableModalOpen: boolean;
  selectTable: (id: string | null) => void;
  openTableModal: () => void;
  closeTableModal: () => void;
}
```

**Total**: ~50 lines per entity (vs ~160 with Redux)

This pattern scales efficiently across all 7 entities in the domain model.
