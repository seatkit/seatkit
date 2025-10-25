/**
 * Profile domain schema
 * Represents a user account with permissions and preferences
 * @module schemas/profile
 */

import { z } from 'zod';

import {
	BaseEntitySchema,
	EmailSchema,
	PhoneSchema,
	NonEmptyStringSchema,
	DateTimeSchema,
} from './common.js';

/**
 * User role with hierarchical permissions (v1 - simplified)
 */
export const UserRoleSchema = z.enum([
	'owner', // Full access, can manage users and settings
	'manager', // Can manage reservations, tables, and view/edit sales
	'staff', // Can view and create reservations, view tables
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Permission flags for fine-grained access control
 */
export const PermissionsSchema = z.object({
	canViewReservations: z.boolean(),
	canCreateReservations: z.boolean(),
	canEditReservations: z.boolean(),
	canDeleteReservations: z.boolean(),

	canViewTables: z.boolean(),
	canEditTables: z.boolean(),

	canViewSales: z.boolean(),
	canEditSales: z.boolean(),

	canManageUsers: z.boolean(),
	canManageSettings: z.boolean(),

	canAccessAnalytics: z.boolean(),
});

export type Permissions = z.infer<typeof PermissionsSchema>;

/**
 * User preferences for UI customization
 */
export const UserPreferencesSchema = z.object({
	// Display
	theme: z.enum(['light', 'dark', 'system']).optional(),
	language: z.string().optional(),
	timezone: z.string().optional(),

	// Notifications
	emailNotifications: z.boolean().optional(),
	pushNotifications: z.boolean().optional(),

	// Defaults
	defaultView: z.enum(['timeline', 'list', 'table_layout']).optional(),

	// Layout
	showTableLayout: z.boolean().optional(),
	compactMode: z.boolean().optional(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/**
 * Core profile schema
 */
export const ProfileSchema = BaseEntitySchema.extend({
	// Identity
	email: EmailSchema,
	username: NonEmptyStringSchema.optional(),

	// Personal Info
	firstName: NonEmptyStringSchema,
	lastName: NonEmptyStringSchema,
	displayName: NonEmptyStringSchema.optional(), // Defaults to "firstName lastName"
	avatar: z.string().url().optional(), // Avatar image URL

	// Contact
	phone: PhoneSchema.optional(),

	// Access Control
	role: UserRoleSchema,
	permissions: PermissionsSchema,
	isActive: z.boolean(), // Account active/suspended

	// Preferences
	preferences: UserPreferencesSchema.optional(),

	// Session
	lastLoginAt: DateTimeSchema.optional(),
	lastActiveAt: DateTimeSchema.optional(),

	// Metadata
	notes: z.string().optional(), // Internal admin notes
});

export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Default permissions by role (v1 - simplified to 3 roles)
 */
export const DEFAULT_PERMISSIONS: Record<UserRole, Permissions> = {
	owner: {
		canViewReservations: true,
		canCreateReservations: true,
		canEditReservations: true,
		canDeleteReservations: true,
		canViewTables: true,
		canEditTables: true,
		canViewSales: true,
		canEditSales: true,
		canManageUsers: true,
		canManageSettings: true,
		canAccessAnalytics: true,
	},
	manager: {
		canViewReservations: true,
		canCreateReservations: true,
		canEditReservations: true,
		canDeleteReservations: true,
		canViewTables: true,
		canEditTables: true,
		canViewSales: true,
		canEditSales: true,
		canManageUsers: false,
		canManageSettings: false,
		canAccessAnalytics: true,
	},
	staff: {
		canViewReservations: true,
		canCreateReservations: true,
		canEditReservations: false,
		canDeleteReservations: false,
		canViewTables: true,
		canEditTables: false,
		canViewSales: false,
		canEditSales: false,
		canManageUsers: false,
		canManageSettings: false,
		canAccessAnalytics: false,
	},
};

/**
 * Input schema for creating a new profile
 */
export const CreateProfileSchema = ProfileSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	permissions: true, // Auto-generated from role
	displayName: true, // Auto-generated from firstName + lastName
	lastLoginAt: true,
	lastActiveAt: true,
}).extend({
	isActive: z.boolean().optional(), // Defaults to true
	permissions: PermissionsSchema.optional(), // Can override default role permissions
});

export type CreateProfile = z.infer<typeof CreateProfileSchema>;

/**
 * Input schema for updating a profile
 */
export const UpdateProfileSchema = ProfileSchema.partial().required({
	id: true,
	updatedAt: true,
});

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;

/**
 * Public profile information (safe to share with other users)
 */
export const PublicProfileSchema = ProfileSchema.pick({
	id: true,
	firstName: true,
	lastName: true,
	displayName: true,
	avatar: true,
	role: true,
});

export type PublicProfile = z.infer<typeof PublicProfileSchema>;

/**
 * Query filters for user management
 */
export const ProfileFiltersSchema = z.object({
	role: z.array(UserRoleSchema).optional(),
	isActive: z.boolean().optional(),
	search: z.string().optional(), // Search by name or email
});

export type ProfileFilters = z.infer<typeof ProfileFiltersSchema>;
