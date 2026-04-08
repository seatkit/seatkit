/**
 * ConflictModal — D-06
 * Displayed when a PUT /reservations/:id returns 409.
 * Shows field-level diff between user's draft and the current server version.
 * Actions: "Apply your changes on top" (re-submit with new version) or "Discard draft".
 */
'use client';

import { useEffect, useRef } from 'react';
import type { UpdateReservation } from '@seatkit/types';
import type { Reservation } from '../lib/api-types.js';

type ConflictModalProps = Readonly<{
	open: boolean;
	/** User's unsaved edits */
	draft: Partial<UpdateReservation>;
	/** Current server state from the 409 body */
	serverVersion: Reservation;
	/** Called with the server's current version number — caller should re-submit with this version */
	onApply: (newVersion: number) => void;
	/** Called when user chooses to discard their draft and accept server version */
	onDiscard: () => void;
}>;

type FieldDiff = {
	field: string;
	draft: unknown;
	server: unknown;
};

/** Compare only the fields present in draft against server version */
function computeDiff(draft: Partial<UpdateReservation>, server: Reservation): FieldDiff[] {
	const diffs: FieldDiff[] = [];
	for (const key of Object.keys(draft) as (keyof UpdateReservation)[]) {
		if (key === 'id' || key === 'updatedAt') continue;
		const draftVal = draft[key];
		const serverVal = server[key];
		if (JSON.stringify(draftVal) !== JSON.stringify(serverVal)) {
			diffs.push({ field: key, draft: draftVal, server: serverVal });
		}
	}
	return diffs;
}

function formatValue(val: unknown): string {
	if (val === null || val === undefined) return '—';
	if (val instanceof Date) return val.toLocaleString();
	if (typeof val === 'object') return JSON.stringify(val);
	return String(val as string | number | boolean);
}

export function ConflictModal({ open, draft, serverVersion, onApply, onDiscard }: ConflictModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open) {
			if (!dialog.open) dialog.showModal();
		} else {
			if (dialog.open) dialog.close();
		}
	}, [open]);

	const diffs = computeDiff(draft, serverVersion);

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby="conflict-modal-title"
			data-testid="conflict-modal"
			className="rounded-lg shadow-xl max-w-md w-full mx-4 p-6 backdrop:bg-black/40"
			onClose={onDiscard}
		>
			<h2 id="conflict-modal-title" className="text-lg font-semibold text-gray-900 mb-2">
				Edit conflict
			</h2>
			<p className="text-sm text-gray-600 mb-4">
				Another staff member saved changes while you were editing. Review the differences below.
			</p>

			{diffs.length === 0 ? (
				<p className="text-sm text-gray-500 italic mb-4">No conflicting fields — safe to apply.</p>
			) : (
				<table className="w-full text-sm mb-4 border-collapse">
					<thead>
						<tr className="text-left text-gray-500">
							<th className="py-1 pr-4">Field</th>
							<th className="py-1 pr-4">Your draft</th>
							<th className="py-1">Current saved</th>
						</tr>
					</thead>
					<tbody>
						{diffs.map(({ field, draft: d, server: s }) => (
							<tr key={field} className="border-t border-gray-100">
								<td className="py-1 pr-4 font-medium text-gray-700">{field}</td>
								<td className="py-1 pr-4 text-amber-700">{formatValue(d)}</td>
								<td className="py-1 text-gray-600">{formatValue(s)}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			<div className="flex gap-3 justify-end">
				<button
					type="button"
					onClick={onDiscard}
					className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
				>
					Discard draft
				</button>
				<button
					type="button"
					onClick={() => onApply(serverVersion.version)}
					className="px-4 py-2 text-sm text-white bg-amber-600 rounded-md hover:bg-amber-700"
				>
					Apply your changes on top
				</button>
			</div>
		</dialog>
	);
}
