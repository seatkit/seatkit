/**
 * Restaurant domain schema
 * Represents restaurant configuration and settings
 * @module schemas/restaurant
 */

import { z } from 'zod';
import {
  BaseEntitySchema,
  NonEmptyStringSchema,
  EmailSchema,
  PhoneSchema,
  TimeSchema,
  PositiveIntSchema,
  CurrencyCodeSchema,
} from './common.js';

/**
 * Day of week
 */
export const DayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

/**
 * Operating hours for a single day
 */
export const OperatingHoursSchema = z.object({
  day: DayOfWeekSchema,
  isOpen: z.boolean(),
  openTime: TimeSchema.optional(),
  closeTime: TimeSchema.optional(),
  breaks: z.array(z.object({
    startTime: TimeSchema,
    endTime: TimeSchema,
  })).optional(), // Lunch breaks, afternoon closures, etc.
});

export type OperatingHours = z.infer<typeof OperatingHoursSchema>;

/**
 * Service period configuration (lunch, dinner, etc.)
 */
export const ServicePeriodSchema = z.object({
  name: NonEmptyStringSchema,              // "Lunch", "Dinner", etc.
  startTime: TimeSchema,
  endTime: TimeSchema,
  defaultDuration: PositiveIntSchema,      // Default reservation duration in minutes
  slotInterval: PositiveIntSchema,         // Time between reservation slots in minutes
  category: z.string(),                    // Maps to ReservationCategory
});

export type ServicePeriod = z.infer<typeof ServicePeriodSchema>;

/**
 * Reservation settings
 */
export const ReservationSettingsSchema = z.object({
  // Booking Window
  advanceBookingDays: PositiveIntSchema,   // How far ahead customers can book
  minAdvanceHours: PositiveIntSchema,      // Minimum hours in advance required

  // Party Size
  minPartySize: PositiveIntSchema,
  maxPartySize: PositiveIntSchema,

  // Timing
  defaultDuration: PositiveIntSchema,      // Default reservation duration in minutes
  slotInterval: PositiveIntSchema,         // Time between slots in minutes
  turnoverBuffer: PositiveIntSchema,       // Buffer time between reservations in minutes

  // Service Periods
  servicePeriods: z.array(ServicePeriodSchema),

  // Automation (v1 - manual confirmation only)
  sendConfirmationEmail: z.boolean(),
  sendConfirmationSms: z.boolean(),
  sendReminderEmail: z.boolean(),
  sendReminderSms: z.boolean(),
  reminderHoursBefore: PositiveIntSchema,
});

export type ReservationSettings = z.infer<typeof ReservationSettingsSchema>;

/**
 * Address
 */
export const AddressSchema = z.object({
  street: NonEmptyStringSchema,
  city: NonEmptyStringSchema,
  state: NonEmptyStringSchema.optional(),
  postalCode: NonEmptyStringSchema,
  country: NonEmptyStringSchema,
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});

export type Address = z.infer<typeof AddressSchema>;

/**
 * Core restaurant schema
 */
export const RestaurantSchema = BaseEntitySchema.extend({
  // Identity
  name: NonEmptyStringSchema,
  slug: NonEmptyStringSchema,              // URL-friendly identifier
  description: z.string().optional(),

  // Contact
  email: EmailSchema,
  phone: PhoneSchema,
  website: z.string().url().optional(),
  address: AddressSchema,

  // Branding
  logo: z.string().url().optional(),
  coverImage: z.string().url().optional(),
  primaryColor: z.string().optional(),     // Hex color code

  // Configuration
  timezone: NonEmptyStringSchema,
  currency: CurrencyCodeSchema,
  locale: NonEmptyStringSchema,            // e.g., "en-US", "it-IT"

  // Operating Schedule
  operatingHours: z.array(OperatingHoursSchema),

  // Reservation Settings
  reservationSettings: ReservationSettingsSchema,

  // Capacity
  totalSeats: PositiveIntSchema,
  diningRoomSeats: PositiveIntSchema.optional(),
  barSeats: PositiveIntSchema.optional(),
  patioSeats: PositiveIntSchema.optional(),

  // Status
  isActive: z.boolean(),
  isAcceptingReservations: z.boolean(),

  // Metadata
  features: z.array(z.string()).optional(), // WiFi, parking, outdoor seating, etc.
  cuisineTypes: z.array(z.string()).optional(),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']).optional(),
  notes: z.string().optional(),
});

export type Restaurant = z.infer<typeof RestaurantSchema>;

/**
 * Input schema for creating a new restaurant
 */
export const CreateRestaurantSchema = RestaurantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  isActive: z.boolean().optional(),                 // Defaults to true
  isAcceptingReservations: z.boolean().optional(),  // Defaults to true
});

export type CreateRestaurant = z.infer<typeof CreateRestaurantSchema>;

/**
 * Input schema for updating restaurant settings
 */
export const UpdateRestaurantSchema = RestaurantSchema.partial().required({
  id: true,
  updatedAt: true,
});

export type UpdateRestaurant = z.infer<typeof UpdateRestaurantSchema>;

/**
 * Public restaurant information (for customer-facing booking)
 */
export const PublicRestaurantSchema = RestaurantSchema.pick({
  id: true,
  name: true,
  slug: true,
  description: true,
  phone: true,
  website: true,
  address: true,
  logo: true,
  coverImage: true,
  operatingHours: true,
  cuisineTypes: true,
  priceRange: true,
  isAcceptingReservations: true,
});

export type PublicRestaurant = z.infer<typeof PublicRestaurantSchema>;
