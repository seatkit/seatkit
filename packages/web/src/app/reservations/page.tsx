'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { ReservationTimelineView } from '@/components/reservation/reservation-timeline-view';

type ViewTab = 'timeline' | 'list' | 'floorplan';
type ServiceCategory = 'lunch' | 'dinner' | 'no_booking_zone';

function formatDate(date: Date): string {
	return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

export default function ReservationsPage() {
	const [activeView, setActiveView] = useState<ViewTab>('timeline');
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('lunch');

	const viewTabs: { id: ViewTab; label: string }[] = [
		{ id: 'timeline', label: 'Timeline' },
		{ id: 'list', label: 'List' },
		{ id: 'floorplan', label: 'Floor plan' },
	];

	const categoryTabs: { id: ServiceCategory; label: string }[] = [
		{ id: 'lunch', label: 'Lunch' },
		{ id: 'dinner', label: 'Dinner' },
		{ id: 'no_booking_zone', label: 'No booking zone' },
	];

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Page header */}
			<div className="h-12 px-6 flex items-center justify-between border-b border-border shrink-0">
				<h1 className="text-3xl font-semibold">Reservations</h1>
				{/* Date picker */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => { setSelectedDate(d => addDays(d, -1)); }}
						aria-label="Previous day"
						className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<input
						type="date"
						value={formatDate(selectedDate)}
						onChange={(e) => { setSelectedDate(new Date(e.target.value + 'T00:00:00')); }}
						className="text-sm border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
					/>
					<button
						type="button"
						onClick={() => { setSelectedDate(d => addDays(d, 1)); }}
						aria-label="Next day"
						className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Tab strip — view tabs left, category tabs right */}
			<div className="h-10 px-6 bg-muted flex items-center justify-between border-b border-border shrink-0">
				{/* View tabs */}
				<div className="flex items-center gap-0" role="tablist" aria-label="View">
					{viewTabs.map(tab => (
						<button
							key={tab.id}
							role="tab"
							aria-selected={activeView === tab.id}
							type="button"
							onClick={() => { setActiveView(tab.id); }}
							className={[
								'px-4 h-10 text-sm font-medium transition-colors',
								activeView === tab.id
									? 'border-b-2 border-foreground font-semibold text-foreground'
									: 'text-muted-foreground hover:text-foreground',
							].join(' ')}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Service category tabs (not shown in list view — context is date-level) */}
				{activeView !== 'list' && (
					<div className="flex items-center gap-0" role="tablist" aria-label="Service category">
						{categoryTabs.map(tab => (
							<button
								key={tab.id}
								role="tab"
								aria-selected={selectedCategory === tab.id}
								type="button"
								onClick={() => { setSelectedCategory(tab.id); }}
								className={[
									'px-4 h-10 text-sm font-medium transition-colors',
									selectedCategory === tab.id
										? 'border-b-2 border-foreground font-semibold text-foreground'
										: 'text-muted-foreground hover:text-foreground',
								].join(' ')}
							>
								{tab.label}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Tab content */}
			<div className="flex-1 overflow-auto" role="tabpanel">
				{/* onReservationClick and onSlotClick wired in Plan 05 (drawer) */}
				{activeView === 'timeline' && (
					<ReservationTimelineView
						date={selectedDate}
						category={selectedCategory}
					/>
				)}
				{activeView === 'list' && (
					<ReservationListViewStub
						date={selectedDate}
					/>
				)}
				{activeView === 'floorplan' && (
					<FloorPlanViewStub
						date={selectedDate}
						category={selectedCategory}
					/>
				)}
			</div>
		</div>
	);
}

// Temporary stubs — replaced in Plans 05 (list) and 06 (floor plan)
function ReservationListViewStub({ date }: { date: Date }) {
	return (
		<div className="p-6 text-muted-foreground text-sm">
			List: {date.toDateString()}
		</div>
	);
}

function FloorPlanViewStub({ date, category }: { date: Date; category: ServiceCategory }) {
	return (
		<div className="p-6 text-muted-foreground text-sm">
			Floor plan: {date.toDateString()} — {category}
		</div>
	);
}
