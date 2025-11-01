import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type * as react from 'react';

/**
 * Combines class names with clsx and merges Tailwind classes with tailwind-merge.
 * This utility ensures proper Tailwind class precedence and removes duplicates.
 *
 * @example
 * ```ts
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 * cn('text-red-500', condition && 'text-blue-500') // => 'text-blue-500' if condition is true
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Type utility for extracting component props with polymorphic 'as' prop support
 */
export type PolymorphicComponentProps<
	C extends react.ElementType,
	Props = object,
> = Props &
	Omit<react.ComponentPropsWithoutRef<C>, keyof Props> & {
		as?: C;
	};

/**
 * Format a status value to human-readable text
 */
export function formatStatus(
	status:
		| 'confirmed'
		| 'pending'
		| 'seated'
		| 'completed'
		| 'cancelled'
		| 'no-show',
): string {
	const statusMap = {
		confirmed: 'Confirmed',
		pending: 'Pending',
		seated: 'Seated',
		completed: 'Completed',
		cancelled: 'Cancelled',
		'no-show': 'No Show',
	};
	return statusMap[status];
}

/**
 * Get the appropriate color class for a reservation status
 */
export function getStatusColor(
	status:
		| 'confirmed'
		| 'pending'
		| 'seated'
		| 'completed'
		| 'cancelled'
		| 'no-show',
): string {
	const colorMap = {
		confirmed: 'bg-status-confirmed text-white',
		pending: 'bg-status-pending text-white',
		seated: 'bg-status-seated text-white',
		completed: 'bg-status-completed text-white',
		cancelled: 'bg-status-cancelled text-white',
		'no-show': 'bg-status-no-show text-white',
	};
	return colorMap[status];
}
