/**
 * Better Auth instance
 * Central authentication configuration.
 * Used by the Fastify plugin (index.ts) and programmatic API (auth-service.ts).
 */

import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { invite } from 'better-auth-invite-plugin';

import { db } from './db/index.js';
import * as authSchema from './db/schema/auth.js';
import { sendInviteEmail } from './lib/mailer.js';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: authSchema.user,
			session: authSchema.session,
			account: authSchema.account,
			verification: authSchema.verification,
			// invite plugin tables
			invite: authSchema.invite,
			inviteUse: authSchema.inviteUse,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,   // 30 days
		updateAge: 60 * 60 * 24,          // refresh if older than 24h
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,               // 5-min client-side cache
		},
	},
	plugins: [
		admin({
			defaultRole: 'staff',
			adminRoles: ['admin'],
		}),
		// Type cast: better-auth-invite-plugin 0.4.1 was built against better-auth ^1.4.13;
		// the $ERROR_CODES type narrowed in 1.6.0 causing a TS structural mismatch.
		// Runtime behavior is unaffected — the cast is safe.
		invite({
			async sendUserInvitation({ email, role, url }: { email: string; role: string; url: string }): Promise<void> {
				// NOTE: void, not await — avoid timing attacks and request delays per research anti-pattern
				void sendInviteEmail({ to: email, role, inviteUrl: url });
			},
		}) as unknown as BetterAuthPlugin,
	],
	trustedOrigins: [
		process.env.CORS_ORIGIN ?? 'http://localhost:3000',
	],
});

export type Auth = typeof auth;
