/**
 * Formatting utilities for display and data normalization
 * @module format
 */

/**
 * Currency symbols for common currencies
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: '¥',
};

/**
 * Currencies that don't use decimal places
 */
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW']);

/**
 * Format money amount (in cents) to display string
 * @param cents - Amount in smallest currency unit (e.g., cents for USD)
 * @param currency - ISO 4217 currency code
 * @returns Formatted money string
 */
export function formatMoney(cents: number, currency: string): string {
	const symbol = CURRENCY_SYMBOLS[currency] || currency;
	const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);

	if (isZeroDecimal) {
		// For zero-decimal currencies, round cents to whole units
		const amount = Math.round(cents / 100);
		return `${symbol}${amount.toLocaleString('en-US')}`;
	}

	// Standard decimal currencies
	const dollars = cents / 100;
	const formatted = dollars.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	return `${symbol}${formatted}`;
}

/**
 * Parse formatted money string to cents
 * @param formatted - Formatted money string (e.g., "$10.50", "10.50", "10")
 * @returns Amount in cents
 */
export function parseMoney(formatted: string): number {
	// Remove currency symbols, spaces, and commas
	const cleaned = formatted.replace(/[$€£¥,\s]/g, '');

	// Parse as float
	const amount = Number.parseFloat(cleaned);

	if (Number.isNaN(amount)) {
		throw new Error(`Invalid money format: ${formatted}`);
	}

	// Convert to cents
	return Math.round(amount * 100);
}

/**
 * Format a phone number for display
 * @param phone - Phone number string
 * @returns Formatted phone number
 */
export function formatPhone(phone: string): string {
	// Remove all non-digit characters except +
	const cleaned = phone.replace(/[^\d+]/g, '');

	// US/Canada format: (555) 123-4567
	if (cleaned.length === 10) {
		return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
	}

	// US/Canada with country code: +1 (555) 123-4567
	if (cleaned.startsWith('+1') && cleaned.length === 12) {
		return `+1 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
	}

	// International: +44 1234 567890
	if (cleaned.startsWith('+')) {
		const countryCode = cleaned.slice(0, 3);
		const rest = cleaned.slice(3);
		// Split at position 4 for typical international format
		const splitAt = rest.length >= 8 ? 4 : Math.floor(rest.length / 2);
		return `${countryCode} ${rest.slice(0, splitAt)} ${rest.slice(splitAt)}`;
	}

	// If already formatted or unknown format, return as-is
	return phone;
}

/**
 * Normalize phone number to storage format (digits only, preserving +)
 * @param phone - Phone number string
 * @returns Normalized phone number
 */
export function normalizePhone(phone: string): string {
	// Keep only digits and leading +
	return phone.replace(/[^\d+]/g, '');
}
