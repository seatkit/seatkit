/**
 * Better Auth React client
 * Provides useSession(), signIn(), signOut() hooks and the admin + invite client plugins.
 *
 * D-14: Use Better Auth's React client for session state.
 * Do NOT use TanStack Query for auth session — useSession() uses nanostores internally.
 * TanStack Query is for settings/config data only.
 */

import { type BetterAuthClientPlugin } from 'better-auth/client';
import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { inviteClient } from 'better-auth-invite-plugin';

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
	plugins: [
		adminClient(),
		// Cast required: better-auth-invite-plugin@0.4.1 was built against better-auth ^1.4.13;
		// $ERROR_CODES narrowed to Record<string, RawError> in 1.6.0, causing type conflict.
		// Same fix applied on the server side in packages/api/src/auth.ts (02-02 deviation #2).
		inviteClient() as unknown as BetterAuthClientPlugin,
	],
});

// Named exports for ergonomic use in components
export const { useSession, signIn, signOut } = authClient;
