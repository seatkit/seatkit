/**
 * PresenceBadge — D-08, D-09, D-10
 * Avatar circle showing a colleague's presence state.
 * Gray = viewing; Amber = editing.
 * Used in:
 *   - Reservation form header (D-07): shows who has THIS reservation open
 *   - App navigation (D-09): shows all staff currently online
 */
'use client';

import { useShallow } from 'zustand/shallow';

import { useStaff } from '../lib/queries/staff.js';
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
					: 'bg-muted text-muted-foreground ring-2 ring-border',
			].join(' ')}
		>
			{initials.slice(0, 2).toUpperCase()}
		</span>
	);
}

/** Show all staff currently online (app-level, D-09) */
export function AppPresenceBadgeRow() {
	const entries = usePresenceStore(useShallow((s) => Object.values(s.entries)));
	const { data: staffData } = useStaff();

	// Build userId → initials map — Phase 4 resolves real names (RESEARCH.md Pitfall 4)
	const staffMap = new Map(
		(staffData?.users ?? []).map((s) => [
			s.id,
			s.name
				.split(' ')
				.map((part) => part[0]?.toUpperCase() ?? '')
				.slice(0, 2)
				.join(''),
		]),
	);

	if (entries.length === 0) return null;

	return (
		<div className="flex items-center gap-1" aria-label="Staff online">
			{entries.map((entry) => (
				<PresenceBadge
					key={entry.sessionId}
					initials={staffMap.get(entry.userId) ?? entry.userId.slice(0, 2).toUpperCase()}
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
	const entries = usePresenceStore(
		useShallow((s) =>
			Object.values(s.entries).filter(
				(e) => e.currentReservationId === reservationId && e.userId !== currentUserId,
			),
		),
	);
	const { data: staffData } = useStaff();

	const staffMap = new Map(
		(staffData?.users ?? []).map((s) => [
			s.id,
			s.name
				.split(' ')
				.map((part) => part[0]?.toUpperCase() ?? '')
				.slice(0, 2)
				.join(''),
		]),
	);

	if (entries.length === 0) return null;

	return (
		<div className="flex items-center gap-1" aria-label="Colleagues editing this reservation">
			{entries.map((entry) => (
				<PresenceBadge
					key={entry.sessionId}
					initials={staffMap.get(entry.userId) ?? entry.userId.slice(0, 2).toUpperCase()}
					state={entry.presenceState}
				/>
			))}
		</div>
	);
}
