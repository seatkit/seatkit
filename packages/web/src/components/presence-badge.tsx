/**
 * PresenceBadge — D-08, D-09, D-10
 * Avatar circle showing a colleague's presence state.
 * Gray = viewing; Amber = editing.
 * Used in:
 *   - Reservation form header (D-07): shows who has THIS reservation open
 *   - App navigation (D-09): shows all staff currently online
 */
'use client';

import { usePresenceStore } from '../stores/presence-store.js';

type PresenceBadgeProps = Readonly<{
	/** Display name or initials — caller is responsible for lookup */
	initials: string;
	state: 'viewing' | 'editing';
}>;

export function PresenceBadge({ initials, state }: PresenceBadgeProps) {
	const isEditing = state === 'editing';
	return (
		<span
			title={isEditing ? 'Editing' : 'Viewing'}
			className={[
				'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold select-none',
				isEditing
					? 'bg-amber-400 text-amber-900 ring-2 ring-amber-500'
					: 'bg-gray-200 text-gray-600 ring-2 ring-gray-300',
			].join(' ')}
		>
			{initials.slice(0, 2).toUpperCase()}
		</span>
	);
}

/** Show all staff currently online (app-level, D-09) */
export function AppPresenceBadgeRow() {
	const entries = usePresenceStore((s) => Object.values(s.entries));
	if (entries.length === 0) return null;

	return (
		<div className="flex items-center gap-1" aria-label="Staff online">
			{entries.map((entry) => (
				<PresenceBadge
					key={entry.sessionId}
					initials={entry.userId.slice(0, 2)} // Phase 4 will look up real names
					state={entry.presenceState}
				/>
			))}
		</div>
	);
}

/** Show colleagues viewing/editing a specific reservation (reservation-level, D-07, D-08) */
export function ReservationPresenceBadgeRow({
	reservationId,
	currentUserId,
}: Readonly<{
	reservationId: string;
	currentUserId: string;
}>) {
	const entries = usePresenceStore((s) =>
		Object.values(s.entries).filter(
			(e) => e.currentReservationId === reservationId && e.userId !== currentUserId,
		),
	);

	if (entries.length === 0) return null;

	return (
		<div className="flex items-center gap-1" aria-label="Colleagues viewing this reservation">
			{entries.map((entry) => (
				<PresenceBadge
					key={entry.sessionId}
					initials={entry.userId.slice(0, 2)}
					state={entry.presenceState}
				/>
			))}
		</div>
	);
}
