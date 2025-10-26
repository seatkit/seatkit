/**
 * @seatkit/types
 * Core type definitions and Zod schemas for SeatKit
 *
 * This package provides:
 * - Zod schemas for runtime validation
 * - TypeScript types inferred from schemas
 * - Validation utilities
 * - Result types for error handling
 *
 * @packageDocumentation
 */

// Re-export everything from schemas
export * from './schemas/index.js';

// Re-export utilities
export * from './utils/index.js';

// Version
export const VERSION = '0.1.0';
