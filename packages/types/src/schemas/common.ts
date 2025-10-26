/**
 * Common schema utilities and shared types for SeatKit
 * @module schemas/common
 */

import { z } from 'zod';

/**
 * Date-time field
 * Input: Accepts ISO strings and converts to Date objects
 * Internal: Works with Date objects throughout the application
 * Output: Custom serializer converts to ISO strings in JSON responses
 */
export const DateTimeSchema = z.coerce.date();

/**
 * ISO 8601 date string (date only, no time)
 * Example: "2025-01-15"
 */
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * ISO 8601 time string (time only, no date)
 * Example: "14:30" or "14:30:00"
 */
export const TimeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

/**
 * UUID v4 string
 */
export const UUIDSchema = z.string().uuid();

/**
 * Email address
 */
export const EmailSchema = z.string().email();

/**
 * Phone number (international format recommended)
 * Accepts various formats: +1-555-123-4567, (555) 123-4567, 555.123.4567, +15551234567
 * Must contain only digits, spaces, parentheses, hyphens, dots, and plus sign
 */
export const PhoneSchema = z.string()
	.min(10, "Phone number too short")
	.max(20, "Phone number too long")
	.regex(
		/^[\d\s\-()+.]+$/,
		"Phone number can only contain digits, spaces, hyphens, parentheses, dots, and plus sign"
	)
	.refine((val) => {
		// Count only digits
		const digits = val.replace(/\D/g, '');
		return digits.length >= 10 && digits.length <= 15;
	}, "Phone number must contain between 10 and 15 digits");

/**
 * Positive integer (1, 2, 3, ...)
 */
export const PositiveIntSchema = z.number().int().positive();

/**
 * Non-negative integer (0, 1, 2, 3, ...)
 */
export const NonNegativeIntSchema = z.number().int().nonnegative();

/**
 * Non-empty string
 */
export const NonEmptyStringSchema = z.string().min(1);

/**
 * Monetary amount (in cents/smallest currency unit)
 * Always stored as integer to avoid floating point issues
 */
export const MoneySchema = z.number().int().nonnegative();

/**
 * Currency code (ISO 4217)
 * Example: "USD", "EUR", "JPY"
 */
export const CurrencyCodeSchema = z.string().length(3).toUpperCase();

/**
 * Base entity fields that all domain entities share
 */
export const BaseEntitySchema = z.object({
	id: UUIDSchema,
	createdAt: DateTimeSchema,
	updatedAt: DateTimeSchema,
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
export type DateTime = z.infer<typeof DateTimeSchema>;
export type DateString = z.infer<typeof DateSchema>;
export type TimeString = z.infer<typeof TimeSchema>;
export type UUID = z.infer<typeof UUIDSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type Phone = z.infer<typeof PhoneSchema>;
export type Money = z.infer<typeof MoneySchema>;
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;
