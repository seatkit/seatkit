'use client';

import { Search } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import React, { Fragment, useState, useMemo, useCallback, useEffect, useRef } from 'react';

import { useAllReservations, useRecoverReservation } from '../../lib/queries/reservations.js';
import { Skeleton } from '../ui/skeleton.js';

import { FilterChip } from './filter-chip.js';

import type { Reservation } from '../../lib/api-types.js';

type SortField = 'time' | 'name' | 'partySize' | 'createdAt';
type GroupBy = 'none' | 'day' | 'week' | 'month' | 'table';

type ReservationListViewProps = Readonly<{
	onReservationClick?: (reservation: Reservation) => void;
}>;

const STATUS_OPTIONS: { value: string; label: string }[] = [
	{ value: 'pending', label: 'Pending' },
	{ value: 'confirmed', label: 'Confirmed' },
	{ value: 'seated', label: 'Seated' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'cancelled', label: 'Cancelled' },
];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
	{ value: 'lunch', label: 'Lunch' },
	{ value: 'dinner', label: 'Dinner' },
	{ value: 'special', label: 'Special' },
	{ value: 'walk_in', label: 'Walk-in' },
];

const PARTY_SIZE_RANGES: { value: string; label: string; min: number; max: number }[] = [
	{ value: '1-2', label: '1–2', min: 1, max: 2 },
	{ value: '3-4', label: '3–4', min: 3, max: 4 },
	{ value: '5+', label: '5+', min: 5, max: Infinity },
];

function formatGroupDay(date: Date): string {
	return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isoWeek(date: Date): string {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const day = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - day);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return `W${week} ${d.getUTCFullYear()}`;
}

function statusBadgeClass(status: string): string {
	if (status === 'confirmed') return 'bg-status-confirmed text-white';
	if (status === 'seated') return 'bg-status-seated text-white';
	if (status === 'completed') return 'bg-status-completed text-white';
	if (status === 'cancelled') return 'bg-status-cancelled text-white';
	if (status === 'no_show') return 'bg-status-no-show text-white';
	return 'bg-status-pending text-amber-900';
}

function compareReservations(a: Reservation, b: Reservation, field: SortField): number {
	if (field === 'time') return new Date(a.date).getTime() - new Date(b.date).getTime();
	if (field === 'name') return a.customer.name.localeCompare(b.customer.name);
	if (field === 'partySize') return a.partySize - b.partySize;
	if (field === 'createdAt') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	return 0;
}

function groupKey(res: Reservation, groupBy: GroupBy): string {
	const d = new Date(res.date);
	if (groupBy === 'day') return formatGroupDay(d);
	if (groupBy === 'week') return isoWeek(d);
	if (groupBy === 'month')
		return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
	if (groupBy === 'table') return (res.tableIds?.[0] ?? 'Unassigned');
	return '';
}

export function ReservationListView({ onReservationClick }: ReservationListViewProps) {
	const prefersReduced = useReducedMotion();
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [showDeleted, setShowDeleted] = useState(false);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [selectedPartySizeRange, setSelectedPartySizeRange] = useState<string | null>(null);
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [sortField, setSortField] = useState<SortField>('time');
	const [groupBy, setGroupBy] = useState<GroupBy>('none');

	const { data, isLoading } = useAllReservations(showDeleted);
	const recoverMutation = useRecoverReservation();

	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Debounce search — 300ms
	useEffect(() => {
		if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		searchTimerRef.current = setTimeout(() => {
			setDebouncedQuery(searchQuery);
		}, 300);
		return () => {
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		};
	}, [searchQuery]);

	const toggleStatus = useCallback((status: string) => {
		setSelectedStatuses((prev) =>
			prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
		);
	}, []);

	const toggleCategory = useCallback((category: string) => {
		setSelectedCategories((prev) =>
			prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
		);
	}, []);

	// Filter → Sort → Group
	const filteredAndSorted = useMemo(() => {
		let list = data?.reservations ?? [];

		// Deleted filter: when showDeleted=true, only show deleted; otherwise only non-deleted
		list = list.filter((r) => (showDeleted ? r.isDeleted : !r.isDeleted));

		// Search by guest name
		if (debouncedQuery.trim()) {
			const q = debouncedQuery.toLowerCase();
			list = list.filter((r) => r.customer.name.toLowerCase().includes(q));
		}

		// Status filter
		if (selectedStatuses.length > 0) {
			list = list.filter((r) => selectedStatuses.includes(r.status));
		}

		// Category filter
		if (selectedCategories.length > 0) {
			list = list.filter((r) => selectedCategories.includes(r.category));
		}

		// Date range filter
		if (dateFrom) {
			const from = new Date(dateFrom + 'T00:00:00');
			list = list.filter((r) => new Date(r.date) >= from);
		}
		if (dateTo) {
			const to = new Date(dateTo + 'T23:59:59');
			list = list.filter((r) => new Date(r.date) <= to);
		}

		// Party size range filter
		if (selectedPartySizeRange) {
			const range = PARTY_SIZE_RANGES.find((r) => r.value === selectedPartySizeRange);
			if (range) {
				list = list.filter((r) => r.partySize >= range.min && r.partySize <= range.max);
			}
		}

		// Sort
		list = [...list].sort((a, b) => compareReservations(a, b, sortField));

		return list;
	}, [data, debouncedQuery, selectedStatuses, selectedCategories, dateFrom, dateTo, selectedPartySizeRange, sortField, showDeleted]);

	// Group
	const grouped = useMemo(() => {
		if (groupBy === 'none') return [{ key: '', items: filteredAndSorted }];
		const groups = new Map<string, Reservation[]>();
		for (const res of filteredAndSorted) {
			const key = groupKey(res, groupBy);
			const g = groups.get(key);
			if (g) g.push(res);
			else groups.set(key, [res]);
		}
		return Array.from(groups.entries()).map(([key, items]) => ({ key, items }));
	}, [filteredAndSorted, groupBy]);

	const isEmpty = filteredAndSorted.length === 0;

	let emptyMessage: string;
	if (debouncedQuery || selectedStatuses.length > 0) {
		emptyMessage = 'No reservations match your filters. Try adjusting the date range or status.';
	} else if (showDeleted) {
		emptyMessage = 'No deleted reservations.';
	} else {
		emptyMessage = 'No reservations yet. Create one from the Timeline view.';
	}

	const SORT_LABELS: Record<SortField, string> = {
		time: 'Time',
		name: 'Guest',
		partySize: 'Party',
		createdAt: 'Created',
	};

	const GROUP_LABELS: Record<GroupBy, string> = {
		none: 'None',
		day: 'Day',
		week: 'Week',
		month: 'Month',
		table: 'Table',
	};

	return (
		<div className="flex flex-col flex-1 gap-0" data-testid="reservation-list-view">
			{/* Search bar */}
			<div className="px-6 py-3 border-b border-border bg-background sticky top-0 z-10">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<input
						type="search"
						role="searchbox"
						placeholder="Search by guest name..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full h-10 pl-9 pr-4 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
			</div>

			{/* Filter bar */}
			<div className="px-6 py-2 border-b border-border overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
				<div className="flex items-center gap-2 min-w-max">
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
						Filter:
					</span>
					<FilterChip
						label="Deleted"
						active={showDeleted}
						onToggle={() => setShowDeleted((v) => !v)}
					/>
					{STATUS_OPTIONS.map((opt) => (
						<FilterChip
							key={opt.value}
							label={opt.label}
							active={selectedStatuses.includes(opt.value)}
							onToggle={() => toggleStatus(opt.value)}
						/>
					))}

					<span className="mx-2 text-border">|</span>
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
						Type:
					</span>
					{CATEGORY_OPTIONS.map((opt) => (
						<FilterChip
							key={opt.value}
							label={opt.label}
							active={selectedCategories.includes(opt.value)}
							onToggle={() => toggleCategory(opt.value)}
						/>
					))}

					<span className="mx-2 text-border">|</span>
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
						Guests:
					</span>
					{PARTY_SIZE_RANGES.map((range) => (
						<FilterChip
							key={range.value}
							label={range.label}
							active={selectedPartySizeRange === range.value}
							onToggle={() =>
								setSelectedPartySizeRange((prev) =>
									prev === range.value ? null : range.value,
								)
							}
						/>
					))}

					<span className="mx-2 text-border">|</span>
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
						Date:
					</span>
					<input
						type="date"
						aria-label="From date"
						value={dateFrom}
						onChange={(e) => setDateFrom(e.target.value)}
						className="h-7 px-2 text-xs rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
					/>
					<span className="text-xs text-muted-foreground">–</span>
					<input
						type="date"
						aria-label="To date"
						value={dateTo}
						onChange={(e) => setDateTo(e.target.value)}
						className="h-7 px-2 text-xs rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
					/>

					<span className="mx-2 text-border">|</span>
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
						Sort:
					</span>
					{(['time', 'name', 'partySize', 'createdAt'] as SortField[]).map((field) => (
						<FilterChip
							key={field}
							label={SORT_LABELS[field]}
							active={sortField === field}
							onToggle={() => setSortField(field)}
						/>
					))}

					<span className="mx-2 text-border">|</span>
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
						Group:
					</span>
					{(['none', 'day', 'week', 'month', 'table'] as GroupBy[]).map((g) => (
						<FilterChip
							key={g}
							label={GROUP_LABELS[g]}
							active={groupBy === g}
							onToggle={() => setGroupBy(g)}
						/>
					))}
				</div>
			</div>

			{/* List content */}
			<div className="flex-1 overflow-auto">
				{isLoading && (
					<div className="flex flex-col gap-2 p-6">
						{Array.from({ length: 5 }, (_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				)}

				{!isLoading && isEmpty && (
					<div className="py-16 text-center text-muted-foreground text-sm">
						{emptyMessage}
					</div>
				)}

				{!isLoading && !isEmpty && (
					<table className="w-full">
						<thead className="sr-only">
							<tr>
								<th scope="col">Time</th>
								<th scope="col">Guest</th>
								<th scope="col">Status</th>
								<th scope="col">Last edited</th>
								<th scope="col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{grouped.map(({ key, items }) => (
								<Fragment key={key || '__all__'}>
									{/* Group header */}
									{key && (
										<tr>
											<th colSpan={5} scope="colgroup" className="sticky top-0 bg-muted text-muted-foreground text-xs font-semibold uppercase tracking-wide px-4 py-2 z-10 border-b border-border text-left">
												{key}
											</th>
										</tr>
									)}

									{/* Rows */}
									<AnimatePresence mode="popLayout">
									{items.map((reservation, index) => (
										<motion.tr
											key={reservation.id}
											initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0 }}
											transition={
												prefersReduced
													? { duration: 0.15 }
													: { duration: 0.15, delay: index < 8 ? index * 0.03 : 0 }
											}
											className={[
												'border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors',
												reservation.isDeleted ? 'opacity-60' : '',
											].join(' ')}
											onClick={() => onReservationClick?.(reservation)}
											tabIndex={0}
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ' ')
													onReservationClick?.(reservation);
											}}
										>
											{/* Time */}
											<td className="w-16 px-6 py-3 text-sm text-muted-foreground whitespace-nowrap">
												{new Date(reservation.date).toLocaleTimeString([], {
													hour: '2-digit',
													minute: '2-digit',
												})}
											</td>

											{/* Guest info */}
											<td className="py-3 pr-4 min-w-0">
												<div className="font-medium text-sm truncate">
													{reservation.emoji && (
														<span className="mr-1">{reservation.emoji}</span>
													)}
													{reservation.customer.name}
													{reservation.isLargeGroup && (
														<span className="ml-1 text-xs bg-muted rounded px-1">
															Large
														</span>
													)}
												</div>
												<div className="text-xs text-muted-foreground">
													{reservation.partySize} guests · {reservation.category}
												</div>
											</td>

											{/* Status badge */}
											<td className="py-3 pr-4 whitespace-nowrap">
												<span className={['text-xs font-medium px-2 py-0.5 rounded-full', statusBadgeClass(reservation.status)].join(' ')}>
													{reservation.status}
												</span>
											</td>

											{/* Last edited */}
											<td className="hidden md:table-cell w-32 py-3 pr-4 text-xs text-muted-foreground text-right whitespace-nowrap">
												{new Date(reservation.updatedAt).toLocaleDateString('en-GB', {
													day: 'numeric',
													month: 'short',
												})}
											</td>

											{/* Recover action (deleted filter state) — D-12 */}
											<td className="py-3 px-6">
												{reservation.isDeleted && (
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															recoverMutation.mutate(reservation.id);
														}}
														className="px-3 py-1 text-xs font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
													>
														Recover reservation
													</button>
												)}
											</td>
										</motion.tr>
									))}
									</AnimatePresence>
								</Fragment>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
