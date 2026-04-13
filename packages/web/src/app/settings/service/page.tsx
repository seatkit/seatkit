'use client';

import { SettingsPage, ForbiddenBanner } from '@seatkit/ui';
import { useState, useEffect } from 'react';

import { Skeleton } from '../../../components/ui/skeleton.js';

import { useSession } from '../../../lib/auth-client.js';
import { useRestaurantSettings, useUpdateRestaurantSettings } from '../../../lib/queries/settings.js';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ServiceSettingsPage() {
	const { data: session } = useSession();
	const isAdmin = session?.user?.role === 'admin';

	const { data, isLoading } = useRestaurantSettings();
	const updateSettings = useUpdateRestaurantSettings();

	const [openDays, setOpenDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
	const [defaultDuration, setDefaultDuration] = useState('90');
	const [categories, setCategories] = useState<
		{ id: string; name: string; startTime: string; endTime: string; isActive: boolean }[]
	>([]);
	const [saveError, setSaveError] = useState('');
	const [saveSuccess, setSaveSuccess] = useState(false);

	useEffect(() => {
		if (data?.settings) {
			if (data.settings.serviceHours) {
				setOpenDays(data.settings.serviceHours.openDays);
				setDefaultDuration(String(data.settings.serviceHours.defaultDuration));
			}
			if (data.settings.serviceCategories) {
				setCategories(data.settings.serviceCategories);
			}
		}
	}, [data]);

	if (!isAdmin) {
		return (
			<SettingsPage heading="Service">
				<ForbiddenBanner />
			</SettingsPage>
		);
	}

	function toggleDay(day: number) {
		setOpenDays(prev =>
			prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b),
		);
	}

	function updateCategory(
		id: string,
		field: 'name' | 'startTime' | 'endTime' | 'isActive',
		value: string | boolean,
	) {
		setCategories(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));
	}

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSaveError('');
		setSaveSuccess(false);
		try {
			await updateSettings.mutateAsync({
				serviceCategories: categories,
				serviceHours: {
					openDays,
					defaultDuration: parseInt(defaultDuration, 10),
				},
			});
			setSaveSuccess(true);
		} catch {
			setSaveError('Failed to save. Please try again.');
		}
	}

	return (
		<SettingsPage heading="Service">
			{isLoading && (
				<div className="space-y-3">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			)}

			<form onSubmit={e => void handleSave(e)} className="space-y-8">
				{/* Service categories */}
				{categories.length > 0 && (
					<section>
						<h2 className="text-sm font-semibold text-foreground mb-4">Service categories</h2>
						<div className="space-y-4">
							{categories.map(cat => (
								<div
									key={cat.id}
									className="rounded-md border border-border bg-background p-4 space-y-3"
								>
									<div className="flex items-center gap-3">
										<input
											type="checkbox"
											id={`cat-active-${cat.id}`}
											checked={cat.isActive}
											onChange={e => updateCategory(cat.id, 'isActive', e.target.checked)}
											className="h-4 w-4"
										/>
										<label
											htmlFor={`cat-active-${cat.id}`}
											className="text-sm font-semibold"
										>
											{cat.name}
										</label>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label
												htmlFor={`cat-start-${cat.id}`}
												className="text-sm font-semibold block mb-1.5"
											>
												Start time
											</label>
											<input
												id={`cat-start-${cat.id}`}
												type="time"
												value={cat.startTime}
												onChange={e => updateCategory(cat.id, 'startTime', e.target.value)}
												className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
											/>
										</div>
										<div>
											<label
												htmlFor={`cat-end-${cat.id}`}
												className="text-sm font-semibold block mb-1.5"
											>
												End time
											</label>
											<input
												id={`cat-end-${cat.id}`}
												type="time"
												value={cat.endTime}
												onChange={e => updateCategory(cat.id, 'endTime', e.target.value)}
												className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
											/>
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
				)}

				{/* Open days */}
				<section>
					<h2 className="text-sm font-semibold text-foreground mb-4">Open days</h2>
					<div className="flex flex-wrap gap-2">
						{DAY_LABELS.map((label, idx) => {
							const dayNum = idx + 1;
							const checked = openDays.includes(dayNum);
							return (
								<label
									key={dayNum}
									className={[
										'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold cursor-pointer min-h-[44px]',
										'border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
										checked
											? 'bg-primary text-primary-foreground border-primary'
											: 'bg-background text-foreground border-border hover:bg-muted',
									].join(' ')}
								>
									<input
										type="checkbox"
										className="sr-only"
										checked={checked}
										onChange={() => toggleDay(dayNum)}
									/>
									{label}
								</label>
							);
						})}
					</div>
				</section>

				{/* Default duration */}
				<section>
					<label
						htmlFor="default-duration"
						className="text-sm font-semibold block mb-1.5"
					>
						Default reservation duration (minutes)
					</label>
					<input
						id="default-duration"
						type="number"
						min="15"
						step="15"
						value={defaultDuration}
						onChange={e => setDefaultDuration(e.target.value)}
						className="w-32 rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					/>
				</section>

				{saveSuccess && (
					<p className="text-sm text-green-600">Service saved.</p>
				)}
				{saveError && <p className="text-sm text-destructive">{saveError}</p>}

				<button
					type="submit"
					disabled={updateSettings.isPending}
					className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold min-h-[44px] disabled:opacity-50 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					{updateSettings.isPending ? 'Saving...' : 'Save changes'}
				</button>
			</form>
		</SettingsPage>
	);
}
