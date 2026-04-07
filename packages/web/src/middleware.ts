/**
 * Next.js edge middleware — route protection
 * D-15: Checks for session cookie on every request.
 * Redirects to /login if no session; redirects to / if already authenticated and on /login.
 *
 * CRITICAL: Uses getSessionCookie() (cookie-existence check, Edge-safe).
 * Do NOT call auth.api.getSession() here — it uses Node.js APIs unavailable in Edge Runtime.
 */

import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
	const sessionCookie = getSessionCookie(request);

	const isLoginPage = request.nextUrl.pathname === '/login';

	// No session → redirect to /login (except if already going to /login)
	if (!sessionCookie && !isLoginPage) {
		return NextResponse.redirect(new URL('/login', request.url));
	}

	// Already authenticated → redirect away from /login to /
	if (sessionCookie && isLoginPage) {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return NextResponse.next();
}

// Apply to all routes except Next.js internals and API routes
// (API routes are protected server-side by the Fastify onRequest hook, not this middleware)
export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
