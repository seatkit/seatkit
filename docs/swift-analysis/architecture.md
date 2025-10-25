# Swift App Architecture Analysis

> **Source**: KoenjiApp Swift iOS application (125 Swift files)
> **Purpose**: Detailed technical analysis for TypeScript migration reference
> **Analysis Date**: 2025-10-25

---

## 🏗 Overall Architecture Pattern

### MVVM + Clean Architecture + Dependency Injection

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  SwiftUI Views → ViewModels → ObservedObjects               │
├─────────────────────────────────────────────────────────────┤
│                    BUSINESS LOGIC LAYER                      │
│  Services (ReservationService, LayoutServices, etc.)        │
├─────────────────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                         │
│  Stores → Repositories → SQLite/Firestore                   │
└─────────────────────────────────────────────────────────────┘
```

**Key Architectural Components**:
1. **AppDependencies**: Centralized dependency injection container
2. **Protocol-Based Design**: Abstractions for data persistence
3. **Observable Pattern**: SwiftUI's @ObservedObject + Combine
4. **Actor-Based Concurrency**: Thread-safe database operations
5. **Service Locator**: Singleton stores for shared state

---

## 🏢 Dependency Injection System

### AppDependencies Container

**File**: `/App Config/AppDependencies.swift`

```swift
@MainActor
class AppDependencies: ObservableObject {
    // MARK: - Stores (Singletons)
    lazy var reservationStore = ReservationStore.shared
    lazy var tableStore = TableStore.shared
    lazy var sessionStore = SessionStore.shared
    lazy var profileStore = ProfileStore.shared
    lazy var salesStore = SalesStore()

    // MARK: - Services
    lazy var reservationService: ReservationService = {
        ReservationService(
            dataStore: sqliteReservationStore,
            tableStore: tableStore
        )
    }()

    lazy var layoutServices = LayoutServices()
    lazy var clusterServices = ClusterServices()
    lazy var tableAssignmentService = TableAssignmentService()
    lazy var profileService = ProfileService()
    lazy var sessionService = SessionService()
    lazy var scribbleService = ScribbleService()

    // MARK: - Data Layer
    private lazy var sqliteReservationStore: SQLiteReservationStore = {
        SQLiteReservationStore(profileStore: profileStore)
    }()

    // MARK: - Caching
    lazy var currentReservationsCache = CurrentReservationsCache()
    lazy var layoutCache = LayoutCache()
    lazy var normalizedTimeCache = NormalizedTimeCache()
    lazy var clusterCache = ClusterStore()

    // MARK: - Utilities
    lazy var timerManager = TimerManager()
    lazy var dataGenerationService = DataGenerationService()
    lazy var profileImageService = ProfileImageService()
    lazy var appNotification = AppNotification()
    lazy var appLog = AppLog()

    // MARK: - Firebase (Conditional)
    var firestoreDataStore: FirestoreDataStore? {
        // Only initialize if not in preview mode
        guard !isPreview else { return nil }
        return FirestoreDataStore()
    }

    private var isPreview: Bool {
        ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1"
    }
}
```

**Key Insights for TypeScript Migration**:
- **Centralized DI**: Single source for all dependencies
- **Lazy Loading**: Services created on first access
- **Conditional Dependencies**: Firebase only in production
- **Preview Support**: Graceful degradation for development
- **Type Safety**: All dependencies strongly typed

**TypeScript Equivalent Pattern**:
```typescript
// DI container using dependency injection pattern
class AppDependencies {
  // Singleton stores
  private _reservationStore?: ReservationStore;
  private _tableStore?: TableStore;

  get reservationStore(): ReservationStore {
    if (!this._reservationStore) {
      this._reservationStore = new ReservationStore(this.reservationRepository);
    }
    return this._reservationStore;
  }

  // Services with dependency injection
  get reservationService(): ReservationService {
    return new ReservationService(
      this.reservationRepository,
      this.tableStore
    );
  }
}
```

---

## 📊 Data Layer Architecture

### Protocol-Based Repository Pattern

**Core Protocol**: `FirestoreDataStoreProtocol`

```swift
protocol FirestoreDataStoreProtocol {
    // CRUD Operations
    func insert<T: Codable>(_ item: T) async throws
    func update<T: Codable>(_ item: T) async throws
    func delete<T: Codable>(_ item: T) async throws

    // Querying
    func getReservations() async throws -> [Reservation]
    func streamReservations() -> AsyncThrowingStream<[Reservation], Error>

    // Specialized Operations
    func insertReservation(_ reservation: Reservation) async throws
    func updateReservation(_ reservation: Reservation) async throws
    func deleteReservation(_ reservation: Reservation) async throws
}
```

**Multiple Implementations**:

1. **SQLiteReservationStore** (Local, Offline-First):
```swift
actor SQLiteReservationStore: FirestoreDataStoreProtocol {
    private let db: Connection
    private let subject = PassthroughSubject<[Reservation], Error>()

    func insert<T: Codable>(_ item: T) async throws {
        // SQLite insertion logic
        try await insertReservation(item as! Reservation)
    }

    func streamReservations() -> AsyncThrowingStream<[Reservation], Error> {
        AsyncThrowingStream { continuation in
            let cancellable = subject
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            continuation.finish(throwing: error)
                        } else {
                            continuation.finish()
                        }
                    },
                    receiveValue: { reservations in
                        continuation.yield(reservations)
                    }
                )

            continuation.onTermination = { _ in
                cancellable.cancel()
            }
        }
    }
}
```

2. **FirestoreDataStore** (Cloud Sync):
```swift
class FirestoreDataStore: FirestoreDataStoreProtocol {
    private let db = Firestore.firestore()

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
}
```

**Migration Insights**:
- **Dual Storage**: SQLite for offline, Firestore for sync
- **Actor Isolation**: Thread-safe database operations
- **Stream-Based**: Real-time updates via AsyncThrowingStream
- **Protocol Abstraction**: Easy to swap implementations

**TypeScript Repository Pattern**:
```typescript
interface ReservationRepository {
  insert(reservation: Reservation): Promise<void>;
  update(reservation: Reservation): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Reservation[]>;
  streamReservations(): AsyncGenerator<Reservation[], void, unknown>;
}

class SQLiteReservationRepository implements ReservationRepository {
  async *streamReservations(): AsyncGenerator<Reservation[]> {
    // WebSocket or polling-based implementation
    const eventSource = new EventSource('/api/reservations/stream');

    while (true) {
      const event = await new Promise(resolve => {
        eventSource.onmessage = resolve;
      });

      const reservations = JSON.parse(event.data);
      yield reservations;
    }
  }
}
```

---

## 🔄 Observable State Management

### Store Pattern with @Published Properties

**ReservationStore** (Central State Management):
```swift
@MainActor
class ReservationStore: ObservableObject {
    // MARK: - Published State
    @Published var reservations: [Reservation] = []
    @Published var selectedDate = Date()
    @Published var isLoading = false
    @Published var errorMessage: String?

    // MARK: - Dependencies
    private let dataStore: FirestoreDataStoreProtocol
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Singleton
    nonisolated(unsafe) static let shared = ReservationStore()

    private init() {
        self.dataStore = SQLiteReservationStore(profileStore: ProfileStore.shared)
        setupReservationStream()
    }

    // MARK: - Real-time Updates
    private func setupReservationStream() {
        Task {
            do {
                for try await reservations in dataStore.streamReservations() {
                    await MainActor.run {
                        self.reservations = reservations
                        self.isLoading = false
                    }
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }

    // MARK: - Public Interface
    func addReservation(_ reservation: Reservation) async {
        await MainActor.run { isLoading = true }

        do {
            try await dataStore.insertReservation(reservation)
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
}
```

**Key Patterns**:
- **@MainActor**: UI updates on main thread
- **@Published**: Automatic UI updates when state changes
- **Singleton Pattern**: Shared state across app
- **Async/Await**: Modern concurrency for data operations
- **Error Handling**: Centralized error state management

**TypeScript State Management Equivalent** (Zustand):
```typescript
interface ReservationStore {
  // State
  reservations: Reservation[];
  selectedDate: string;
  isLoading: boolean;
  errorMessage: string | null;

  // Actions
  setReservations: (reservations: Reservation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addReservation: (reservation: Reservation) => Promise<void>;
}

const useReservationStore = create<ReservationStore>((set, get) => ({
  // Initial state
  reservations: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  errorMessage: null,

  // Actions
  setReservations: (reservations) => set({ reservations }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (errorMessage) => set({ errorMessage }),

  addReservation: async (reservation) => {
    set({ isLoading: true });
    try {
      await reservationRepository.insert(reservation);
      // Real-time updates will refresh the list
    } catch (error) {
      set({ errorMessage: error.message, isLoading: false });
    }
  },
}));

// Real-time subscription
const setupRealtimeUpdates = () => {
  const unsubscribe = reservationService.subscribe((reservations) => {
    useReservationStore.getState().setReservations(reservations);
  });

  return unsubscribe;
};
```

---

## 🧩 Service Layer Architecture

### Business Logic Services

**ReservationService** (Core Business Logic):
```swift
@MainActor
class ReservationService: ObservableObject {
    // MARK: - Dependencies
    private let dataStore: FirestoreDataStoreProtocol
    private let tableStore: TableStore

    // MARK: - Published Properties
    @Published var reservations: [Reservation] = []
    @Published var isLoading = false

    init(dataStore: FirestoreDataStoreProtocol, tableStore: TableStore) {
        self.dataStore = dataStore
        self.tableStore = tableStore
        loadInitialReservations()
    }

    // MARK: - Business Operations
    func createReservation(
        name: String,
        phone: String,
        partySize: Int,
        date: Date,
        time: String
    ) async throws -> Reservation {
        // Business rule validation
        try validateReservationRules(partySize: partySize, date: date, time: time)

        // Create reservation
        let reservation = Reservation(
            id: UUID().uuidString,
            name: name,
            phone: phone,
            numberOfPersons: partySize,
            dateString: DateFormatter.yyyyMMdd.string(from: date),
            startTime: time,
            category: determineCategory(for: time),
            type: .inAdvance,
            status: .pending,
            acceptance: .toConfirm
        )

        // Save to data store
        try await dataStore.insertReservation(reservation)

        return reservation
    }

    // MARK: - Business Rules
    private func validateReservationRules(partySize: Int, date: Date, time: String) throws {
        // Party size limits
        guard partySize > 0 && partySize <= 20 else {
            throw ReservationError.invalidPartySize
        }

        // Future date only
        guard date >= Date().startOfDay else {
            throw ReservationError.pastDateNotAllowed
        }

        // Valid time slots
        guard isValidTimeSlot(time) else {
            throw ReservationError.invalidTimeSlot
        }

        // Capacity check
        try validateCapacity(partySize: partySize, date: date, time: time)
    }

    private func determineCategory(for time: String) -> Reservation.ReservationCategory {
        let hour = Int(time.prefix(2)) ?? 0
        return hour < 17 ? .lunch : .dinner
    }
}
```

**TableAssignmentService** (Complex Algorithm):
```swift
class TableAssignmentService {
    private let tableStore: TableStore
    private let clusterServices: ClusterServices

    init(tableStore: TableStore, clusterServices: ClusterServices) {
        self.tableStore = tableStore
        self.clusterServices = clusterServices
    }

    func assignOptimalTable(
        for reservation: Reservation,
        at date: Date
    ) async -> TableAssignmentResult {
        let availableTables = await getAvailableTables(for: date, at: reservation.startTime)

        // Algorithm: Best fit with minimal waste
        let assignment = findBestTableAssignment(
            partySize: reservation.numberOfPersons,
            availableTables: availableTables,
            preferences: getGuestPreferences(for: reservation)
        )

        return assignment
    }

    private func findBestTableAssignment(
        partySize: Int,
        availableTables: [TableModel],
        preferences: GuestPreferences
    ) -> TableAssignmentResult {
        // Complex assignment algorithm
        // 1. Exact capacity match
        // 2. Minimal over-capacity
        // 3. Table combination for large parties
        // 4. Guest preferences (window, quiet, etc.)
        // 5. Server station optimization

        var bestAssignment: TableAssignmentResult?
        var bestScore = Double.infinity

        for table in availableTables {
            let score = calculateTableScore(
                table: table,
                partySize: partySize,
                preferences: preferences
            )

            if score < bestScore {
                bestScore = score
                bestAssignment = TableAssignmentResult(
                    table: table,
                    score: score,
                    reasoning: generateAssignmentReasoning(table, score)
                )
            }
        }

        return bestAssignment ?? .noTableAvailable
    }
}
```

**Migration Insights**:
- **Dependency Injection**: Services receive dependencies via constructor
- **Business Rule Validation**: Clear separation of concerns
- **Complex Algorithms**: Table assignment logic can be preserved
- **Error Handling**: Custom error types for business rules

---

## 🎨 SwiftUI View Architecture

### MVVM Pattern in Views

**ReservationListView** (Data-Driven UI):
```swift
struct ReservationListView: View {
    // MARK: - Dependencies
    @ObservedObject var reservationService: ReservationService
    @ObservedObject var sessionService: SessionService

    // MARK: - State
    @State private var searchText = ""
    @State private var selectedCategory: Reservation.ReservationCategory? = nil
    @State private var showingAddReservation = false

    var body: some View {
        NavigationView {
            VStack {
                // Search and Filter Bar
                HStack {
                    SearchBar(text: $searchText)
                    CategoryPicker(selection: $selectedCategory)
                }
                .padding(.horizontal)

                // Reservation List
                List(filteredReservations) { reservation in
                    ReservationRow(
                        reservation: reservation,
                        onTap: { handleReservationTap(reservation) },
                        onEdit: { handleReservationEdit(reservation) }
                    )
                    .swipeActions(edge: .trailing) {
                        // Quick actions
                        Button("Confirm") {
                            confirmReservation(reservation)
                        }
                        .tint(.green)

                        Button("Cancel") {
                            cancelReservation(reservation)
                        }
                        .tint(.red)
                    }
                }
                .refreshable {
                    await reservationService.refreshReservations()
                }
            }
            .navigationTitle("Reservations")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddReservation = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddReservation) {
            AddReservationView(reservationService: reservationService)
        }
        .task {
            await reservationService.loadReservations()
        }
    }

    // MARK: - Computed Properties
    private var filteredReservations: [Reservation] {
        reservationService.reservations
            .filter { reservation in
                // Search filter
                if !searchText.isEmpty {
                    return reservation.name.localizedCaseInsensitiveContains(searchText) ||
                           reservation.phone.contains(searchText)
                }

                // Category filter
                if let selectedCategory = selectedCategory {
                    return reservation.category == selectedCategory
                }

                return true
            }
            .sorted { $0.startTime < $1.startTime }
    }

    // MARK: - Actions
    private func handleReservationTap(_ reservation: Reservation) {
        // Navigate to detail view
    }

    private func confirmReservation(_ reservation: Reservation) {
        Task {
            await reservationService.updateReservationStatus(
                reservation.id,
                status: .confirmed
            )
        }
    }
}
```

**Timeline View** (Complex Layout):
```swift
struct TimelineView: View {
    @ObservedObject var reservationService: ReservationService
    @ObservedObject var tableStore: TableStore

    @State private var selectedDate = Date()
    @State private var timelineScale: CGFloat = 1.0
    @State private var dragOffset: CGSize = .zero

    var body: some View {
        GeometryReader { geometry in
            ScrollView([.horizontal, .vertical]) {
                ZStack {
                    // Time grid background
                    TimeGridView(
                        startHour: 10,
                        endHour: 24,
                        interval: 15,
                        scale: timelineScale
                    )

                    // Reservation blocks
                    ForEach(reservationsForDate(selectedDate)) { reservation in
                        ReservationTimeBlock(
                            reservation: reservation,
                            scale: timelineScale,
                            onDrag: { offset in
                                handleReservationDrag(reservation, offset: offset)
                            }
                        )
                        .position(
                            x: calculateXPosition(for: reservation),
                            y: calculateYPosition(for: reservation)
                        )
                    }
                }
                .frame(
                    width: timelineWidth * timelineScale,
                    height: timelineHeight * timelineScale
                )
                .gesture(
                    MagnificationGesture()
                        .onChanged { scale in
                            timelineScale = scale
                        }
                )
            }
        }
        .navigationTitle("Timeline - \(selectedDate.formatted(date: .abbreviated, time: .omitted))")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                DatePicker("Date", selection: $selectedDate, displayedComponents: .date)
                    .labelsHidden()
            }
        }
    }

    // MARK: - Layout Calculations
    private func calculateXPosition(for reservation: Reservation) -> CGFloat {
        // Convert time to X coordinate
        let timeComponents = reservation.startTime.components(separatedBy: ":")
        let hours = Double(timeComponents[0]) ?? 0
        let minutes = Double(timeComponents[1]) ?? 0
        let totalMinutes = (hours - 10) * 60 + minutes // Offset from 10:00 start

        return CGFloat(totalMinutes * 2) * timelineScale // 2 pixels per minute
    }

    private func calculateYPosition(for reservation: Reservation) -> CGFloat {
        // Table-based Y positioning
        let tableIndex = tableStore.tables.firstIndex { $0.id == reservation.tableId } ?? 0
        return CGFloat(tableIndex * 60 + 30) * timelineScale // 60px per table row
    }
}
```

**Migration Insights**:
- **Reactive UI**: Views automatically update when state changes
- **Gesture Handling**: Complex touch interactions (drag, zoom, swipe)
- **Computed Properties**: Efficient filtering and sorting
- **Sheet/Modal Presentation**: Navigation patterns
- **Toolbar Integration**: Native iOS patterns

**React Equivalent Patterns**:
```typescript
// List view with hooks
function ReservationListView() {
  const { reservations, isLoading } = useReservations();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReservationCategory | null>(null);

  const filteredReservations = useMemo(() => {
    return reservations
      .filter(reservation => {
        if (searchText) {
          return reservation.guestName.toLowerCase().includes(searchText.toLowerCase()) ||
                 reservation.phone.includes(searchText);
        }
        if (selectedCategory) {
          return reservation.category === selectedCategory;
        }
        return true;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [reservations, searchText, selectedCategory]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <SearchBar value={searchText} onChange={setSearchText} />
        <CategoryPicker value={selectedCategory} onChange={setSelectedCategory} />
      </div>

      <div className="space-y-2">
        {filteredReservations.map(reservation => (
          <ReservationRow
            key={reservation.id}
            reservation={reservation}
            onConfirm={() => confirmReservation(reservation.id)}
            onCancel={() => cancelReservation(reservation.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Timeline view with complex interactions
function TimelineView() {
  const { reservations } = useReservations();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scale, setScale] = useState(1);

  const reservationsForDate = useMemo(() =>
    reservations.filter(r => r.dateString === format(selectedDate, 'yyyy-MM-dd')),
    [reservations, selectedDate]
  );

  return (
    <div className="relative overflow-auto">
      <TimeGrid startHour={10} endHour={24} scale={scale} />
      {reservationsForDate.map(reservation => (
        <ReservationTimeBlock
          key={reservation.id}
          reservation={reservation}
          scale={scale}
          style={{
            left: calculateXPosition(reservation),
            top: calculateYPosition(reservation),
          }}
        />
      ))}
    </div>
  );
}
```

---

## ⚡ Performance Optimizations

### Caching Strategy

**Multiple Cache Layers**:
```swift
// 1. Current Reservations Cache
class CurrentReservationsCache: ObservableObject {
    @Published private(set) var cachedReservations: [Reservation] = []
    private var lastRefresh: Date?

    func getCachedReservations(for date: Date) -> [Reservation]? {
        guard let lastRefresh = lastRefresh,
              Date().timeIntervalSince(lastRefresh) < 300 else { // 5 minute cache
            return nil
        }

        return cachedReservations.filter {
            $0.dateString == DateFormatter.yyyyMMdd.string(from: date)
        }
    }
}

// 2. Layout Cache (Complex Calculations)
class LayoutCache {
    private var layoutCalculations: [String: LayoutData] = [:]

    func getCachedLayout(for configuration: LayoutConfiguration) -> LayoutData? {
        let key = configuration.cacheKey
        return layoutCalculations[key]
    }

    func cacheLayout(_ layout: LayoutData, for configuration: LayoutConfiguration) {
        let key = configuration.cacheKey
        layoutCalculations[key] = layout
    }
}

// 3. Normalized Time Cache
class NormalizedTimeCache {
    private var timeConversions: [String: Date] = [:]

    func normalizedTime(from timeString: String, date: Date) -> Date {
        let key = "\(timeString)-\(DateFormatter.yyyyMMdd.string(from: date))"

        if let cached = timeConversions[key] {
            return cached
        }

        let normalized = calculateNormalizedTime(timeString, date)
        timeConversions[key] = normalized
        return normalized
    }
}
```

### Database Optimizations

**SQLite Performance Patterns**:
```swift
actor SQLiteReservationStore {
    private let db: Connection
    private let reservationsTable = Table("reservations")

    // Indexed columns for fast queries
    private let id = Expression<String>("id")
    private let dateString = Expression<String>("date_string") // INDEX
    private let startTime = Expression<String>("start_time")   // INDEX
    private let status = Expression<String>("status")          // INDEX

    // Batch operations for performance
    func insertReservations(_ reservations: [Reservation]) async throws {
        try await db.transaction {
            for reservation in reservations {
                try db.run(reservationsTable.insert(reservation))
            }
        }
    }

    // Optimized queries
    func getReservationsForDateRange(
        from startDate: String,
        to endDate: String
    ) async throws -> [Reservation] {
        let query = reservationsTable
            .filter(dateString >= startDate && dateString <= endDate)
            .order(dateString.asc, startTime.asc)

        return try await db.prepare(query).map { row in
            // Map row to Reservation
        }
    }
}
```

**TypeScript Performance Equivalent**:
```typescript
// Query optimization with proper indexing
class ReservationRepository {
  // Use database indexes for common queries
  async findByDateRange(startDate: string, endDate: string): Promise<Reservation[]> {
    // SQL with proper indexes: (date_string, start_time)
    return await this.db.reservation.findMany({
      where: {
        dateString: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [
        { dateString: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  // Batch operations for performance
  async insertMany(reservations: Reservation[]): Promise<void> {
    await this.db.$transaction(async (tx) => {
      for (const reservation of reservations) {
        await tx.reservation.create({ data: reservation });
      }
    });
  }
}

// React Query caching
const useReservations = (date: string) => {
  return useQuery({
    queryKey: ['reservations', date],
    queryFn: () => reservationRepository.findByDate(date),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

---

## 🔒 Security & Error Handling

### Type-Safe Error Handling

```swift
enum ReservationError: Error, LocalizedError {
    case invalidPartySize
    case pastDateNotAllowed
    case invalidTimeSlot
    case tableNotAvailable
    case databaseError(String)

    var errorDescription: String? {
        switch self {
        case .invalidPartySize:
            return "Party size must be between 1 and 20 people"
        case .pastDateNotAllowed:
            return "Cannot create reservations for past dates"
        case .invalidTimeSlot:
            return "Selected time slot is not available"
        case .tableNotAvailable:
            return "No tables available for the requested time"
        case .databaseError(let message):
            return "Database error: \(message)"
        }
    }
}

// Usage in service
func createReservation(...) async throws -> Reservation {
    guard partySize > 0 && partySize <= 20 else {
        throw ReservationError.invalidPartySize
    }

    do {
        try await dataStore.insertReservation(reservation)
        return reservation
    } catch {
        throw ReservationError.databaseError(error.localizedDescription)
    }
}
```

**TypeScript Error Handling Equivalent**:
```typescript
export class ReservationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'ReservationError';
  }
}

export class ReservationService {
  async createReservation(data: CreateReservationData): Promise<Reservation> {
    if (data.partySize < 1 || data.partySize > 20) {
      throw new ReservationError(
        'Party size must be between 1 and 20 people',
        'INVALID_PARTY_SIZE'
      );
    }

    try {
      const reservation = ReservationSchema.parse({
        id: crypto.randomUUID(),
        ...data,
      });

      await this.repository.insert(reservation);
      return reservation;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ReservationError(
          'Invalid reservation data',
          'VALIDATION_ERROR'
        );
      }

      throw new ReservationError(
        'Failed to create reservation',
        'DATABASE_ERROR',
        500
      );
    }
  }
}
```

---

This architectural analysis provides comprehensive insight into the Swift app's proven patterns, which can guide the TypeScript implementation while adapting to web platform strengths and modern development practices.