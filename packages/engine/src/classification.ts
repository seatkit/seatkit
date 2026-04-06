import { isSameDay } from '@seatkit/utils/date';

/**
 * Classify the reservation type at creation time.
 * Mirrors KoenjiApp's determineReservationType() in Reservation.swift.
 *
 * RES-05: Walk-in if same day and creation time at or after reservation start time.
 * WaitingList is preserved if already explicitly set.
 *
 * Note: UTC-based comparison. Phase 2 may add timezone config.
 */
export function classifyReservationType(
	creationTime: Date,
	reservationDate: Date,
	reservationStartTime: Date,
	existingType?: 'walk_in' | 'inAdvance' | 'waitingList',
): 'walk_in' | 'inAdvance' | 'waitingList' {
	if (existingType === 'waitingList') return 'waitingList';
	if (existingType === 'inAdvance') return 'inAdvance';
	if (isSameDay(creationTime, reservationDate) && creationTime >= reservationStartTime) {
		return 'walk_in';
	}
	return 'inAdvance';
}
