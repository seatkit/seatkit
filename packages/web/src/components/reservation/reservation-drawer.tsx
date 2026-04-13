'use client';

import { Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import {
	useCreateReservation,
	useUpdateReservation,
	useDeleteReservation,
} from '../../lib/queries/reservations.js';
import { useReservationUndoStore } from '../../stores/reservation-undo-store.js';
import { ConfirmDialog } from '../confirm-dialog.js';
import { ConflictModal } from '../conflict-modal.js';
import { BorderBeam } from '../magicui/border-beam.js';
import { ReservationPresenceBadgeRow } from '../presence-badge.js';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetClose,
} from '../ui/sheet.js';

import { ReservationForm, type FormValues } from './reservation-form.js';

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

	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	const { setSnapshot } = useReservationUndoStore();

	// Ref for the undo callback to read the latest snapshot at invocation time,
	// not at toast creation time (Pitfall 8: Sonner captures closure at creation).
	const undoRef = useRef<{ id: string; snapshot: UpdateReservation & { versionId: number } } | null>(null);

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
			setShowDeleteConfirm(false);
			setValidationError(null);
		}
	}, [open, mode, reservation, prefill]);

	/** Undo handler — reads from undoRef at invocation time, not at toast creation time */
	const handleUndoFromToast = useCallback(async () => {
		const undoData = undoRef.current;
		if (!undoData) return;
		undoRef.current = null;
		try {
			await updateMutation.mutateAsync({
				...undoData.snapshot,
				id: undoData.id,
				versionId: undoData.snapshot.versionId,
			});
			toast('Undone');
		} catch {
			// Undo failed silently — the user can refresh to see current state
		}
	}, [updateMutation]);

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
				toast('Saved', { duration: 10_000 });
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
				const undoSnapshot = {
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
				} as UpdateReservation & { versionId: number };

				setSnapshot(reservation.id, undoSnapshot);
				undoRef.current = { id: reservation.id, snapshot: undoSnapshot };

				savedValues.current = values;
				toast('Saved', {
					action: {
						label: 'Undo',
						onClick: () => {
							void handleUndoFromToast(); // NOSONAR S3735
						},
					},
					duration: 10_000,
				});
				onClose();
			}
		} catch {
			// Errors handled by mutation.onError or ConflictModal via onConflict
		}
	}, [mode, values, reservation, currentUserId, createMutation, updateMutation, setSnapshot, onClose, handleUndoFromToast]);

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
			void handleSave(); // NOSONAR S3735 — void required by no-floating-promises
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
		<Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<SheetContent side="right" className="w-full md:w-[480px] flex flex-col p-0 sm:max-w-none">
				{/* Header */}
				<SheetHeader className="h-14 px-6 flex flex-row items-center justify-between border-b border-border shrink-0 space-y-0">
					<SheetTitle className="text-xl font-semibold">
						{mode === 'create'
							? 'New reservation'
							: (reservation?.customer.name ?? 'Edit reservation')}
					</SheetTitle>
					<SheetDescription className="sr-only">
						{mode === 'create' ? 'Create a new reservation' : 'Edit reservation details'}
					</SheetDescription>
					<span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
						{mode === 'create' ? 'New' : 'Edit'}
					</span>
				</SheetHeader>

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
							<div className="relative overflow-hidden rounded-md">
								<button
									type="button"
									onClick={() => void handleSave()} // NOSONAR S3735
									disabled={isSaving}
									className="inline-flex items-center justify-center px-4 h-10 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
								>
									{saveButtonLabel}
								</button>
								{isSaving && <BorderBeam size={80} duration={8} borderWidth={2} />}
							</div>
						</div>
					</div>
				</div>

				{/* Delete confirmation dialog */}
				<ConfirmDialog
					open={showDeleteConfirm}
					heading="Delete this reservation?"
					body="The reservation will be hidden from all views. You can recover it at any time from the Deleted filter in the list."
					confirmLabel="Delete reservation"
					cancelLabel="Keep reservation"
					onConfirm={() => void handleDelete()}
					onCancel={() => setShowDeleteConfirm(false)}
				/>

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
			</SheetContent>
		</Sheet>
	);
}
