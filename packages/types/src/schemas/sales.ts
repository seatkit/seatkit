/**
 * Sales domain schema
 * Represents daily sales data with category breakdowns
 * @module schemas/sales
 */

import { z } from 'zod';

import {
	BaseEntitySchema,
	DateSchema,
	MoneySchema,
	CurrencyCodeSchema,
	NonNegativeIntSchema,
} from './common.js';

/**
 * Sales category breakdown
 * Matches the reservation categories for detailed tracking
 */
export const SalesCategorySchema = z.object({
	lunch: MoneySchema,
	dinner: MoneySchema,
	special: MoneySchema,
	walkIn: MoneySchema,
	other: MoneySchema,
});

export type SalesCategory = z.infer<typeof SalesCategorySchema>;

/**
 * Cover (customer) count breakdown by category
 */
export const CoverCountSchema = z.object({
	lunch: NonNegativeIntSchema,
	dinner: NonNegativeIntSchema,
	special: NonNegativeIntSchema,
	walkIn: NonNegativeIntSchema,
	other: NonNegativeIntSchema,
});

export type CoverCount = z.infer<typeof CoverCountSchema>;

/**
 * Daily sales record
 */
export const DailySalesSchema = BaseEntitySchema.extend({
	// Date
	date: DateSchema,
	restaurantId: z.string(),

	// Total Sales
	totalSales: MoneySchema,
	currency: CurrencyCodeSchema,

	// Sales Breakdown
	salesByCategory: SalesCategorySchema,

	// Customer Counts
	totalCovers: NonNegativeIntSchema, // Total customers served
	coversByCategory: CoverCountSchema,

	// Calculated Metrics
	averageCheckSize: MoneySchema.optional(), // Total sales / total covers

	// Metadata
	notes: z.string().optional(),
	isEditable: z.boolean(), // Manager-only editing flag
	createdBy: z.string(), // User ID who created the sales record
});

export type DailySales = z.infer<typeof DailySalesSchema>;

/**
 * Validation: total sales should equal sum of category sales
 */
export const ValidatedDailySalesSchema = DailySalesSchema.refine(
	data => {
		const categorySum =
			data.salesByCategory.lunch +
			data.salesByCategory.dinner +
			data.salesByCategory.special +
			data.salesByCategory.walkIn +
			data.salesByCategory.other;
		return data.totalSales === categorySum;
	},
	{
		message: 'Total sales must equal sum of category sales',
		path: ['totalSales'],
	},
).refine(
	data => {
		const coverSum =
			data.coversByCategory.lunch +
			data.coversByCategory.dinner +
			data.coversByCategory.special +
			data.coversByCategory.walkIn +
			data.coversByCategory.other;
		return data.totalCovers === coverSum;
	},
	{
		message: 'Total covers must equal sum of category covers',
		path: ['totalCovers'],
	},
);

/**
 * Input schema for creating daily sales
 */
export const CreateDailySalesSchema = DailySalesSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	averageCheckSize: true, // Calculated automatically
}).extend({
	isEditable: z.boolean().optional(), // Defaults to true
});

export type CreateDailySales = z.infer<typeof CreateDailySalesSchema>;

/**
 * Input schema for updating daily sales (manager only)
 */
export const UpdateDailySalesSchema = DailySalesSchema.partial().required({
	id: true,
	updatedAt: true,
});

export type UpdateDailySales = z.infer<typeof UpdateDailySalesSchema>;

/**
 * Monthly sales aggregation
 */
export const MonthlySalesSchema = z.object({
	year: z.number().int().min(2000).max(2100),
	month: z.number().int().min(1).max(12),
	restaurantId: z.string(),

	totalSales: MoneySchema,
	currency: CurrencyCodeSchema,
	salesByCategory: SalesCategorySchema,

	totalCovers: NonNegativeIntSchema,
	coversByCategory: CoverCountSchema,

	averageCheckSize: MoneySchema,
	averageDailySales: MoneySchema,

	daysOpen: NonNegativeIntSchema, // Number of days restaurant was open
});

export type MonthlySales = z.infer<typeof MonthlySalesSchema>;

/**
 * Yearly sales aggregation
 */
export const YearlySalesSchema = z.object({
	year: z.number().int().min(2000).max(2100),
	restaurantId: z.string(),

	totalSales: MoneySchema,
	currency: CurrencyCodeSchema,
	salesByCategory: SalesCategorySchema,

	totalCovers: NonNegativeIntSchema,
	coversByCategory: CoverCountSchema,

	averageCheckSize: MoneySchema,
	averageMonthlySales: MoneySchema,

	monthsData: z.array(MonthlySalesSchema), // Monthly breakdown
});

export type YearlySales = z.infer<typeof YearlySalesSchema>;

/**
 * Query filters for sales reports
 */
export const SalesFiltersSchema = z.object({
	restaurantId: z.string(),
	dateFrom: DateSchema.optional(),
	dateTo: DateSchema.optional(),
	minSales: MoneySchema.optional(),
	maxSales: MoneySchema.optional(),
	minCovers: NonNegativeIntSchema.optional(),
	maxCovers: NonNegativeIntSchema.optional(),
});

export type SalesFilters = z.infer<typeof SalesFiltersSchema>;
