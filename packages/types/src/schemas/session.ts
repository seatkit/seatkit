/**
 * Session domain schema
 * Represents an active user session for collaborative editing
 * @module schemas/session
 */

import { z } from 'zod';

import {
  BaseEntitySchema,
  DateTimeSchema,
  NonEmptyStringSchema,
} from './common.js';

/**
 * Session status
 */
export const SessionStatusSchema = z.enum([
  'active',     // User is actively connected
  'idle',       // User connected but inactive
  'offline',    // User disconnected
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Device type
 */
export const DeviceTypeSchema = z.enum([
  'desktop',
  'mobile',
  'tablet',
]);

export type DeviceType = z.infer<typeof DeviceTypeSchema>;

/**
 * What the user is currently viewing/editing
 */
export const SessionContextSchema = z.object({
  view: z.enum(['timeline', 'list', 'table_layout', 'sales', 'settings']),
  focusedReservationId: z.string().optional(), // Reservation they're viewing/editing
  focusedTableId: z.string().optional(),       // Table they're viewing/editing
  filters: z.record(z.any()).optional(),        // Active filters in their view
});

export type SessionContext = z.infer<typeof SessionContextSchema>;

/**
 * Device information (simplified)
 */
export const DeviceInfoSchema = z.object({
  type: DeviceTypeSchema,
});

export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

/**
 * Core session schema
 */
export const SessionSchema = BaseEntitySchema.extend({
  // User
  userId: NonEmptyStringSchema,
  userName: NonEmptyStringSchema,

  // Session State
  status: SessionStatusSchema,
  context: SessionContextSchema.optional(),

  // Device
  device: DeviceInfoSchema,

  // Timestamps
  lastActiveAt: DateTimeSchema,
  expiresAt: DateTimeSchema,

  // Connection
  connectionId: NonEmptyStringSchema.optional(), // WebSocket connection ID
  ipAddress: z.string().optional(),

  // Metadata
  userColor: z.string().optional(), // Color assigned to user for collaborative cursors/indicators
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Input schema for creating a new session
 */
export const CreateSessionSchema = SessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  lastActiveAt: true,
});

export type CreateSession = z.infer<typeof CreateSessionSchema>;

/**
 * Input schema for updating session activity
 */
export const UpdateSessionSchema = SessionSchema.partial().required({
  id: true,
  lastActiveAt: true,
});

export type UpdateSession = z.infer<typeof UpdateSessionSchema>;

/**
 * Presence information for collaborative UI
 */
export const PresenceInfoSchema = z.object({
  userId: NonEmptyStringSchema,
  userName: NonEmptyStringSchema,
  userColor: z.string().optional(),
  status: SessionStatusSchema,
  context: SessionContextSchema.optional(),
  device: DeviceTypeSchema,
  lastActiveAt: DateTimeSchema,
});

export type PresenceInfo = z.infer<typeof PresenceInfoSchema>;

