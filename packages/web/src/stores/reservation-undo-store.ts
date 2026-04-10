/**
 * Reservation undo store — D-11
 * Stores a pre-save snapshot of the reservation form state.
 * After a successful save, the UndoToast reads this snapshot.
 * Clicking "Undo" re-submits the snapshot as a mutation.
 */
'use client';

import { create } from 'zustand';

import type { UpdateReservation } from '@seatkit/types';

type ReservationUndoStore = {
	/** The pre-save form state. Null when no recent save. */
	snapshot: UpdateReservation | null;
	/** The reservation ID the snapshot belongs to */
	snapshotId: string | null;
	/** Store a snapshot before saving */
	setSnapshot: (id: string, data: UpdateReservation) => void;
	/** Clear snapshot (on timeout, undo completion, or any new action) */
	clearSnapshot: () => void;
};

export const useReservationUndoStore = create<ReservationUndoStore>((set) => ({
	snapshot: null,
	snapshotId: null,
	setSnapshot: (id, data) => set({ snapshotId: id, snapshot: data }),
	clearSnapshot: () => set({ snapshot: null, snapshotId: null }),
}));
