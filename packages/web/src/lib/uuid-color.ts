/**
 * UUID-to-color derivation — RES-11
 * Deterministic HSL color from a reservation UUID.
 *
 * Light mode: hsl(hue, 65%, 72%) bg / hsl(hue, 65%, 22%) text — ~5.2:1 contrast (WCAG AA).
 * Dark mode:  hsl(hue, 55%, 45%) bg / hsl(hue, 55%, 90%) text — readable on dark canvas.
 *
 * Never import from @seatkit/types here — pure utility, no deps.
 */

export type ColorScheme = 'light' | 'dark';

export type ReservationColor = {
	/** Background color for timeline blocks and cluster rings */
	bg: string;
	/** Text color for guest name label inside blocks (WCAG AA contrast) */
	text: string;
};

/**
 * Derives a stable color from a reservation UUID.
 * Uses the first 6 hex characters of the UUID (chars 0-5, skipping dashes).
 * Color is deterministic: same UUID always produces the same color on every device.
 *
 * @param uuid - Reservation UUID
 * @param colorScheme - 'light' (default) or 'dark' — controls HSL lightness band
 */
export function uuidToColor(uuid: string, colorScheme: ColorScheme = 'light'): ReservationColor {
	// Strip dashes and take first 6 hex chars
	const hex = uuid.replaceAll('-', '').slice(0, 6);
	const hue = Number.parseInt(hex, 16) % 360;
	if (colorScheme === 'dark') {
		return {
			bg: `hsl(${hue}, 55%, 45%)`,
			text: `hsl(${hue}, 55%, 90%)`,
		};
	}
	return {
		bg: `hsl(${hue}, 65%, 72%)`,
		text: `hsl(${hue}, 65%, 22%)`,
	};
}
