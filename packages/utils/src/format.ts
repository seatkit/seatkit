/**
 * Formatting utilities for display
 *
 * IMPORTANT: For phone number formatting and parsing, use the `libphonenumber-js`
 * library directly in your application code. It provides comprehensive international
 * phone number support that would be redundant to wrap here.
 *
 * @see https://www.npmjs.com/package/libphonenumber-js
 *
 * @module format
 */

/**
 * Format money amount (in cents) to display string
 *
 * Uses the Intl.NumberFormat API for proper internationalization.
 * Automatically handles currency symbols, decimal places, and thousands separators
 * based on the locale and currency.
 *
 * @param cents - Amount in smallest currency unit (e.g., cents for USD)
 * @param currency - ISO 4217 currency code (e.g., 'USD', 'EUR', 'JPY')
 * @param locale - BCP 47 language tag (defaults to 'en-US')
 * @returns Formatted money string
 *
 * @example
 * formatMoney(1050, 'USD', 'en-US')  // "$10.50"
 * formatMoney(1050, 'EUR', 'de-DE')  // "10,50 €"
 * formatMoney(1050, 'JPY', 'ja-JP')  // "¥11" (zero-decimal currency)
 *
 * @example
 * // Use restaurant settings for currency and locale
 * const { currency, locale } = restaurantSettings;
 * formatMoney(salesAmount, currency, locale);
 */
export function formatMoney(
	cents: number,
	currency: string,
	locale = 'en-US',
): string {
	const amount = cents / 100;
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: currency,
	}).format(amount);
}

/**
 * NOTE: Money parsing removed
 *
 * Instead of parsing formatted strings like "$10.50", applications should:
 * 1. Use number inputs in forms that work directly with numeric values
 * 2. Send structured data in API requests: { amount: 1050, currency: 'USD' }
 * 3. Store amounts as integers (cents) in the database
 *
 * This avoids parsing ambiguity and ensures data integrity.
 */

/**
 * NOTE: Phone formatting removed
 *
 * For phone number formatting, validation, and parsing, use the `libphonenumber-js`
 * library directly in your application code:
 *
 * @example
 * import { parsePhoneNumber, formatNumber } from 'libphonenumber-js';
 *
 * // Format phone numbers
 * formatNumber('+15551234567', 'NATIONAL')      // "(555) 123-4567"
 * formatNumber('+441234567890', 'INTERNATIONAL') // "+44 1234 567890"
 *
 * // Parse and validate
 * const phoneNumber = parsePhoneNumber('+15551234567', 'US');
 * phoneNumber.isValid()  // true
 * phoneNumber.number     // "+15551234567"
 *
 * @see https://www.npmjs.com/package/libphonenumber-js
 */
