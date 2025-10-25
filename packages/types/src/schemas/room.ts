/**
 * Room domain schema
 * Represents a configurable room/area in the restaurant
 * @module schemas/room
 */

import { z } from 'zod';
import {
  BaseEntitySchema,
  NonEmptyStringSchema,
  NonNegativeIntSchema,
} from './common.js';

/**
 * Core room schema
 * Rooms are configurable per restaurant (e.g., "Main Dining", "Bar", "Patio", "Private Room")
 */
export const RoomSchema = BaseEntitySchema.extend({
  // Identity
  name: NonEmptyStringSchema,              // Room name (e.g., "Main Dining Room")
  displayName: NonEmptyStringSchema.optional(), // Optional custom display name

  // Configuration
  isActive: z.boolean(),                   // Can be disabled without deleting
  order: NonNegativeIntSchema.optional(),  // Display order in lists

  // Visual
  color: z.string().optional(),            // Color code for visual distinction

  // Metadata
  description: z.string().optional(),      // Description of the room
  notes: z.string().optional(),            // Internal notes
});

export type Room = z.infer<typeof RoomSchema>;

/**
 * Input schema for creating a new room
 */
export const CreateRoomSchema = RoomSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  isActive: z.boolean().optional(), // Defaults to true
});

export type CreateRoom = z.infer<typeof CreateRoomSchema>;

/**
 * Input schema for updating a room
 */
export const UpdateRoomSchema = RoomSchema.partial().required({
  id: true,
  updatedAt: true,
});

export type UpdateRoom = z.infer<typeof UpdateRoomSchema>;

/**
 * Query filters for rooms
 */
export const RoomFiltersSchema = z.object({
  isActive: z.boolean().optional(),
});

export type RoomFilters = z.infer<typeof RoomFiltersSchema>;
