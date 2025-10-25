/**
 * Table domain schema
 * Represents a physical table in the restaurant
 * @module schemas/table
 */

import { z } from 'zod';

import {
  BaseEntitySchema,
  NonEmptyStringSchema,
  PositiveIntSchema,
  NonNegativeIntSchema,
} from './common.js';

/**
 * Table status
 */
export const TableStatusSchema = z.enum([
  'available',   // Ready for seating
  'occupied',    // Currently seated with guests
  'reserved',    // Reserved for upcoming reservation
  'unavailable', // Temporarily unavailable (cleaning, maintenance, etc.)
]);

export type TableStatus = z.infer<typeof TableStatusSchema>;

/**
 * Table shape for layout visualization
 */
export const TableShapeSchema = z.enum([
  'circle',
  'square',
  'rectangle',
]);

export type TableShape = z.infer<typeof TableShapeSchema>;

/**
 * Position coordinates for table layout
 * Coordinates are in arbitrary units (e.g., grid cells, pixels)
 * Origin (0,0) is top-left corner
 */
export const TablePositionSchema = z.object({
  x: NonNegativeIntSchema,
  y: NonNegativeIntSchema,
  rotation: z.number().min(0).max(360).optional(), // Degrees, 0 = no rotation
});

export type TablePosition = z.infer<typeof TablePositionSchema>;

/**
 * Table dimensions for layout visualization
 */
export const TableDimensionsSchema = z.object({
  width: PositiveIntSchema,
  height: PositiveIntSchema,
});

export type TableDimensions = z.infer<typeof TableDimensionsSchema>;

/**
 * Core table schema
 */
export const TableSchema = BaseEntitySchema.extend({
  // Identity
  name: NonEmptyStringSchema,              // Table name/number (e.g., "Table 1", "Bar 3")
  displayName: NonEmptyStringSchema.optional(), // Optional custom display name

  // Capacity
  minCapacity: PositiveIntSchema,          // Minimum party size
  maxCapacity: PositiveIntSchema,          // Maximum party size
  optimalCapacity: PositiveIntSchema,      // Ideal party size for this table

  // Layout
  position: TablePositionSchema.optional(), // Position in restaurant layout
  dimensions: TableDimensionsSchema.optional(), // Visual dimensions
  shape: TableShapeSchema.optional(),

  // Status & Availability
  status: TableStatusSchema,
  isActive: z.boolean(),                   // Can be permanently disabled

  // Current Reservation
  currentReservationId: z.string().optional(), // ID of current/upcoming reservation
  currentPartySize: PositiveIntSchema.optional(), // Current party size (if occupied)

  // Attributes
  roomId: z.string().optional(),           // Room ID (configurable per restaurant)
  features: z.array(z.string()).optional(), // Window, corner, booth, high-top, etc.
  tags: z.array(z.string()).optional(),    // Flexible tagging

  // Metadata
  notes: z.string().optional(),            // Internal notes about this table
  order: NonNegativeIntSchema.optional(),  // Display order in lists
});

export type Table = z.infer<typeof TableSchema>;

/**
 * Validation: minCapacity <= optimalCapacity <= maxCapacity
 */
export const ValidatedTableSchema = TableSchema.refine(
  (data) => data.minCapacity <= data.optimalCapacity && data.optimalCapacity <= data.maxCapacity,
  {
    message: 'Capacity constraints: minCapacity <= optimalCapacity <= maxCapacity',
    path: ['capacity'],
  }
);

/**
 * Input schema for creating a new table
 */
export const CreateTableSchema = TableSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true, // Defaults to 'available'
}).extend({
  status: TableStatusSchema.optional(),
  isActive: z.boolean().optional(), // Defaults to true
});

export type CreateTable = z.infer<typeof CreateTableSchema>;

/**
 * Input schema for updating an existing table
 */
export const UpdateTableSchema = TableSchema.partial().required({
  id: true,
  updatedAt: true,
});

export type UpdateTable = z.infer<typeof UpdateTableSchema>;

/**
 * Query filters for searching tables
 */
export const TableFiltersSchema = z.object({
  status: z.array(TableStatusSchema).optional(),
  isActive: z.boolean().optional(),
  roomId: z.string().optional(),
  minCapacity: PositiveIntSchema.optional(),
  maxCapacity: PositiveIntSchema.optional(),
  features: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type TableFilters = z.infer<typeof TableFiltersSchema>;

/**
 * Table availability for a specific time slot
 */
export const TableAvailabilitySchema = z.object({
  tableId: z.string(),
  isAvailable: z.boolean(),
  reason: z.string().optional(), // Why it's unavailable
  nextAvailableAt: z.string().datetime().optional(),
});

export type TableAvailability = z.infer<typeof TableAvailabilitySchema>;
