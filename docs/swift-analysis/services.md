# Swift App - Services & Business Logic Analysis

> **Source**: KoenjiApp service layer (12+ specialized services)
> **Purpose**: Business logic patterns for TypeScript migration
> **Focus**: Service architecture, algorithms, and domain operations
> **Last Updated**: 2025-10-25

---

## 🏗 Service Architecture Overview

### Service Organization Pattern

The Swift app uses a **layered service architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  SwiftUI Views
├─────────────────────────────────────┤
│         Service Layer               │  Business Logic Services
├─────────────────────────────────────┤
│         Store Layer                 │  Observable State Management
├─────────────────────────────────────┤
│         Repository Layer            │  Data Access Abstraction
├─────────────────────────────────────┤
│         Persistence Layer           │  SQLite + Firestore
└─────────────────────────────────────┘
```

**Key Services Identified**:

1. **ReservationService** - Core reservation operations
2. **LayoutServices** - Table layout calculations
3. **ClusterServices** - Table clustering algorithms
4. **TableAssignmentService** - Optimal table assignment
5. **ProfileService** - User profile management
6. **SessionService** - Multi-user session coordination
7. **ScribbleService** - Apple Pencil drawing (skip in TS)
8. **TimerManager** - Timing and scheduling
9. **DataGenerationService** - Test data creation
10. **ProfileImageService** - Avatar management
11. **AppNotification** - Local notifications
12. **AppLog** - Logging system

---

## 🎯 Core Business Services

### 1. ReservationService (Primary Business Logic)

**Swift Implementation**:

```swift
@MainActor
class ReservationService: ObservableObject {
    // MARK: - Dependencies
    private let dataStore: FirestoreDataStoreProtocol
    private let tableStore: TableStore

    // MARK: - Published State
    @Published var reservations: [Reservation] = []
    @Published var isLoading = false
    @Published var selectedDate = Date()

    // MARK: - Business Operations
    func createReservation(
        name: String,
        phone: String,
        partySize: Int,
        date: Date,
        time: String,
        category: Reservation.ReservationCategory
    ) async throws -> Reservation {

        // 1. Input validation
        try validateReservationInput(
            name: name,
            phone: phone,
            partySize: partySize,
            date: date,
            time: time
        )

        // 2. Business rules validation
        try await validateBusinessRules(
            partySize: partySize,
            date: date,
            time: time,
            category: category
        )

        // 3. Create reservation entity
        let reservation = Reservation(
            id: UUID().uuidString,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            phone: phone.trimmingCharacters(in: .whitespacesAndNewlines),
            numberOfPersons: partySize,
            dateString: DateFormatter.yyyyMMdd.string(from: date),
            startTime: time,
            endTime: calculateEndTime(from: time, category: category),
            category: category,
            type: .inAdvance,
            status: .pending,
            acceptance: .toConfirm,
            createdAt: Date(),
            lastEdited: Date()
        )

        // 4. Table assignment attempt
        if let optimalTable = await findOptimalTable(for: reservation) {
            reservation.tableId = optimalTable.id
        }

        // 5. Persist to data store
        try await dataStore.insertReservation(reservation)

        // 6. Notify other services
        await notifyReservationCreated(reservation)

        return reservation
    }

    // MARK: - Business Rule Validation
    private func validateBusinessRules(
        partySize: Int,
        date: Date,
        time: String,
        category: Reservation.ReservationCategory
    ) async throws {

        // Party size limits
        guard partySize >= 1 && partySize <= 20 else {
            throw ReservationError.invalidPartySize
        }

        // Future dates only
        guard date >= Calendar.current.startOfDay(for: Date()) else {
            throw ReservationError.pastDateNotAllowed
        }

        // Valid time slots for category
        guard isValidTimeSlot(time, for: category) else {
            throw ReservationError.invalidTimeSlot
        }

        // Capacity availability
        try await validateCapacityAvailable(
            partySize: partySize,
            date: date,
            time: time
        )

        // Advance booking window
        let daysAhead = Calendar.current.dateComponents([.day], from: Date(), to: date).day ?? 0
        guard daysAhead <= 60 else { // 60-day advance booking limit
            throw ReservationError.tooFarInAdvance
        }
    }

    // MARK: - Table Assignment Logic
    private func findOptimalTable(for reservation: Reservation) async -> TableModel? {
        let availableTables = await tableStore.getAvailableTables(
            for: reservation.dateString,
            at: reservation.startTime,
            duration: reservation.duration
        )

        // Algorithm: Best fit with minimal waste
        var bestTable: TableModel?
        var bestScore = Double.infinity

        for table in availableTables {
            let score = calculateTableScore(table: table, reservation: reservation)

            if score < bestScore {
                bestScore = score
                bestTable = table
            }
        }

        return bestTable
    }

    private func calculateTableScore(table: TableModel, reservation: Reservation) -> Double {
        let partySize = Double(reservation.numberOfPersons)
        let capacity = Double(table.maxCapacity)

        // Factors in scoring:
        // 1. Capacity efficiency (minimize waste)
        let capacityWaste = max(0, capacity - partySize) / capacity

        // 2. Guest comfort (avoid overcrowding)
        let overcrowdingPenalty = partySize > capacity ? 10.0 : 0.0

        // 3. Table preferences (window seats, etc.)
        let preferencePenalty = calculatePreferencePenalty(table: table, reservation: reservation)

        return capacityWaste + overcrowdingPenalty + preferencePenalty
    }

    // MARK: - Real-time Updates
    private func setupRealtimeUpdates() {
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
                }
            }
        }
    }
}
```

**TypeScript Migration Pattern**:

```typescript
// @seatkit/engine/src/reservation/ReservationService.ts
import type {
	Reservation,
	CreateReservationData,
	ReservationRepository,
	TableRepository,
} from '@seatkit/types';

export class ReservationService {
	constructor(
		private readonly reservationRepo: ReservationRepository,
		private readonly tableRepo: TableRepository,
		private readonly logger: Logger,
	) {}

	async createReservation(data: CreateReservationData): Promise<Reservation> {
		// 1. Parse and validate input
		const validatedData = CreateReservationDataSchema.parse(data);

		// 2. Business rules validation
		await this.validateBusinessRules(validatedData);

		// 3. Create reservation entity
		const reservation: Reservation = {
			id: crypto.randomUUID(),
			...validatedData,
			status: 'pending',
			acceptance: 'toConfirm',
			createdAt: new Date(),
			lastEdited: new Date(),
		};

		// 4. Table assignment attempt
		const optimalTable = await this.findOptimalTable(reservation);
		if (optimalTable) {
			reservation.tableId = optimalTable.id;
		}

		// 5. Persist
		await this.reservationRepo.insert(reservation);

		// 6. Log and notify
		this.logger.info('Reservation created', { reservationId: reservation.id });

		return reservation;
	}

	private async validateBusinessRules(
		data: CreateReservationData,
	): Promise<void> {
		// Party size validation
		if (data.numberOfPersons < 1 || data.numberOfPersons > 20) {
			throw new ReservationError('Invalid party size', 'INVALID_PARTY_SIZE');
		}

		// Date validation
		const reservationDate = new Date(data.dateString);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (reservationDate < today) {
			throw new ReservationError(
				'Cannot create reservation for past date',
				'PAST_DATE',
			);
		}

		// Time slot validation
		if (!this.isValidTimeSlot(data.startTime, data.category)) {
			throw new ReservationError('Invalid time slot', 'INVALID_TIME_SLOT');
		}

		// Capacity check
		await this.validateCapacityAvailable(data);
	}

	private async findOptimalTable(
		reservation: Reservation,
	): Promise<Table | null> {
		const availableTables = await this.tableRepo.findAvailable({
			date: reservation.dateString,
			startTime: reservation.startTime,
			endTime: reservation.endTime,
		});

		if (availableTables.length === 0) return null;

		// Find best table using scoring algorithm
		let bestTable: Table | null = null;
		let bestScore = Infinity;

		for (const table of availableTables) {
			const score = this.calculateTableScore(table, reservation);
			if (score < bestScore) {
				bestScore = score;
				bestTable = table;
			}
		}

		return bestTable;
	}

	private calculateTableScore(table: Table, reservation: Reservation): number {
		const partySize = reservation.numberOfPersons;
		const capacity = table.maxCapacity;

		// Minimize waste while ensuring comfort
		const capacityWaste = Math.max(0, capacity - partySize) / capacity;
		const overcrowdingPenalty = partySize > capacity ? 10 : 0;

		return capacityWaste + overcrowdingPenalty;
	}
}
```

---

### 2. LayoutServices (Complex Geometry Calculations)

**Swift Implementation** (Simplified - Very Complex in Original):

```swift
class LayoutServices {
    // MARK: - Layout Calculations
    func calculateOptimalLayout(
        tables: [TableModel],
        reservations: [Reservation],
        for date: Date
    ) -> LayoutConfiguration {

        let timeSlots = generateTimeSlots(for: date)
        var layout = LayoutConfiguration(date: date)

        for timeSlot in timeSlots {
            let activeReservations = reservations.filter { reservation in
                isReservationActive(reservation, at: timeSlot)
            }

            let assignment = calculateTableAssignments(
                tables: tables,
                reservations: activeReservations
            )

            layout.addTimeSlot(timeSlot, assignments: assignment)
        }

        return optimizeLayout(layout)
    }

    // MARK: - Grid Positioning
    func calculateGridPositions(
        for tables: [TableModel],
        in bounds: CGRect
    ) -> [String: CGPoint] {

        var positions: [String: CGPoint] = [:]
        let gridSize = calculateOptimalGridSize(tableCount: tables.count, bounds: bounds)

        for (index, table) in tables.enumerated() {
            let row = index / gridSize.columns
            let column = index % gridSize.columns

            let x = bounds.minX + CGFloat(column) * (bounds.width / CGFloat(gridSize.columns))
            let y = bounds.minY + CGFloat(row) * (bounds.height / CGFloat(gridSize.rows))

            positions[table.id] = CGPoint(x: x, y: y)
        }

        return positions
    }

    // MARK: - Collision Detection
    func detectLayoutCollisions(
        tables: [TableModel],
        positions: [String: CGPoint]
    ) -> [LayoutCollision] {

        var collisions: [LayoutCollision] = []

        for (i, table1) in tables.enumerated() {
            for (j, table2) in tables.enumerated() where j > i {
                guard let pos1 = positions[table1.id],
                      let pos2 = positions[table2.id] else { continue }

                let distance = calculateDistance(pos1, pos2)
                let minDistance = calculateMinimumDistance(table1, table2)

                if distance < minDistance {
                    collisions.append(LayoutCollision(
                        table1: table1,
                        table2: table2,
                        overlap: minDistance - distance
                    ))
                }
            }
        }

        return collisions
    }
}

// MARK: - Supporting Data Structures
struct LayoutConfiguration {
    let date: Date
    var timeSlots: [TimeSlot: [TableAssignment]] = [:]

    mutating func addTimeSlot(_ timeSlot: TimeSlot, assignments: [TableAssignment]) {
        timeSlots[timeSlot] = assignments
    }
}

struct TimeSlot: Hashable {
    let startTime: String
    let endTime: String
}

struct TableAssignment {
    let tableId: String
    let reservationId: String?
    let status: AssignmentStatus

    enum AssignmentStatus {
        case available
        case occupied(Reservation)
        case transitioning  // Between reservations
        case outOfService
    }
}

struct LayoutCollision {
    let table1: TableModel
    let table2: TableModel
    let overlap: CGFloat
}
```

**TypeScript Migration** (Simplified Approach):

```typescript
// @seatkit/engine/src/layout/LayoutService.ts
export interface LayoutConfiguration {
	date: string;
	tables: Table[];
	assignments: Map<string, TableAssignment>; // timeSlot -> assignments
}

export interface TableAssignment {
	tableId: string;
	reservationId?: string;
	status: 'available' | 'occupied' | 'transitioning' | 'outOfService';
	startTime: string;
	endTime: string;
}

export class LayoutService {
	constructor(
		private readonly tableRepo: TableRepository,
		private readonly reservationRepo: ReservationRepository,
	) {}

	async calculateDailyLayout(date: string): Promise<LayoutConfiguration> {
		const [tables, reservations] = await Promise.all([
			this.tableRepo.findAll(),
			this.reservationRepo.findByDate(date),
		]);

		const assignments = new Map<string, TableAssignment>();
		const timeSlots = this.generateTimeSlots(date);

		for (const timeSlot of timeSlots) {
			const slotKey = `${timeSlot.startTime}-${timeSlot.endTime}`;

			for (const table of tables) {
				const reservation = this.findActiveReservation(
					reservations,
					table.id,
					timeSlot,
				);

				assignments.set(`${slotKey}-${table.id}`, {
					tableId: table.id,
					reservationId: reservation?.id,
					status: reservation ? 'occupied' : 'available',
					startTime: timeSlot.startTime,
					endTime: timeSlot.endTime,
				});
			}
		}

		return {
			date,
			tables,
			assignments,
		};
	}

	// Simplified grid positioning (no complex collision detection)
	calculateGridPositions(
		tables: Table[],
		containerWidth: number,
		containerHeight: number,
	): Map<string, { x: number; y: number }> {
		const positions = new Map<string, { x: number; y: number }>();
		const cols = Math.ceil(Math.sqrt(tables.length));
		const rows = Math.ceil(tables.length / cols);

		const cellWidth = containerWidth / cols;
		const cellHeight = containerHeight / rows;

		tables.forEach((table, index) => {
			const row = Math.floor(index / cols);
			const col = index % cols;

			positions.set(table.id, {
				x: col * cellWidth + cellWidth / 2,
				y: row * cellHeight + cellHeight / 2,
			});
		});

		return positions;
	}

	private generateTimeSlots(
		date: string,
	): Array<{ startTime: string; endTime: string }> {
		const slots: Array<{ startTime: string; endTime: string }> = [];

		// Generate 15-minute slots from 10:00 to 24:00
		for (let hour = 10; hour <= 23; hour++) {
			for (let minute = 0; minute < 60; minute += 15) {
				const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
				const endMinute = minute + 15;
				const endHour = endMinute === 60 ? hour + 1 : hour;
				const endTime = `${endHour.toString().padStart(2, '0')}:${(endMinute % 60).toString().padStart(2, '0')}`;

				slots.push({ startTime, endTime });
			}
		}

		return slots;
	}
}
```

---

### 3. ClusterServices (Table Combination Logic)

**Swift Implementation**:

```swift
class ClusterServices {
    // MARK: - Cluster Management
    func createOptimalClusters(
        for reservations: [Reservation],
        availableTables: [TableModel]
    ) -> [TableCluster] {

        var clusters: [TableCluster] = []
        let largeParties = reservations.filter { $0.numberOfPersons > 6 }

        for reservation in largeParties {
            if let cluster = findOrCreateCluster(
                for: reservation,
                from: availableTables
            ) {
                clusters.append(cluster)
            }
        }

        return clusters
    }

    // MARK: - Cluster Formation Algorithm
    private func findOrCreateCluster(
        for reservation: Reservation,
        from tables: [TableModel]
    ) -> TableCluster? {

        let partySize = reservation.numberOfPersons

        // Try single table first
        if let singleTable = tables.first(where: { $0.maxCapacity >= partySize }) {
            return createSingleTableCluster(table: singleTable, reservation: reservation)
        }

        // Try combinations of adjacent tables
        let combinations = generateTableCombinations(tables, maxTables: 4)

        for combination in combinations {
            let totalCapacity = combination.reduce(0) { $0 + $1.maxCapacity }

            if totalCapacity >= partySize {
                if areTablesAdjacent(combination) {
                    return createMultiTableCluster(
                        tables: combination,
                        reservation: reservation
                    )
                }
            }
        }

        return nil
    }

    // MARK: - Adjacency Algorithm
    private func areTablesAdjacent(_ tables: [TableModel]) -> Bool {
        guard tables.count > 1 else { return true }

        // Create adjacency graph
        var adjacencyMap: [String: Set<String>] = [:]

        for table in tables {
            adjacencyMap[table.id] = Set(table.adjacentTableIds)
        }

        // Check if all tables form a connected component
        return isConnectedComponent(tables.map(\.id), adjacencyMap: adjacencyMap)
    }

    private func isConnectedComponent(
        _ tableIds: [String],
        adjacencyMap: [String: Set<String>]
    ) -> Bool {
        guard let startTable = tableIds.first else { return true }

        var visited: Set<String> = []
        var queue: [String] = [startTable]

        while !queue.isEmpty {
            let current = queue.removeFirst()
            guard !visited.contains(current) else { continue }

            visited.insert(current)

            // Add adjacent tables to queue
            if let adjacentTables = adjacencyMap[current] {
                for adjacent in adjacentTables {
                    if tableIds.contains(adjacent) && !visited.contains(adjacent) {
                        queue.append(adjacent)
                    }
                }
            }
        }

        return visited.count == tableIds.count
    }

    // MARK: - Cluster Optimization
    func optimizeClusterLayout(_ cluster: TableCluster) -> TableCluster {
        // Optimize the physical arrangement of tables in cluster
        let tables = cluster.tables
        let optimizedPositions = calculateOptimalPositions(for: tables)

        var optimizedCluster = cluster
        optimizedCluster.layout = ClusterLayout(
            tables: tables,
            positions: optimizedPositions,
            totalBounds: calculateBounds(positions: optimizedPositions)
        )

        return optimizedCluster
    }
}

// MARK: - Supporting Structures
struct ClusterLayout {
    let tables: [TableModel]
    let positions: [String: CGPoint]
    let totalBounds: CGRect
}

extension TableCluster {
    var layout: ClusterLayout?
}
```

**TypeScript Migration**:

```typescript
// @seatkit/engine/src/table/ClusterService.ts
export interface TableCluster {
	id: string;
	name: string;
	tableIds: string[];
	totalCapacity: number;
	isConnected: boolean;
}

export class ClusterService {
	constructor(private readonly tableRepo: TableRepository) {}

	async createOptimalClusters(
		reservations: Reservation[],
		availableTables: Table[],
	): Promise<TableCluster[]> {
		const clusters: TableCluster[] = [];
		const largeParties = reservations.filter(r => r.numberOfPersons > 6);

		for (const reservation of largeParties) {
			const cluster = await this.findOrCreateCluster(
				reservation,
				availableTables,
			);
			if (cluster) {
				clusters.push(cluster);
			}
		}

		return clusters;
	}

	private async findOrCreateCluster(
		reservation: Reservation,
		availableTables: Table[],
	): Promise<TableCluster | null> {
		const partySize = reservation.numberOfPersons;

		// Try single table first
		const singleTable = availableTables.find(t => t.maxCapacity >= partySize);
		if (singleTable) {
			return this.createSingleTableCluster(singleTable, reservation);
		}

		// Try table combinations
		const combinations = this.generateTableCombinations(availableTables, 4);

		for (const combination of combinations) {
			const totalCapacity = combination.reduce(
				(sum, t) => sum + t.maxCapacity,
				0,
			);

			if (
				totalCapacity >= partySize &&
				(await this.areTablesAdjacent(combination))
			) {
				return this.createMultiTableCluster(combination, reservation);
			}
		}

		return null;
	}

	private async areTablesAdjacent(tables: Table[]): Promise<boolean> {
		if (tables.length <= 1) return true;

		// Build adjacency map
		const adjacencyMap = new Map<string, Set<string>>();

		for (const table of tables) {
			adjacencyMap.set(table.id, new Set(table.adjacentTableIds));
		}

		// Check connectivity using BFS
		const tableIds = tables.map(t => t.id);
		const visited = new Set<string>();
		const queue = [tableIds[0]];

		while (queue.length > 0) {
			const current = queue.shift()!;
			if (visited.has(current)) continue;

			visited.add(current);

			const adjacent = adjacencyMap.get(current) || new Set();
			for (const adjacentId of adjacent) {
				if (tableIds.includes(adjacentId) && !visited.has(adjacentId)) {
					queue.push(adjacentId);
				}
			}
		}

		return visited.size === tableIds.length;
	}

	private generateTableCombinations(
		tables: Table[],
		maxTables: number,
	): Table[][] {
		const combinations: Table[][] = [];

		// Generate all combinations of 2 to maxTables
		for (let size = 2; size <= Math.min(maxTables, tables.length); size++) {
			this.addCombinations(tables, size, 0, [], combinations);
		}

		return combinations;
	}

	private addCombinations(
		tables: Table[],
		size: number,
		start: number,
		current: Table[],
		result: Table[][],
	): void {
		if (current.length === size) {
			result.push([...current]);
			return;
		}

		for (let i = start; i < tables.length; i++) {
			current.push(tables[i]);
			this.addCombinations(tables, size, i + 1, current, result);
			current.pop();
		}
	}

	private createSingleTableCluster(
		table: Table,
		reservation: Reservation,
	): TableCluster {
		return {
			id: crypto.randomUUID(),
			name: `Table ${table.name}`,
			tableIds: [table.id],
			totalCapacity: table.maxCapacity,
			isConnected: true,
		};
	}

	private createMultiTableCluster(
		tables: Table[],
		reservation: Reservation,
	): TableCluster {
		const totalCapacity = tables.reduce((sum, t) => sum + t.maxCapacity, 0);
		const names = tables.map(t => t.name).join(' + ');

		return {
			id: crypto.randomUUID(),
			name: `Tables ${names}`,
			tableIds: tables.map(t => t.id),
			totalCapacity,
			isConnected: true,
		};
	}
}
```

---

### 4. ProfileService & SessionService (Multi-User Management)

**Swift Implementation**:

```swift
class SessionService: ObservableObject {
    @Published var activeSessions: [Session] = []
    @Published var currentUser: Profile?

    private let profileStore: ProfileStore
    private var sessionHeartbeatTimer: Timer?

    // MARK: - Session Management
    func startSession(for profile: Profile, deviceName: String) async throws -> Session {
        let session = Session(
            id: UUID().uuidString,
            uuid: UUID().uuidString,
            userName: profile.displayName,
            isEditing: false,
            lastUpdate: Date(),
            isActive: true,
            deviceName: deviceName,
            profileImageURL: profile.profileImageURL
        )

        // Register session with server
        try await registerSession(session)

        // Start heartbeat
        startHeartbeat(for: session)

        return session
    }

    // MARK: - Real-time Presence
    func updatePresence(
        sessionId: String,
        isEditing: Bool,
        editingEntityType: Session.EntityType? = nil,
        editingEntityId: String? = nil
    ) async {
        guard let session = activeSessions.first(where: { $0.id == sessionId }) else { return }

        var updatedSession = session
        updatedSession.isEditing = isEditing
        updatedSession.editingEntityType = editingEntityType
        updatedSession.editingEntityId = editingEntityId
        updatedSession.lastUpdate = Date()

        // Broadcast to other sessions
        await broadcastPresenceUpdate(updatedSession)
    }

    // MARK: - Conflict Detection
    func checkForEditingConflicts(
        entityType: Session.EntityType,
        entityId: String
    ) -> [Session] {
        return activeSessions.filter { session in
            session.isEditing &&
            session.editingEntityType == entityType &&
            session.editingEntityId == entityId
        }
    }

    // MARK: - Session Cleanup
    private func startHeartbeat(for session: Session) {
        sessionHeartbeatTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { _ in
            Task {
                await self.sendHeartbeat(session.id)
            }
        }
    }

    private func sendHeartbeat(_ sessionId: String) async {
        // Update last activity timestamp
        guard let index = activeSessions.firstIndex(where: { $0.id == sessionId }) else { return }

        activeSessions[index].lastUpdate = Date()

        // Clean up stale sessions
        await cleanupStaleSessions()
    }

    private func cleanupStaleSessions() async {
        let fiveMinutesAgo = Date().addingTimeInterval(-300)

        activeSessions = activeSessions.filter { session in
            session.lastUpdate > fiveMinutesAgo
        }
    }
}

// MARK: - Profile Service
class ProfileService: ObservableObject {
    @Published var currentProfile: Profile?

    private let dataStore: FirestoreDataStoreProtocol

    func authenticateUser(with appleID: String) async throws -> Profile {
        // Check if profile exists
        if let existingProfile = try await dataStore.getProfile(appleID: appleID) {
            self.currentProfile = existingProfile
            await updateLastLogin(existingProfile.id)
            return existingProfile
        }

        // Create new profile
        let profile = Profile(
            id: appleID,
            firstName: "", // Will be updated from Apple Sign-In
            lastName: "",
            email: "",
            devices: [],
            createdAt: Date(),
            language: "italian"
        )

        try await dataStore.insertProfile(profile)
        self.currentProfile = profile

        return profile
    }

    func updateProfile(_ profile: Profile) async throws {
        try await dataStore.updateProfile(profile)
        self.currentProfile = profile
    }

    func addDevice(_ device: Device, to profile: Profile) async throws {
        var updatedProfile = profile

        // Remove device if already exists
        updatedProfile.devices.removeAll { $0.id == device.id }

        // Add new device
        updatedProfile.devices.append(device)

        try await updateProfile(updatedProfile)
    }
}
```

**TypeScript Migration**:

```typescript
// @seatkit/engine/src/session/SessionService.ts
export class SessionService {
	private activeSessions = new Map<string, Session>();
	private heartbeatIntervals = new Map<string, NodeJS.Timeout>();

	constructor(
		private readonly sessionRepo: SessionRepository,
		private readonly logger: Logger,
	) {}

	async startSession(
		userId: string,
		userName: string,
		deviceName: string,
		deviceType: DeviceType,
	): Promise<Session> {
		const session: Session = {
			id: crypto.randomUUID(),
			userId,
			userName,
			isEditing: false,
			lastUpdate: new Date(),
			isActive: true,
			deviceName,
			deviceType,
			currentView: undefined,
			editingEntityType: undefined,
			editingEntityId: undefined,
		};

		// Store session
		await this.sessionRepo.insert(session);
		this.activeSessions.set(session.id, session);

		// Start heartbeat
		this.startHeartbeat(session.id);

		this.logger.info('Session started', { sessionId: session.id, userId });
		return session;
	}

	async updatePresence(
		sessionId: string,
		updates: {
			isEditing?: boolean;
			editingEntityType?: EntityType;
			editingEntityId?: string;
			currentView?: ViewType;
		},
	): Promise<void> {
		const session = this.activeSessions.get(sessionId);
		if (!session) return;

		const updatedSession: Session = {
			...session,
			...updates,
			lastUpdate: new Date(),
		};

		this.activeSessions.set(sessionId, updatedSession);
		await this.sessionRepo.update(updatedSession);

		// Broadcast to other sessions via WebSocket/SSE
		await this.broadcastPresenceUpdate(updatedSession);
	}

	checkEditingConflicts(
		entityType: EntityType,
		entityId: string,
		excludeSessionId?: string,
	): Session[] {
		const conflicts: Session[] = [];

		for (const session of this.activeSessions.values()) {
			if (
				session.id !== excludeSessionId &&
				session.isEditing &&
				session.editingEntityType === entityType &&
				session.editingEntityId === entityId
			) {
				conflicts.push(session);
			}
		}

		return conflicts;
	}

	async endSession(sessionId: string): Promise<void> {
		const session = this.activeSessions.get(sessionId);
		if (!session) return;

		// Stop heartbeat
		const heartbeat = this.heartbeatIntervals.get(sessionId);
		if (heartbeat) {
			clearInterval(heartbeat);
			this.heartbeatIntervals.delete(sessionId);
		}

		// Remove from active sessions
		this.activeSessions.delete(sessionId);
		await this.sessionRepo.delete(sessionId);

		this.logger.info('Session ended', { sessionId });
	}

	private startHeartbeat(sessionId: string): void {
		const interval = setInterval(async () => {
			await this.sendHeartbeat(sessionId);
		}, 30_000); // 30 seconds

		this.heartbeatIntervals.set(sessionId, interval);
	}

	private async sendHeartbeat(sessionId: string): Promise<void> {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			// Session no longer exists, cleanup heartbeat
			const interval = this.heartbeatIntervals.get(sessionId);
			if (interval) {
				clearInterval(interval);
				this.heartbeatIntervals.delete(sessionId);
			}
			return;
		}

		// Update last activity
		session.lastUpdate = new Date();
		await this.sessionRepo.update(session);

		// Cleanup stale sessions
		await this.cleanupStaleSessions();
	}

	private async cleanupStaleSessions(): Promise<void> {
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
		const staleSessions: string[] = [];

		for (const [sessionId, session] of this.activeSessions.entries()) {
			if (session.lastUpdate < fiveMinutesAgo) {
				staleSessions.push(sessionId);
			}
		}

		// Remove stale sessions
		for (const sessionId of staleSessions) {
			await this.endSession(sessionId);
		}
	}

	private async broadcastPresenceUpdate(session: Session): Promise<void> {
		// Implementation depends on real-time solution (WebSocket, SSE, etc.)
		// This would notify other connected clients about the presence update
	}
}

// Profile Service
export class ProfileService {
	constructor(
		private readonly profileRepo: ProfileRepository,
		private readonly logger: Logger,
	) {}

	async authenticateUser(userData: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
	}): Promise<Profile> {
		// Check existing profile
		const existing = await this.profileRepo.findById(userData.id);
		if (existing) {
			// Update last login
			await this.profileRepo.update({
				...existing,
				lastLogin: new Date(),
			});
			return existing;
		}

		// Create new profile
		const profile: Profile = {
			...userData,
			phone: undefined,
			language: 'italian',
			profileImageURL: undefined,
			avatarColor: this.generateAvatarColor(),
			devices: [],
			createdAt: new Date(),
			lastLogin: new Date(),
			isActive: true,
		};

		await this.profileRepo.insert(profile);
		this.logger.info('New profile created', { profileId: profile.id });

		return profile;
	}

	async updateProfile(
		profileId: string,
		updates: UpdateProfileData,
	): Promise<Profile> {
		const existing = await this.profileRepo.findById(profileId);
		if (!existing) {
			throw new Error(`Profile not found: ${profileId}`);
		}

		const updated: Profile = {
			...existing,
			...updates,
		};

		await this.profileRepo.update(updated);
		return updated;
	}

	private generateAvatarColor(): string {
		const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
		return colors[Math.floor(Math.random() * colors.length)];
	}
}
```

---

## 🔄 Service Integration Patterns

### Service Communication & Dependencies

**Swift Dependency Graph**:

```swift
// Services depend on each other through injection
ReservationService → TableStore, DataStore
LayoutServices → TableStore, ReservationStore
ClusterServices → TableStore
TableAssignmentService → ClusterServices, LayoutServices
SessionService → ProfileStore
ProfileService → DataStore
```

**TypeScript Service Integration**:

```typescript
// @seatkit/engine/src/index.ts - Service Factory
export class ServiceContainer {
	// Repositories (injected from API layer)
	private readonly reservationRepo: ReservationRepository;
	private readonly tableRepo: TableRepository;
	private readonly profileRepo: ProfileRepository;
	private readonly sessionRepo: SessionRepository;

	// Services (created lazily)
	private _reservationService?: ReservationService;
	private _layoutService?: LayoutService;
	private _clusterService?: ClusterService;
	private _sessionService?: SessionService;
	private _profileService?: ProfileService;

	constructor(repositories: {
		reservation: ReservationRepository;
		table: TableRepository;
		profile: ProfileRepository;
		session: SessionRepository;
	}) {
		this.reservationRepo = repositories.reservation;
		this.tableRepo = repositories.table;
		this.profileRepo = repositories.profile;
		this.sessionRepo = repositories.session;
	}

	get reservationService(): ReservationService {
		if (!this._reservationService) {
			this._reservationService = new ReservationService(
				this.reservationRepo,
				this.tableRepo,
				this.logger,
			);
		}
		return this._reservationService;
	}

	get layoutService(): LayoutService {
		if (!this._layoutService) {
			this._layoutService = new LayoutService(
				this.tableRepo,
				this.reservationRepo,
			);
		}
		return this._layoutService;
	}

	get clusterService(): ClusterService {
		if (!this._clusterService) {
			this._clusterService = new ClusterService(this.tableRepo);
		}
		return this._clusterService;
	}

	// ... other services
}

// Usage in API layer
// @seatkit/api/src/app.ts
const serviceContainer = new ServiceContainer({
	reservation: reservationRepository,
	table: tableRepository,
	profile: profileRepository,
	session: sessionRepository,
});

app.post('/api/reservations', async (req, res) => {
	const service = serviceContainer.reservationService;
	// ... use service
});
```

---

## 🧪 Service Testing Patterns

### Swift Testing Approach

```swift
// Mock protocol implementations
class MockFirestoreDataStore: FirestoreDataStoreProtocol {
    var reservations: [Reservation] = []

    func insertReservation(_ reservation: Reservation) async throws {
        reservations.append(reservation)
    }

    func streamReservations() -> AsyncThrowingStream<[Reservation], Error> {
        AsyncThrowingStream { continuation in
            continuation.yield(reservations)
            continuation.finish()
        }
    }
}

// Service testing
@MainActor
class ReservationServiceTests: XCTestCase {
    var service: ReservationService!
    var mockDataStore: MockFirestoreDataStore!
    var mockTableStore: MockTableStore!

    override func setUp() {
        mockDataStore = MockFirestoreDataStore()
        mockTableStore = MockTableStore()
        service = ReservationService(
            dataStore: mockDataStore,
            tableStore: mockTableStore
        )
    }

    func testCreateReservation() async throws {
        let reservation = try await service.createReservation(
            name: "John Doe",
            phone: "123-456-7890",
            partySize: 2,
            date: Date(),
            time: "19:30",
            category: .dinner
        )

        XCTAssertEqual(reservation.name, "John Doe")
        XCTAssertEqual(mockDataStore.reservations.count, 1)
    }
}
```

**TypeScript Testing Approach**:

```typescript
// @seatkit/engine/src/reservation/__tests__/ReservationService.test.ts
describe('ReservationService', () => {
	let service: ReservationService;
	let mockReservationRepo: jest.Mocked<ReservationRepository>;
	let mockTableRepo: jest.Mocked<TableRepository>;
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		mockReservationRepo = {
			insert: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			findById: jest.fn(),
			findByDate: jest.fn(),
			findAvailable: jest.fn(),
		} as any;

		mockTableRepo = {
			findAll: jest.fn(),
			findAvailable: jest.fn(),
			findById: jest.fn(),
		} as any;

		mockLogger = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
		} as any;

		service = new ReservationService(
			mockReservationRepo,
			mockTableRepo,
			mockLogger,
		);
	});

	describe('createReservation', () => {
		it('should create reservation with valid data', async () => {
			const reservationData: CreateReservationData = {
				name: 'John Doe',
				phone: '123-456-7890',
				numberOfPersons: 2,
				dateString: '2025-10-26',
				startTime: '19:30',
				category: 'dinner',
				type: 'inAdvance',
				status: 'pending',
				acceptance: 'toConfirm',
			};

			mockTableRepo.findAvailable.mockResolvedValue([
				{ id: '1', name: 'Table 1', maxCapacity: 4, minCapacity: 2 } as Table,
			]);

			const result = await service.createReservation(reservationData);

			expect(result.name).toBe('John Doe');
			expect(result.numberOfPersons).toBe(2);
			expect(mockReservationRepo.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'John Doe',
					numberOfPersons: 2,
				}),
			);
		});

		it('should throw error for invalid party size', async () => {
			const invalidData: CreateReservationData = {
				// ... other fields
				numberOfPersons: 0, // Invalid
			} as any;

			await expect(service.createReservation(invalidData)).rejects.toThrow(
				'Invalid party size',
			);
		});
	});
});
```

---

This service layer analysis provides the blueprint for implementing sophisticated business logic in TypeScript while maintaining the proven patterns from the Swift application. The key is preserving the business intelligence while adapting to modern web service patterns.
