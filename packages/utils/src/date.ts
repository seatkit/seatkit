/**
 * Date and time utilities for restaurant operations
 *
 * IMPORTANT: All dates in SeatKit are stored and compared in UTC to avoid
 * timezone ambiguity. The frontend is responsible for converting dates to/from
 * the restaurant's local timezone for display purposes.
 *
 * @module date
 */

/**
 * Add minutes to a date (immutable)
 *
 * Returns a new Date object without modifying the original.
 * Useful for calculating reservation end times.
 *
 * @param date - The starting date
 * @param minutes - Number of minutes to add (can be negative)
 * @returns A new Date object with minutes added
 *
 * @example
 * const startTime = new Date('2025-01-15T19:00:00Z');
 * const endTime = addMinutes(startTime, 90);
 * // startTime unchanged, endTime is 90 minutes later
 */
export function addMinutes(date: Date, minutes: number): Date {
	const endTime = new Date(date);
	endTime.setMinutes(endTime.getMinutes() + minutes);
	return endTime;
}

/**
 * Check if two dates are on the same calendar day (UTC)
 *
 * Compares only the date portion (year, month, day) in UTC timezone,
 * ignoring the time. Dates must be in UTC for consistent results.
 *
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns true if dates are on the same UTC day
 *
 * @example
 * const morning = new Date('2025-01-15T08:00:00Z');
 * const evening = new Date('2025-01-15T20:00:00Z');
 * isSameDay(morning, evening); // true - same UTC day
 *
 * const lateNight = new Date('2025-01-15T23:00:00Z');
 * const nextDay = new Date('2025-01-16T01:00:00Z');
 * isSameDay(lateNight, nextDay); // false - different UTC days
 */
export function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getUTCFullYear() === date2.getUTCFullYear() &&
		date1.getUTCMonth() === date2.getUTCMonth() &&
		date1.getUTCDate() === date2.getUTCDate()
	);
}

/**
 * Check if a date falls between start and end times (inclusive)
 *
 * Uses timestamp comparison for precise results. Both bounds are inclusive.
 * Useful for checking reservation conflicts and availability.
 *
 * @param date - The date to check
 * @param start - Start of the range (inclusive)
 * @param end - End of the range (inclusive)
 * @returns true if date is within the range
 *
 * @example
 * const reservationTime = new Date('2025-01-15T19:30:00Z');
 * const dinnerStart = new Date('2025-01-15T18:00:00Z');
 * const dinnerEnd = new Date('2025-01-15T22:00:00Z');
 * isBetween(reservationTime, dinnerStart, dinnerEnd); // true
 */
export function isBetween(date: Date, start: Date, end: Date): boolean {
	const time = date.getTime();
	return time >= start.getTime() && time <= end.getTime();
}
