/**
 * Wave 0 test stubs — VIEW-01, VIEW-02
 * These tests MUST FAIL until ReservationTimelineView is implemented in Plan 04.
 */
import { describe, it } from 'vitest';

describe('ReservationTimelineView (VIEW-01, VIEW-02)', () => {
	it.todo('renders one row per table in the virtualized list');
	it.todo('reservation blocks have inline backgroundColor from uuidToColor');
	it.todo('empty state message shown when no reservations for the service');
	it.todo('"Now" indicator renders only when viewed date equals today');
	it.todo('clicking a reservation block calls onReservationClick with the reservation id');
	it.todo('clicking an empty slot calls onSlotClick with tableId and time');
});
