/**
 * Better Auth React client
 * Provides useSession(), signIn(), signOut() hooks and the admin + invite client plugins.
 *
 * D-14: Use Better Auth's React client for session state.
 * Do NOT use TanStack Query for auth session — useSession() uses nanostores internally.
 * TanStack Query is for settings/config data only.
 */

import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { inviteClient } from 'better-invite';

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
	plugins: [
		adminClient(),
		inviteClient(),
	],
});

// Named exports for ergonomic use in components
export const { useSession, signIn, signOut } = authClient;
