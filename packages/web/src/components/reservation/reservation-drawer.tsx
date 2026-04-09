'use client';

import { X, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

import {
	useCreateReservation,
	useUpdateReservation,
	useDeleteReservation,
} from '../../lib/queries/reservations.js';
import { useReservationUndoStore } from '../../stores/reservation-undo-store.js';
import { ConflictModal } from '../conflict-modal.js';
import { ReservationPresenceBadgeRow } from '../presence-badge.js';

import { ReservationForm, type FormValues } from './reservation-form.js';
import { UndoToast } from './undo-toast.js';

import type { Reservation } from '../../lib/api-types.js';
import type { UpdateReservation } from '@seatkit/types';

type DrawerMode = 'create' | 'edit';

type ReservationDrawerProps = Readonly<{
	open: boolean;
	mode: DrawerMode;
	/** Edit mode: existing reservation to populate form */
	reservation?: Reservation | null;
	/** Create mode: pre-fill from timeline slot click */
	prefill?: {
		tableId?: string;
		date?: Date;
		time?: string;
		category?: 'lunch' | 'dinner' | 'special' | 'walk_in';
	};
	onClose: () => void;
	currentUserId: string;
}>;

function reservationToFormValues(r: Reservation): FormValues {
	const d = new Date(r.date);
	return {
		guestName: r.customer.name,
		phone: r.customer.phone,
		partySize: r.partySize,
		date: d.toLocaleDateString('en-CA'),
		startTime: d.toTimeString().slice(0, 5),
		category: r.category as FormValues['category'],
		notes: r.notes ?? '',
		preferredLanguage: r.preferredLanguage ?? '',
		emoji: r.emoji ?? '',
		isLargeGroup: r.isLargeGroup,
		tableIds: r.tableIds ?? [],
		acceptanceState: r.acceptanceState,
		photoUrl: r.photoUrl ?? null,
	};
}

function defaultFormValues(prefill?: ReservationDrawerProps['prefill']): FormValues {
	const now = new Date();
	return {
		guestName: '',
		phone: '',
		partySize: 2,
		date: prefill?.date?.toLocaleDateString('en-CA') ?? now.toLocaleDateString('en-CA'),
		startTime: prefill?.time ?? now.toTimeString().slice(0, 5),
		category: prefill?.category ?? 'lunch',
		notes: '',
		preferredLanguage: '',
		emoji: '',
		isLargeGroup: false,
		tableIds: prefill?.tableId ? [prefill.tableId] : [],
		acceptanceState: 'toConfirm',
		photoUrl: null,
	};
}

export function ReservationDrawer({
	open,
	mode,
	reservation,
	prefill,
	onClose,
	currentUserId,
}: ReservationDrawerProps) {
	const [values, setValues] = useState<FormValues>(() =>
		mode === 'edit' && reservation
			? reservationToFormValues(reservation)
			: defaultFormValues(prefill),
	);
	const savedValues = useRef<FormValues>(values);

	const [conflictOpen, setConflictOpen] = useState(false);
	const [conflictDraft, setConflictDraft] = useState<Partial<UpdateReservation> | null>(null);
	const [conflictServerVersion, setConflictServerVersion] = useState<Reservation | null>(null);

	const [showUndoToast, setShowUndoToast] = useState(false);
	const [showUndoneFeedback, setShowUndoneFeedback] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	const { setSnapshot } = useReservationUndoStore();

	const createMutation = useCreateReservation();
	const updateMutation = useUpdateReservation({
		onConflict: ({ draft, current }) => {
			setConflictDraft(draft);
			setConflictServerVersion(current);
			setConflictOpen(true);
		},
	});
	const deleteMutation = useDeleteReservation();

	// Reset form when drawer opens with new data
	useEffect(() => {
		if (open) {
			const init =
				mode === 'edit' && reservation
					? reservationToFormValues(reservation)
					: defaultFormValues(prefill);
			setValues(init);
			savedValues.current = init;
			setConflictOpen(false);
			setShowUndoToast(false);
			setShowDeleteConfirm(false);
			setValidationError(null);
		}
	}, [open, mode, reservation, prefill]);

	const handleSave = useCallback(async () => {
		// Client-side guard: catch missing required fields before the API call so the
		// user gets immediate feedback instead of a silent 400.
		if (!values.guestName.trim()) {
			setValidationError('Guest name is required.');
			return;
		}
		if (!values.phone.trim()) {
			setValidationError('Phone number is required.');
			return;
		}
		// PhoneSchema requires 10–15 digits. Count digits only.
		const digits = values.phone.replaceAll(/\D/g, '');
		if (digits.length < 10 || digits.length > 15) {
			setValidationError('Phone number must contain between 10 and 15 digits.');
			return;
		}
		setValidationError(null);

		try {
			if (mode === 'create') {
				const dateTimeStr = `${values.date}T${values.startTime}:00`;
				await createMutation.mutateAsync({
					date: new Date(dateTimeStr),
					duration: 90,
					customer: { name: values.guestName, phone: values.phone },
					partySize: values.partySize,
					category: values.category,
					notes: values.notes || null,
					preferredLanguage: values.preferredLanguage || null,
					emoji: values.emoji || null,
					isLargeGroup: values.isLargeGroup,
					acceptanceState: values.acceptanceState,
					tableIds: values.tableIds.length > 0 ? values.tableIds : null,
					createdBy: currentUserId,
					source: 'phone',
				});
				setShowUndoToast(true);
				onClose();
			} else if (mode === 'edit' && reservation) {
				// Capture the pre-save form state now (before the await) so we can
				// snapshot it for undo once we know the new version the server assigns.
				const preEditFormValues = { ...savedValues.current };
				const preEditUpdatedAt = new Date(reservation.updatedAt);

				const dateTimeStr = `${values.date}T${values.startTime}:00`;
				const updated = await updateMutation.mutateAsync({
					id: reservation.id,
					updatedAt: new Date(),
					versionId: reservation.version,
					date: new Date(dateTimeStr),
					customer: { name: values.guestName, phone: values.phone },
					partySize: values.partySize,
					notes: values.notes || null,
					preferredLanguage: values.preferredLanguage || null,
					emoji: values.emoji || null,
					isLargeGroup: values.isLargeGroup,
					acceptanceState: values.acceptanceState,
				});

				// Snapshot AFTER the save resolves so we have the server's new version.
				// The undo payload must carry versionId = updated.version (N+1) so the
				// optimistic lock accepts it when reverting to the pre-save data.
				setSnapshot(reservation.id, {
					id: reservation.id,
					updatedAt: preEditUpdatedAt,
					customer: { name: preEditFormValues.guestName, phone: preEditFormValues.phone },
					partySize: preEditFormValues.partySize,
					notes: preEditFormValues.notes || null,
					preferredLanguage: preEditFormValues.preferredLanguage || null,
					emoji: preEditFormValues.emoji || null,
					isLargeGroup: preEditFormValues.isLargeGroup,
					acceptanceState: preEditFormValues.acceptanceState,
					versionId: updated.reservation.version,
				} as UpdateReservation & { versionId: number });

				savedValues.current = values;
				setShowUndoToast(true);
				onClose();
			}
		} catch {
			// Errors handled by mutation.onError or ConflictModal via onConflict
		}
	}, [mode, values, reservation, currentUserId, createMutation, updateMutation, setSnapshot, onClose]);

	const handleDelete = useCallback(async () => {
		if (!reservation) return;
		await deleteMutation.mutateAsync(reservation.id);
		setShowDeleteConfirm(false);
		onClose();
	}, [reservation, deleteMutation, onClose]);

	const handleConflictApply = useCallback(
		// newVersion is passed from ConflictModal but we re-trigger save which reads current state
		// eslint-disable-next-line no-unused-vars
		(_newVersion: number) => {
			setConflictOpen(false);
			// The user clicks Apply — they accept their draft on top of server state.
			// Re-trigger save with updated version.
			handleSave();
		},
		[handleSave],
	);

	const handleConflictDiscard = useCallback(() => {
		setConflictOpen(false);
		// Reset form to server state
		if (conflictServerVersion) {
			const reset = reservationToFormValues(conflictServerVersion);
			setValues(reset);
			savedValues.current = reset;
		}
	}, [conflictServerVersion]);

	const isSaving = createMutation.isPending || updateMutation.isPending;
	const saveButtonLabel =
		isSaving ? 'Saving...' :
		mode === 'create' ? 'Save reservation' :
		'Save changes';

	return (
		<>
			{/* Backdrop */}
			{open && (
				<div
					className="fixed inset-0 bg-black/40 z-40"
					aria-hidden="true"
					onClick={() => onClose()}
				/>
			)}

			{/* Drawer — slide-over. Uses <dialog> for semantics; !flex overrides the
			    browser's default display:none so the CSS transform animation still works. */}
			<dialog
				aria-labelledby="drawer-title"
				aria-hidden={!open}
				className={[
					'fixed inset-y-0 right-0 w-full md:w-[480px] z-50 bg-background shadow-2xl',
					'transition-transform duration-200 ease-out',
					'!flex flex-col m-0 p-0 max-h-none max-w-none h-full border-none',
					open ? 'translate-x-0' : 'translate-x-full',
				].join(' ')}
			>
				{/* Header */}
				<div className="h-14 px-6 flex items-center justify-between border-b border-border shrink-0">
					<button
						type="button"
						onClick={onClose}
						aria-label="Close drawer"
						className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<X className="w-4 h-4" />
					</button>
					<h2 id="drawer-title" className="text-xl font-semibold">
						{mode === 'create'
							? 'New reservation'
							: (reservation?.customer.name ?? 'Edit reservation')}
					</h2>
					<span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
						{mode === 'create' ? 'New' : 'Edit'}
					</span>
				</div>

				{/* Body — scrollable form */}
				<div className="flex-1 overflow-y-auto px-6">
					<ReservationForm
						mode={mode}
						values={values}
						reservationId={reservation?.id ?? null}
						onChange={setValues}
						onResetToSaved={() => {
							setValues(savedValues.current);
						}}
						lastEditedAt={reservation?.updatedAt instanceof Date ? reservation.updatedAt.toISOString() : (reservation?.updatedAt ?? null)}
					/>
				</div>

				{/* Footer — sticky */}
				<div
					className="sticky bottom-0 bg-background border-t border-border px-6 py-3 shrink-0"
					data-testid="reservation-presence-row"
				>
					{/* Validation error — shown above the action row */}
					{validationError && (
						<p role="alert" className="text-sm text-destructive mb-2">
							{validationError}
						</p>
					)}

					<div className="flex items-center justify-between min-h-[40px]">
						{/* Left: presence badges */}
						<div className="flex items-center gap-2">
							{reservation?.id && (
								<ReservationPresenceBadgeRow
									reservationId={reservation.id}
									currentUserId={currentUserId}
								/>
							)}
						</div>

						{/* Right: Delete + Save */}
						<div className="flex items-center gap-3">
							{mode === 'edit' && reservation && !reservation.isDeleted && (
								<button
									type="button"
									onClick={() => {
										setShowDeleteConfirm(true);
									}}
									aria-label="Delete reservation"
									className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-destructive text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							)}
							<button
								type="button"
								onClick={() => { handleSave(); }}
								disabled={isSaving}
								className="inline-flex items-center justify-center px-4 h-10 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
							>
								{saveButtonLabel}
							</button>
						</div>
					</div>
				</div>

				{/* Delete confirmation dialog */}
				{showDeleteConfirm && (
					<dialog
						open
						className="fixed inset-0 z-[60] m-auto w-full max-w-sm rounded-xl bg-background border border-border shadow-2xl p-6"
						aria-labelledby="delete-confirm-title"
					>
						<h3 id="delete-confirm-title" className="text-xl font-semibold mb-2">
							Delete this reservation?
						</h3>
						<p className="text-sm text-muted-foreground mb-6">
							The reservation will be hidden from all views. You can recover it at any time from
							the Deleted filter in the list.
						</p>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => {
									setShowDeleteConfirm(false);
								}}
								className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => { handleDelete(); }}
								className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive"
							>
								Delete reservation
							</button>
						</div>
					</dialog>
				)}

				{/* ConflictModal — z-60, overlays the drawer at z-50 */}
				{conflictOpen && conflictDraft && conflictServerVersion && (
					<ConflictModal
						open={conflictOpen}
						draft={conflictDraft}
						serverVersion={conflictServerVersion}
						onApply={handleConflictApply}
						onDiscard={handleConflictDiscard}
					/>
				)}
			</dialog>

			{/* UndoToast — outside drawer, bottom-center */}
			<UndoToast
				visible={showUndoToast}
				showUndone={showUndoneFeedback}
				onDismiss={() => {
					setShowUndoToast(false);
					setShowUndoneFeedback(false);
				}}
			/>
		</>
	);
}
