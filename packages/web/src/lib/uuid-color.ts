/**
 * UUID-to-color derivation — RES-11
 * Deterministic HSL color from a reservation UUID.
 * Algorithm: first 6 hex chars → hue (0-359), fixed saturation 65%, lightness 72%.
 * Text color: same hue, 22% lightness — ~5.2:1 contrast ratio (WCAG AA compliant).
 * Never import from @seatkit/types here — pure utility, no deps.
 */

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
 */
export function uuidToColor(uuid: string): ReservationColor {
	// Strip dashes and take first 6 hex chars
	const hex = uuid.replace(/-/g, '').slice(0, 6);
	const hue = parseInt(hex, 16) % 360;
	return {
		bg: `hsl(${hue}, 65%, 72%)`,
		text: `hsl(${hue}, 65%, 22%)`,
	};
}
