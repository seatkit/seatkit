/**
 * Better Auth generated Drizzle schema
 * Tables: user, session, account, verification
 * Generated from: npx @better-auth/cli generate --config ./src/auth.ts
 *
 * The admin plugin adds a `role` column to the `user` table.
 * The invite plugin adds `invite` and `inviteUse` tables.
 */

import { pgTable, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified')
		.$defaultFn(() => false)
		.notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
	// admin plugin: role column
	role: text('role').default('staff'),
	// admin plugin: banned fields
	banned: boolean('banned').default(false),
	banReason: text('ban_reason'),
	banExpires: timestamp('ban_expires'),
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	// admin plugin: impersonated_by
	impersonatedBy: text('impersonated_by'),
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
});

// ── Invite plugin tables ──────────────────────────────────────────────────────

export const invite = pgTable('invite', {
	id: text('id').primaryKey(),
	token: text('token').unique(),
	createdAt: timestamp('created_at').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	maxUses: integer('max_uses').notNull(),
	createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
	redirectToAfterUpgrade: text('redirect_to_after_upgrade'),
	shareInviterName: boolean('share_inviter_name').notNull(),
	email: text('email'),
	role: text('role').notNull(),
	newAccount: boolean('new_account'),
	status: text('status', { enum: ['pending', 'rejected', 'canceled', 'used'] }).notNull(),
});

export const inviteUse = pgTable('invite_use', {
	id: text('id').primaryKey(),
	inviteId: text('invite_id')
		.notNull()
		.references(() => invite.id, { onDelete: 'set null' }),
	usedAt: timestamp('used_at').notNull(),
	usedByUserId: text('used_by_user_id').references(() => user.id, { onDelete: 'set null' }),
});
