'use client';

import { Search } from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

import { useAllReservations, useRecoverReservation } from '../../lib/queries/reservations.js';

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
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [showDeleted, setShowDeleted] = useState(false);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
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

		// Sort
		list = [...list].sort((a, b) => {
			if (sortField === 'time') return new Date(a.date).getTime() - new Date(b.date).getTime();
			if (sortField === 'name') return a.customer.name.localeCompare(b.customer.name);
			if (sortField === 'partySize') return a.partySize - b.partySize;
			if (sortField === 'createdAt')
				return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			return 0;
		});

		return list;
	}, [data, debouncedQuery, selectedStatuses, sortField, showDeleted]);

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
			<div className="px-6 py-2 border-b border-border overflow-x-auto">
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
					<div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
				)}

				{!isLoading && isEmpty && (
					<div className="py-16 text-center text-muted-foreground text-sm">
						{debouncedQuery || selectedStatuses.length > 0
							? 'No reservations match your filters. Try adjusting the date range or status.'
							: showDeleted
								? 'No deleted reservations.'
								: 'No reservations yet. Create one from the Timeline view.'}
					</div>
				)}

				{!isLoading && !isEmpty && (
					<div>
						{grouped.map(({ key, items }) => (
							<div key={key || '__all__'}>
								{/* Group header */}
								{key && (
									<div className="sticky top-0 bg-muted text-muted-foreground text-xs font-semibold uppercase tracking-wide px-4 py-2 z-10 border-b border-border">
										{key}
									</div>
								)}

								{/* Rows */}
								{items.map((reservation) => (
									<div
										key={reservation.id}
										className={[
											'flex items-center gap-4 px-6 border-b border-border/50 min-h-[56px] cursor-pointer hover:bg-muted/50 transition-colors',
											reservation.isDeleted ? 'opacity-60' : '',
										].join(' ')}
										onClick={() => onReservationClick?.(reservation)}
										role="row"
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ')
												onReservationClick?.(reservation);
										}}
									>
										{/* Time */}
										<div className="w-16 shrink-0 text-sm text-muted-foreground">
											{new Date(reservation.date).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit',
											})}
										</div>

										{/* Guest info */}
										<div className="flex-1 min-w-0">
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
										</div>

										{/* Status badge */}
										<div className="shrink-0">
											<span
												className={[
													'text-xs font-medium px-2 py-0.5 rounded-full',
													reservation.status === 'confirmed'
														? 'bg-green-100 text-green-700'
														: reservation.status === 'seated'
															? 'bg-blue-100 text-blue-700'
															: reservation.status === 'completed'
																? 'bg-slate-100 text-slate-600'
																: reservation.status === 'cancelled'
																	? 'bg-red-100 text-red-600'
																	: 'bg-amber-100 text-amber-800',
												].join(' ')}
											>
												{reservation.status}
											</span>
										</div>

										{/* Last edited */}
										<div className="hidden md:block w-32 shrink-0 text-xs text-muted-foreground text-right">
											{new Date(reservation.updatedAt).toLocaleDateString('en-GB', {
												day: 'numeric',
												month: 'short',
											})}
										</div>

										{/* Recover action (deleted filter state) — D-12 */}
										{reservation.isDeleted && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													recoverMutation.mutate(reservation.id);
												}}
												className="shrink-0 px-3 py-1 text-xs font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
											>
												Recover reservation
											</button>
										)}
									</div>
								))}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
