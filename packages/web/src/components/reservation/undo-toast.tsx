'use client';

import React, { useEffect, useCallback } from 'react';

import { useUpdateReservation } from '../../lib/queries/reservations.js';
import { useReservationUndoStore } from '../../stores/reservation-undo-store.js';

type UndoToastProps = Readonly<{
	/** Called when the toast should be dismissed by the parent */
	onDismiss: () => void;
	/** Whether the toast is visible */
	visible: boolean;
	/** Whether to show "Undone" confirmation (after undo completes) */
	showUndone?: boolean;
}>;

/**
 * UndoToast — D-11
 * Bottom-center toast that appears after a successful save.
 * Shows "Saved  Undo" for 10 seconds. Clicking Undo re-submits the pre-save snapshot.
 */
export function UndoToast({ onDismiss, visible, showUndone = false }: UndoToastProps) {
	const { snapshot, snapshotId, clearSnapshot } = useReservationUndoStore();
	const updateMutation = useUpdateReservation({ retry: 0 });

	// Auto-dismiss after 10 seconds
	useEffect(() => {
		if (!visible) return;
		const timer = setTimeout(() => {
			clearSnapshot();
			onDismiss();
		}, 10_000);
		return () => clearTimeout(timer);
	}, [visible, clearSnapshot, onDismiss]);

	const handleUndo = useCallback(async () => {
		if (!snapshot || !snapshotId) return;
		clearSnapshot();
		onDismiss();
		try {
			await updateMutation.mutateAsync({
				...snapshot,
				id: snapshotId,
				// version must be current — snapshot contains the version from before the save
				// Caller should include versionId in snapshot; if not present, this will 409
				versionId: (snapshot as unknown as { versionId?: number }).versionId ?? 1,
			});
		} catch {
			// Undo failed silently — the user can refresh to see current state
		}
	}, [snapshot, snapshotId, clearSnapshot, onDismiss, updateMutation]);

	if (!visible) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-full px-5 py-3 shadow-lg flex items-center gap-3 text-sm"
		>
			{showUndone ? (
				<span>Undone</span>
			) : (
				<>
					<span>Saved</span>
					<button
						type="button"
						onClick={() => { handleUndo(); }}
						className="font-semibold text-amber-400 underline cursor-pointer hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 rounded"
					>
						Undo
					</button>
				</>
			)}
		</div>
	);
}
