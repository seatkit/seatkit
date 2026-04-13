'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import type { Reservation } from '@/lib/api-types';

import { FloorPlanView } from '@/components/reservation/floor-plan-view';
import { ReservationDrawer } from '@/components/reservation/reservation-drawer';
import { ReservationListView } from '@/components/reservation/reservation-list-view';
import { ReservationTimelineView } from '@/components/reservation/reservation-timeline-view';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/lib/auth-client';
import { useReservations } from '@/lib/queries/reservations';


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
	const prefersReduced = useReducedMotion();
	const [activeView, setActiveView] = useState<ViewTab>('timeline');
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('lunch');

	// Drawer state
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
	const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
	const [drawerPrefill, setDrawerPrefill] = useState<
		| { tableId?: string; date?: Date; time?: string; category?: 'lunch' | 'dinner' | 'special' | 'walk_in' }
		| undefined
	>();

	const { data: reservationsData } = useReservations();
	const { data: session } = useSession();

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

	const handleReservationClick = (id: string) => {
		const res = reservationsData?.reservations.find((r) => r.id === id);
		if (res) {
			setActiveReservation(res);
			setDrawerMode('edit');
			setDrawerOpen(true);
		}
	};

	const handleSlotClick = (tableId: string, slotStart: Date) => {
		setActiveReservation(null);
		setDrawerMode('create');
		setDrawerPrefill({
			tableId,
			date: slotStart,
			time: slotStart.toTimeString().slice(0, 5),
			category: selectedCategory === 'no_booking_zone' ? 'special' : selectedCategory,
		});
		setDrawerOpen(true);
	};

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Page header */}
			<div className="h-12 px-6 flex items-center justify-between shrink-0">
				<h1 className="text-3xl font-semibold">Reservations</h1>
				{/* Date picker */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							setSelectedDate((d) => addDays(d, -1));
						}}
						aria-label="Previous day"
						className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<input
						type="date"
						value={formatDate(selectedDate)}
						onChange={(e) => {
							setSelectedDate(new Date(e.target.value + 'T00:00:00'));
						}}
						className="text-sm border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
					/>
					<button
						type="button"
						onClick={() => {
							setSelectedDate((d) => addDays(d, 1));
						}}
						aria-label="Next day"
						className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Tab strip — view tabs left, category tabs right */}
			<div className="h-10 px-6 bg-muted flex items-center justify-between border-b border-border shrink-0">
				{/* View tabs — Radix Tabs provides arrow-key navigation and ARIA roles */}
				<Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewTab)}>
					<TabsList className="bg-transparent h-10 p-0 gap-0 rounded-none">
						{viewTabs.map((tab) => (
							<TabsTrigger
								key={tab.id}
								value={tab.id}
								className="relative px-4 h-10 text-sm font-medium rounded-none bg-transparent shadow-none data-[state=active]:shadow-none data-[state=active]:font-semibold data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors"
							>
								{tab.label}
								{activeView === tab.id && (
									<motion.span
										layoutId="view-tab-indicator"
										className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
										transition={
											prefersReduced
												? { duration: 0.15 }
												: { type: 'spring', stiffness: 400, damping: 30, duration: 0.18 }
										}
									/>
								)}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>

				{/* Service category tabs — only for floor plan (timeline shows all categories) */}
				{activeView === 'floorplan' && (
					<Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ServiceCategory)}>
						<TabsList className="bg-transparent h-10 p-0 gap-0 rounded-none">
							{categoryTabs.map((tab) => (
								<TabsTrigger
									key={tab.id}
									value={tab.id}
									className="relative px-4 h-10 text-sm font-medium rounded-none bg-transparent shadow-none data-[state=active]:shadow-none data-[state=active]:font-semibold data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors"
								>
									{tab.label}
									{selectedCategory === tab.id && (
										<motion.span
											layoutId="category-tab-indicator"
											className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
											transition={
												prefersReduced
													? { duration: 0.15 }
													: { type: 'spring', stiffness: 400, damping: 30, duration: 0.18 }
											}
										/>
									)}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				)}
			</div>

			{/* Tab content */}
			<div className="flex-1 overflow-auto">
				{activeView === 'timeline' && (
					<ReservationTimelineView
						date={selectedDate}
						onReservationClick={handleReservationClick}
						onSlotClick={handleSlotClick}
					/>
				)}
				{activeView === 'list' && (
					<ReservationListView
						onReservationClick={(reservation) => {
							setActiveReservation(reservation);
							setDrawerMode('edit');
							setDrawerOpen(true);
						}}
					/>
				)}
				{activeView === 'floorplan' && (
					<FloorPlanView date={selectedDate} category={selectedCategory} onReservationClick={handleReservationClick} />
				)}
			</div>

			{/* Reservation drawer — slide-over */}
			<ReservationDrawer
				open={drawerOpen}
				mode={drawerMode}
				reservation={activeReservation}
				{...(drawerPrefill === undefined ? {} : { prefill: drawerPrefill })}
				onClose={() => {
					setDrawerOpen(false);
				}}
				currentUserId={session?.user?.id ?? ''}
			/>
		</div>
	);
}

