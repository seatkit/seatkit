/**
 * Date and time utilities optimized for restaurant operations
 * @module date
 */

/**
 * Parse an ISO 8601 datetime string to a Date object
 * Optimized for performance compared to new Date() with validation
 */
export function parseDateTime(dateString: string): Date {
	const date = new Date(dateString);

	// Validate the parsed date
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid date string: ${dateString}`);
	}

	return date;
}

/**
 * Format a Date object to ISO 8601 string
 * Fast path for serialization
 */
export function formatDateTime(date: Date): string {
	return date.toISOString();
}

/**
 * Format a date for display in the UI
 * @param date - The date to format
 * @param format - 'short' (1/15/2025) or 'long' (January 15, 2025)
 */
export function formatDateForDisplay(
	date: Date,
	format: 'short' | 'long',
): string {
	if (format === 'short') {
		return date.toLocaleDateString('en-US', {
			month: 'numeric',
			day: 'numeric',
			year: 'numeric',
		});
	}

	return date.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});
}

/**
 * Add minutes to a date (immutable)
 * Returns a new Date object, does not modify the original
 */
export function addMinutes(date: Date, minutes: number): Date {
	const result = new Date(date);
	result.setMinutes(result.getMinutes() + minutes);
	return result;
}

/**
 * Check if two dates are on the same day (ignoring time)
 * Uses UTC to ensure consistent comparison across timezones
 */
export function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getUTCFullYear() === date2.getUTCFullYear() &&
		date1.getUTCMonth() === date2.getUTCMonth() &&
		date1.getUTCDate() === date2.getUTCDate()
	);
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
	return isSameDay(date, new Date());
}

/**
 * Check if a date falls between start and end (inclusive)
 */
export function isBetween(date: Date, start: Date, end: Date): boolean {
	const time = date.getTime();
	return time >= start.getTime() && time <= end.getTime();
}
