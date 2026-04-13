'use client';

import React from 'react';

import { PhotoUpload } from './photo-upload.js';

type FormValues = {
	// Core Info
	guestName: string;
	phone: string;
	partySize: number;
	date: string; // YYYY-MM-DD
	startTime: string; // HH:MM
	category: 'lunch' | 'dinner' | 'special' | 'walk_in';
	// Options
	notes: string;
	preferredLanguage: string;
	emoji: string;
	isLargeGroup: boolean;
	// Table Assignment
	tableIds: string[];
	acceptanceState: 'toConfirm' | 'confirmed';
	// Photo
	photoUrl: string | null;
};

type ReservationFormProps = Readonly<{
	mode: 'create' | 'edit';
	values: FormValues;
	reservationId: string | null; // null in create mode until saved
	onChange: (values: FormValues) => void;
	onResetToSaved: () => void;
	lastEditedAt?: string | null; // RES-13
}>;

const LANGUAGE_OPTIONS = [
	{ value: '', label: 'Not specified' },
	{ value: 'en', label: 'English' },
	{ value: 'ja', label: 'Japanese' },
	{ value: 'it', label: 'Italian' },
	{ value: 'fr', label: 'French' },
	{ value: 'de', label: 'German' },
	{ value: 'zh', label: 'Chinese' },
];

const CATEGORY_OPTIONS = [
	{ value: 'lunch', label: 'Lunch' },
	{ value: 'dinner', label: 'Dinner' },
	{ value: 'special', label: 'Special' },
	{ value: 'walk_in', label: 'Walk-in' },
];

const COMMON_EMOJIS = ['⭐', '🌟', '🎂', '🎉', '💎', '🌸', '🍣', '🍷', '🌙', '❤️', '👑', '🎵'];

function fieldClass() {
	return 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1';
}

function labelClass() {
	return 'text-sm font-semibold text-foreground mb-1 block';
}

function sectionClass() {
	return 'flex flex-col gap-4';
}

function sectionHeadingClass() {
	return 'text-xl font-semibold text-foreground';
}

export function ReservationForm({
	mode,
	values,
	reservationId,
	onChange,
	onResetToSaved,
	lastEditedAt,
}: ReservationFormProps) {
	function update(patch: Partial<FormValues>) {
		onChange({ ...values, ...patch });
	}

	return (
		<form className="flex flex-col gap-6 py-4" onSubmit={(e) => e.preventDefault()}>
			{/* Reset to saved button + last-edited timestamp — RES-13 */}
			{mode === 'edit' && (
				<div className="flex items-center justify-between">
					<button
						type="button"
						onClick={onResetToSaved}
						className="text-sm text-muted-foreground underline cursor-pointer hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						Reset to saved
					</button>
					{lastEditedAt && (
						<span
							className="text-sm text-muted-foreground"
							data-testid="last-edited-timestamp"
						>
							Last edited: {new Date(lastEditedAt).toLocaleString()}
						</span>
					)}
				</div>
			)}

			{/* Section 1: Core Info */}
			<fieldset className={sectionClass()}>
				<legend className={sectionHeadingClass()}>Core Info</legend>

				<div>
					<label htmlFor="guestName" className={labelClass()}>
						Guest name *
					</label>
					<input
						id="guestName"
						type="text"
						required
						value={values.guestName}
						onChange={(e) => update({ guestName: e.target.value })}
						className={fieldClass()}
						placeholder="e.g. Tanaka Kenji"
					/>
				</div>

				<div>
					<label htmlFor="phone" className={labelClass()}>
						Phone *
					</label>
					<input
						id="phone"
						type="tel"
						required
						value={values.phone}
						onChange={(e) => update({ phone: e.target.value })}
						className={fieldClass()}
						placeholder="+39 02 1234567"
					/>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label htmlFor="partySize" className={labelClass()}>
							Party size *
						</label>
						<input
							id="partySize"
							type="number"
							min={1}
							max={100}
							required
							value={values.partySize}
							onChange={(e) => update({ partySize: Number.parseInt(e.target.value, 10) || 1 })}
							className={fieldClass()}
						/>
					</div>
					<div>
						<label htmlFor="category" className={labelClass()}>
							Category *
						</label>
						<select
							id="category"
							value={values.category}
							onChange={(e) => update({ category: e.target.value as FormValues['category'] })}
							className={fieldClass()}
						>
							{CATEGORY_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label htmlFor="date" className={labelClass()}>
							Date *
						</label>
						<input
							id="date"
							type="date"
							required
							value={values.date}
							onChange={(e) => update({ date: e.target.value })}
							className={fieldClass()}
						/>
					</div>
					<div>
						<label htmlFor="startTime" className={labelClass()}>
							Start time *
						</label>
						<input
							id="startTime"
							type="time"
							required
							value={values.startTime}
							onChange={(e) => update({ startTime: e.target.value })}
							className={fieldClass()}
						/>
					</div>
				</div>
			</fieldset>

			{/* Section 2: Options */}
			<fieldset className={sectionClass()}>
				<legend className={sectionHeadingClass()}>Options</legend>

				<div>
					<label htmlFor="notes" className={labelClass()}>
						Notes
					</label>
					<textarea
						id="notes"
						value={values.notes}
						onChange={(e) => update({ notes: e.target.value })}
						className={fieldClass() + ' min-h-[80px] resize-y'}
						placeholder="Dietary restrictions, special requests..."
					/>
				</div>

				<div>
					<label htmlFor="preferredLanguage" className={labelClass()}>
						Preferred language
					</label>
					<select
						id="preferredLanguage"
						value={values.preferredLanguage}
						onChange={(e) => update({ preferredLanguage: e.target.value })}
						className={fieldClass()}
					>
						{LANGUAGE_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</div>

				<div>
					<p className={labelClass()}>Emoji tag</p>
					<div className="flex flex-wrap gap-2">
						{COMMON_EMOJIS.map((e) => (
							<button
								key={e}
								type="button"
								onClick={() => update({ emoji: values.emoji === e ? '' : e })}
								aria-label={`Emoji ${e}${values.emoji === e ? ' (selected)' : ''}`}
								aria-pressed={values.emoji === e}
								className={[
									'w-9 h-9 text-lg rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
									values.emoji === e
										? 'border-foreground bg-foreground/10'
										: 'border-border hover:border-foreground/50',
								].join(' ')}
							>
								{e}
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						role="switch"
						aria-checked={values.isLargeGroup}
						onClick={() => update({ isLargeGroup: !values.isLargeGroup })}
						className={[
							'w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring shrink-0',
							values.isLargeGroup ? 'bg-foreground' : 'bg-muted border border-border',
						].join(' ')}
					>
						<span
							className={[
								'block w-4 h-4 rounded-full bg-background shadow-sm transition-transform mx-1',
								values.isLargeGroup ? 'translate-x-5' : 'translate-x-0',
							].join(' ')}
						/>
					</button>
					<span className="text-sm font-medium select-none">
						Large group
					</span>
				</div>
			</fieldset>

			{/* Section 3: Table Assignment */}
			<fieldset className={sectionClass()}>
				<legend className={sectionHeadingClass()}>Table Assignment</legend>

				<div>
					<p className={labelClass()}>Assigned tables</p>
					<p className="text-sm text-muted-foreground">
						{values.tableIds.length > 0
							? `Tables: ${values.tableIds.join(', ')}`
							: 'Auto-assigned on save'}
					</p>
				</div>

				<div>
					<label htmlFor="acceptanceState" className={labelClass()}>
						Acceptance state
					</label>
					<select
						id="acceptanceState"
						value={values.acceptanceState}
						onChange={(e) =>
							update({ acceptanceState: e.target.value as FormValues['acceptanceState'] })
						}
						className={fieldClass()}
					>
						<option value="toConfirm">To confirm</option>
						<option value="confirmed">Confirmed</option>
					</select>
				</div>
			</fieldset>

			{/* Section 4: Photo */}
			<fieldset className={sectionClass()}>
				<legend className={sectionHeadingClass()}>Photo</legend>
				<PhotoUpload
					reservationId={reservationId}
					currentPhotoUrl={values.photoUrl}
					onPhotoUrlChange={(url) => update({ photoUrl: url })}
				/>
				{!reservationId && (
					<p className="text-xs text-muted-foreground">
						Save the reservation first to attach a photo.
					</p>
				)}
			</fieldset>
		</form>
	);
}

// Export FormValues type for use in drawer
export type { FormValues };
