# SeatKit - Swift to TypeScript Migration Strategy

> **Migration Approach**: Parallel Development (Swift app continues in production)
> **Goal**: Modern TypeScript web application inspired by proven Swift architecture
> **Timeline**: Foundation → Core → Features → Polish
> **Last Updated**: 2025-10-25

---

## 🎯 Migration Overview

### Philosophy: **Inspired Rewrite, Not Direct Port**

This is NOT a line-by-line translation from Swift to TypeScript. Instead, we're creating a **modern web application inspired by the proven Swift architecture**, taking the best patterns and adapting them to web technologies.

**Why Rewrite Instead of Port?**
- **Platform Differences**: iOS patterns don't always translate to web
- **Complexity Reduction**: Swift app has over-engineered areas (layout view)
- **Technology Evolution**: Use modern TypeScript/React patterns
- **Configuration Goals**: Make it work for any restaurant, not just Koenji
- **Performance Optimization**: Web-first performance considerations

---

## 📊 Swift App Analysis Summary

### Architecture Strengths to Preserve
✅ **Type Safety**: Swift's strong typing → TypeScript strict mode + Zod
✅ **Clean Architecture**: MVVM + Services → Similar pattern in TS
✅ **Real-Time Sync**: Firestore listeners → WebSocket/SSE implementation
✅ **Offline-First**: SQLite + sync → Consider similar approach
✅ **Domain Modeling**: Rich enums & entities → Zod schemas + TS types

### Patterns to Adapt
🔄 **Observable Pattern**: `@Published` → Zustand/Jotai state management
🔄 **Dependency Injection**: `AppDependencies` → Context providers/DI container
🔄 **Service Layer**: Protocol-based → Interface-based TypeScript
🔄 **Repository Pattern**: `FirestoreDataStoreProtocol` → Repository interfaces
🔄 **Actor Concurrency**: Swift actors → Web Workers or async patterns

### Complexity to Simplify
❌ **Over-Complex Layout**: Simplify table layout visualization
❌ **Apple-Specific**: Drop Pencil drawing, native iOS features
❌ **Tight Coupling**: Decouple from Koenji-specific assumptions
❌ **Manual Caching**: Use modern caching strategies (TanStack Query)

---

## 🏗 Migration Phases

### Phase 1: Foundation ✅ COMPLETE
**Status**: Architectural decisions made, documented

**Completed**:
- [x] Technology stack decisions (TypeScript, Node.js, ESM)
- [x] Monorepo structure (Turborepo, pnpm)
- [x] Development workflow (GitHub Flow, Conventional Commits)
- [x] Validation strategy (Zod)
- [x] Documentation structure

**Outcome**: Solid foundation for development

### Phase 2: Core Architecture 🎯 NEXT
**Goal**: Make architectural decisions that enable everything else

**Database Strategy**:
- [ ] Choose primary database (PostgreSQL, SQLite, etc.)
- [ ] Decide on offline-first vs server-authoritative
- [ ] Select ORM/query builder (Prisma, Drizzle, Kysely)

**API Architecture**:
- [ ] Choose API style (REST, tRPC, GraphQL)
- [ ] Real-time communication strategy
- [ ] Authentication/authorization approach

**Frontend Framework**:
- [ ] React framework decision (Next.js, Remix, Vite)
- [ ] State management approach
- [ ] UI component strategy (shadcn/ui confirmed)

### Phase 3: Domain Model Implementation
**Goal**: Port core business entities and validation

**Tasks**:
- [ ] Implement Reservation entity with Zod schemas
- [ ] Implement Table entity and relationships
- [ ] Implement Sales entities and calculations
- [ ] Implement User/Session management
- [ ] Create comprehensive test suite

**Success Criteria**:
- [ ] All Swift domain models have TypeScript equivalents
- [ ] Business rules validated with Zod schemas
- [ ] Full test coverage of business logic
- [ ] Documentation for each entity

### Phase 4: Data Layer & Services
**Goal**: Implement data persistence and business services

**Tasks**:
- [ ] Database schema design and migrations
- [ ] Repository pattern implementation
- [ ] Business services (ReservationService, TableService, etc.)
- [ ] Real-time synchronization system
- [ ] Caching strategy

**Migration Strategy**:
```typescript
// Swift Pattern
class ReservationService: ObservableObject {
    @Published var reservations: [Reservation] = []
    private let store: FirestoreDataStoreProtocol
}

// TypeScript Equivalent
class ReservationService {
    private reservationRepo: ReservationRepository;

    async getReservations(date: string): Promise<Reservation[]> {
        return await this.reservationRepo.findByDate(date);
    }
}
```

### Phase 5: User Interface
**Goal**: Create responsive web interface matching Swift app functionality

**Timeline/List Views** (Priority 1):
- [ ] Timeline/Gantt chart for visual reservation overview
- [ ] Filterable list view for quick search
- [ ] Mobile-responsive design
- [ ] Real-time updates

**Table Layout View** (Priority 2):
- [ ] Simplified visual table layout
- [ ] Drag-and-drop reservation assignment
- [ ] Configurable restaurant floor plans

**Sales Interface** (Priority 3):
- [ ] End-of-service data entry forms
- [ ] Analytics dashboard
- [ ] Reporting interface

### Phase 6: Real-Time Collaboration
**Goal**: Multi-user editing with conflict resolution

**Tasks**:
- [ ] WebSocket/SSE implementation
- [ ] Session management
- [ ] Conflict resolution strategy
- [ ] Optimistic updates with rollback
- [ ] Live user presence indicators

### Phase 7: Configuration & Multi-Restaurant
**Goal**: Make system configurable for different restaurants

**Tasks**:
- [ ] Restaurant configuration interface
- [ ] Flexible table layouts
- [ ] Customizable business rules
- [ ] Multi-restaurant support preparation

### Phase 8: Polish & Performance
**Goal**: Production-ready application

**Tasks**:
- [ ] Performance optimization
- [ ] Error handling and logging
- [ ] Comprehensive testing
- [ ] Documentation completion
- [ ] Deployment setup

---

## 🔄 Entity Migration Mapping

### Reservation Entity Migration

**Swift Model** (simplified):
```swift
struct Reservation: Codable, Identifiable {
    let id: String
    let name: String
    let phone: String
    let numberOfPersons: Int
    let dateString: String
    let startTime: String
    var endTime: String?

    let category: ReservationCategory
    let type: ReservationType
    var status: ReservationStatus
    var acceptance: Acceptance

    // Enums
    enum ReservationCategory: String, CaseIterable {
        case lunch, dinner, noBookingZone
    }

    enum ReservationStatus: String, CaseIterable {
        case pending, confirmed, canceled, noShow, showedUp, late, toHandle, deleted, na
    }

    // ... more properties
}
```

**TypeScript Migration**:
```typescript
// @seatkit/types/src/reservation.ts
import { z } from 'zod';

export const ReservationCategorySchema = z.enum(['lunch', 'dinner', 'noBookingZone']);
export const ReservationStatusSchema = z.enum([
  'pending', 'confirmed', 'canceled', 'noShow', 'showedUp', 'late', 'toHandle', 'deleted'
]);
export const ReservationTypeSchema = z.enum(['walkIn', 'inAdvance', 'waitingList']);
export const AcceptanceSchema = z.enum(['confirmed', 'toConfirm', 'na']);

export const ReservationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().min(1),
  numberOfPersons: z.number().int().min(1).max(20),
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),

  category: ReservationCategorySchema,
  type: ReservationTypeSchema,
  status: ReservationStatusSchema,
  acceptance: AcceptanceSchema,

  // Optional fields
  specialRequests: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  language: z.enum(['italian', 'english', 'japanese']).optional(),
  colorHue: z.number().min(0).max(360).optional(),

  // Metadata
  createdAt: z.date(),
  lastEdited: z.date(),
  editedBy: z.string().optional(),
});

export type Reservation = z.infer<typeof ReservationSchema>;
export type ReservationCategory = z.infer<typeof ReservationCategorySchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;
// ... other exported types
```

### Service Layer Migration

**Swift Service Pattern**:
```swift
protocol FirestoreDataStoreProtocol {
    func insert<T: Codable>(_ item: T) async throws
    func update<T: Codable>(_ item: T) async throws
    func delete<T: Codable>(_ item: T) async throws
    func streamReservations() -> AsyncThrowingStream<[Reservation], Error>
}

class ReservationService: ObservableObject {
    @Published var reservations: [Reservation] = []
    private let dataStore: FirestoreDataStoreProtocol

    func addReservation(_ reservation: Reservation) async {
        do {
            try await dataStore.insert(reservation)
        } catch {
            // Handle error
        }
    }
}
```

**TypeScript Service Pattern**:
```typescript
// Repository interface (equivalent to Swift protocol)
interface ReservationRepository {
  insert(reservation: Reservation): Promise<void>;
  update(reservation: Reservation): Promise<void>;
  delete(id: string): Promise<void>;
  findByDate(date: string): Promise<Reservation[]>;
  findById(id: string): Promise<Reservation | null>;
  streamReservations(date: string): AsyncGenerator<Reservation[], void, unknown>;
}

// Service implementation
class ReservationService {
  constructor(private repo: ReservationRepository) {}

  async addReservation(data: unknown): Promise<Reservation> {
    // Validate with Zod
    const reservation = ReservationSchema.parse(data);

    // Business logic
    await this.validateTimeSlot(reservation);

    // Persist
    await this.repo.insert(reservation);

    return reservation;
  }

  private async validateTimeSlot(reservation: Reservation): Promise<void> {
    // Business rule validation
    const conflicts = await this.repo.findConflicts(
      reservation.dateString,
      reservation.startTime,
      reservation.endTime
    );

    if (conflicts.length > 0) {
      throw new Error('Time slot conflict');
    }
  }
}
```

---

## 📱 User Interface Migration

### View Architecture Migration

**Swift Pattern** (SwiftUI):
```swift
struct ReservationListView: View {
    @ObservedObject var viewModel: ReservationService
    @State private var showingAddReservation = false

    var body: some View {
        List(viewModel.reservations) { reservation in
            ReservationRow(reservation: reservation)
        }
        .onAppear {
            viewModel.loadReservations()
        }
    }
}
```

**TypeScript/React Pattern**:
```typescript
// Component with hooks
function ReservationListView() {
  const { data: reservations, isLoading } = useReservations();
  const [showingAddReservation, setShowingAddReservation] = useState(false);

  return (
    <div className="space-y-4">
      {reservations?.map(reservation => (
        <ReservationRow
          key={reservation.id}
          reservation={reservation}
        />
      ))}
    </div>
  );
}

// Data fetching hook
function useReservations() {
  return useQuery({
    queryKey: ['reservations', selectedDate],
    queryFn: () => reservationService.getReservations(selectedDate),
    refetchInterval: 5000, // Real-time updates
  });
}
```

### State Management Migration

**Swift Observable Pattern**:
```swift
class ReservationStore: ObservableObject {
    @Published var reservations: [Reservation] = []
    @Published var selectedDate = Date()
    @Published var isLoading = false
}
```

**TypeScript State Management** (using Zustand):
```typescript
interface ReservationStore {
  reservations: Reservation[];
  selectedDate: string;
  isLoading: boolean;

  setReservations: (reservations: Reservation[]) => void;
  setSelectedDate: (date: string) => void;
  setLoading: (loading: boolean) => void;
}

const useReservationStore = create<ReservationStore>((set) => ({
  reservations: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,

  setReservations: (reservations) => set({ reservations }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

---

## 🔄 Real-Time Sync Migration

### Swift Pattern (Firestore Listeners):
```swift
func streamReservations() -> AsyncThrowingStream<[Reservation], Error> {
    AsyncThrowingStream { continuation in
        let listener = db.collection("reservations")
            .addSnapshotListener { querySnapshot, error in
                if let error = error {
                    continuation.finish(throwing: error)
                    return
                }

                let reservations = querySnapshot?.documents.compactMap { doc in
                    try? doc.data(as: Reservation.self)
                } ?? []

                continuation.yield(reservations)
            }

        continuation.onTermination = { _ in
            listener.remove()
        }
    }
}
```

### TypeScript Pattern (WebSocket/SSE):
```typescript
class RealtimeReservationService {
  private eventSource: EventSource | null = null;
  private listeners: Set<(reservations: Reservation[]) => void> = new Set();

  subscribe(callback: (reservations: Reservation[]) => void): () => void {
    this.listeners.add(callback);

    if (!this.eventSource) {
      this.startListening();
    }

    // Return cleanup function
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stopListening();
      }
    };
  }

  private startListening(): void {
    this.eventSource = new EventSource('/api/reservations/stream');

    this.eventSource.onmessage = (event) => {
      const reservations = ReservationSchema.array().parse(JSON.parse(event.data));
      this.listeners.forEach(callback => callback(reservations));
    };
  }

  private stopListening(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }
}
```

---

## ⚡ Performance Migration Strategy

### Swift App Performance Characteristics
- **SQLite Local Storage**: Fast read/write, offline capability
- **Firestore Sync**: Real-time updates, automatic caching
- **Memory Management**: Automatic reference counting
- **UI Updates**: Optimized SwiftUI rendering

### TypeScript Performance Goals
- **Match Swift Responsiveness**: <200ms for common operations
- **Handle Concurrent Users**: 15+ staff members simultaneously
- **Efficient Sync**: Minimize unnecessary updates
- **Progressive Enhancement**: Works on slow networks

**Performance Migration Strategies**:

1. **Caching Strategy**:
   ```typescript
   // TanStack Query for server state caching
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 30_000,        // 30 seconds
         cacheTime: 5 * 60_000,    // 5 minutes
         refetchOnWindowFocus: false,
       },
     },
   });
   ```

2. **Optimistic Updates**:
   ```typescript
   const addReservationMutation = useMutation({
     mutationFn: reservationService.addReservation,
     onMutate: async (newReservation) => {
       // Optimistically update UI
       queryClient.setQueryData(['reservations'], (old) =>
         [...(old || []), newReservation]
       );
     },
     onError: (err, variables, context) => {
       // Rollback on error
       queryClient.setQueryData(['reservations'], context?.previousReservations);
     },
   });
   ```

3. **Efficient Re-renders**:
   ```typescript
   // Memoize expensive calculations
   const sortedReservations = useMemo(() =>
     reservations.sort((a, b) => a.startTime.localeCompare(b.startTime)),
     [reservations]
   );

   // Prevent unnecessary re-renders
   const ReservationRow = memo(({ reservation }: { reservation: Reservation }) => {
     return <div>{reservation.name} - {reservation.startTime}</div>;
   });
   ```

---

## 🧪 Testing Strategy Migration

### Swift Testing Approach
- Unit tests for business logic
- UI tests for critical workflows
- Integration tests with mock data

### TypeScript Testing Strategy
```typescript
// Unit tests with Vitest
describe('ReservationService', () => {
  it('should validate time slot conflicts', async () => {
    const service = new ReservationService(mockRepo);
    const reservation = createMockReservation();

    mockRepo.findConflicts.mockResolvedValue([existingReservation]);

    await expect(service.addReservation(reservation))
      .rejects.toThrow('Time slot conflict');
  });
});

// Integration tests
describe('Reservation API', () => {
  it('should create and retrieve reservations', async () => {
    const response = await request(app)
      .post('/api/reservations')
      .send(mockReservationData)
      .expect(201);

    expect(response.body).toMatchObject(expectedReservation);
  });
});

// E2E tests with Playwright
test('should create reservation through UI', async ({ page }) => {
  await page.goto('/reservations');
  await page.click('[data-testid=add-reservation]');
  await page.fill('[name=guestName]', 'John Doe');
  await page.click('[data-testid=save-reservation]');

  await expect(page.locator('.reservation-row')).toContainText('John Doe');
});
```

---

## 📋 Migration Checklist

### Pre-Migration ✅
- [x] Swift app analysis complete
- [x] Technical architecture decisions made
- [x] Development environment prepared
- [x] Documentation structure created

### Core Migration 🎯
- [ ] Database schema designed
- [ ] Core entities implemented (Reservation, Table, Sales, User)
- [ ] Repository pattern established
- [ ] Business services created
- [ ] Authentication system built

### UI Migration 🔲
- [ ] Timeline view implemented
- [ ] List view with filtering
- [ ] Basic table layout view
- [ ] Sales entry interface
- [ ] Mobile responsiveness verified

### Real-Time Features 🔲
- [ ] WebSocket/SSE connection established
- [ ] Multi-user conflict resolution
- [ ] Live updates working
- [ ] Performance optimized

### Production Readiness 🔲
- [ ] Error handling comprehensive
- [ ] Security audit complete
- [ ] Performance benchmarked
- [ ] Documentation finalized
- [ ] Deployment automated

---

## 🔍 Risk Assessment & Mitigation

### High-Risk Areas

**Real-Time Synchronization**:
- **Risk**: Complex to implement correctly, potential data loss
- **Mitigation**: Start with polling, gradually add real-time features
- **Fallback**: Manual refresh buttons, conflict resolution prompts

**Performance Under Load**:
- **Risk**: Web app slower than native iOS app
- **Mitigation**: Performance budgets, regular benchmarking, caching strategies
- **Monitoring**: Real User Monitoring (RUM) in production

**Complex Business Logic**:
- **Risk**: Misunderstanding restaurant operations, edge cases
- **Mitigation**: Frequent validation with Koenji staff, comprehensive testing
- **Documentation**: Clear business rules documentation

### Medium-Risk Areas

**Cross-Browser Compatibility**:
- **Risk**: Features work in Chrome but fail in Safari/Firefox
- **Mitigation**: Test matrix covering major browsers, progressive enhancement

**Mobile Experience**:
- **Risk**: Poor mobile UX compared to native app
- **Mitigation**: Mobile-first development, touch-friendly design, PWA features

### Low-Risk Areas

**TypeScript Migration**:
- **Risk**: Type errors, compilation issues
- **Mitigation**: Strict TypeScript configuration, comprehensive types

**Package Management**:
- **Risk**: Monorepo complexity, dependency conflicts
- **Mitigation**: Well-tested toolchain (Turborepo + pnpm), clear boundaries

---

This migration strategy provides a roadmap from the current Swift iOS app to a modern TypeScript web application while preserving the proven business value and expanding the potential user base.