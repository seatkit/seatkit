'use client';

import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SettingsPage, ForbiddenBanner } from '@seatkit/ui';
import { GripVertical } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useSession } from '../../../lib/auth-client.js';
import {
	useRestaurantSettings,
	useUpdateRestaurantSettings,
} from '../../../lib/queries/settings.js';

function SortableItem({ id }: { id: string }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id,
	});
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};
	return (
		<div
			ref={setNodeRef}
			style={style}
			className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3 cursor-grab active:cursor-grabbing"
		>
			<GripVertical
				className="h-4 w-4 text-muted-foreground"
				{...attributes}
				{...listeners}
				aria-label={`Drag ${id} to reorder`}
			/>
			<span className="text-sm font-semibold">{id}</span>
		</div>
	);
}

export default function PrioritySettingsPage() {
	const { data: session } = useSession();
	const isAdmin = session?.user?.role === 'admin';
	const { data } = useRestaurantSettings();
	const updateSettings = useUpdateRestaurantSettings();
	const [order, setOrder] = useState<string[]>([]);
	const [saveError, setSaveError] = useState('');

	useEffect(() => {
		if (data?.settings.priorityOrder) {
			setOrder(data.settings.priorityOrder);
		}
	}, [data]);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	async function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = order.indexOf(String(active.id));
		const newIndex = order.indexOf(String(over.id));
		const newOrder = arrayMove(order, oldIndex, newIndex);
		const prevOrder = order;
		setOrder(newOrder); // optimistic update

		try {
			await updateSettings.mutateAsync({ priorityOrder: newOrder });
			setSaveError('');
		} catch {
			setOrder(prevOrder); // revert on failure
			setSaveError('Failed to save order. Please try again.');
		}
	}

	if (!isAdmin) {
		return (
			<SettingsPage heading="Table priority">
				<ForbiddenBanner />
			</SettingsPage>
		);
	}

	return (
		<SettingsPage heading="Table priority">
			<p className="text-sm text-muted-foreground mb-4">
				Drag to reorder. Tables at the top of the list are assigned first.
			</p>
			{saveError && <p className="text-sm text-destructive mb-4">{saveError}</p>}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={event => void handleDragEnd(event)}
			>
				<SortableContext items={order} strategy={verticalListSortingStrategy}>
					<div className="space-y-2">
						{order.map(tableId => (
							<SortableItem key={tableId} id={tableId} />
						))}
					</div>
				</SortableContext>
			</DndContext>
		</SettingsPage>
	);
}
