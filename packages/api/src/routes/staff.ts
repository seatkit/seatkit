/**
 * Staff management routes — /api/v1/staff
 * Admin-only endpoints for managing staff accounts.
 * Delegates to the Better Auth admin API for user operations.
 */

import { fromNodeHeaders } from 'better-auth/node';
import { z } from 'zod';

import { auth } from '../auth.js';

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';

// ── Role guard ────────────────────────────────────────────────────────────────

/**
 * Throws 403 if the authenticated user is not an admin.
 * Same pattern as tables.ts — role comes from the session attached by the onRequest hook.
 */
function assertAdmin(request: FastifyRequest, fastify: FastifyInstance): void {
	const role = request.session?.user?.role;
	if (role !== 'admin') {
		throw fastify.httpErrors.forbidden('Admin access required.');
	}
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const InviteStaffSchema = z.object({
	email: z.string().email().describe('Email address to invite'),
	role: z.enum(['staff', 'manager']).default('staff').describe('Role to assign'),
});

const SetRoleSchema = z.object({
	role: z.enum(['staff', 'manager']).describe('New role for the staff member'),
});

const StaffIdParamSchema = z.object({
	id: z.string().describe('Better Auth user ID'),
});

const StaffUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	role: z.string().nullable(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

const staffRoutes: FastifyPluginAsync = async fastify => {
	// GET /api/v1/staff — list all staff members (admin only)
	fastify.get(
		'/staff',
		{
			schema: {
				response: {
					200: z.object({
						users: z.array(StaffUserSchema),
						total: z.number().int(),
					}),
				},
			},
		},
		async (request, _reply) => {
			assertAdmin(request, fastify);
			// listUsers uses adminMiddleware which calls getSessionFromCtx — must pass headers
			const result = await auth.api.listUsers({
				query: { limit: 100 },
				headers: fromNodeHeaders(request.headers),
			});
			return {
				users: result.users.map(u => ({
					id: u.id,
					name: u.name,
					email: u.email,
					role: u.role ?? 'staff',
				})),
				total: result.total,
			};
		},
	);

	// POST /api/v1/staff/invite — send invite to new staff member (admin only)
	fastify.post(
		'/staff/invite',
		{
			schema: {
				body: InviteStaffSchema.describe('Invite a new staff member by email'),
				response: {
					200: z.object({ message: z.string() }),
					409: z.object({ error: z.string() }),
				},
			},
		},
		async (request, _reply) => {
			assertAdmin(request, fastify);
			const body = request.body as z.infer<typeof InviteStaffSchema>;

			// Better Auth invite plugin handles token generation + email sending.
			// (sendUserInvitation callback in auth.ts sends the email or logs URL in dev mode)
			// The invite plugin's auth.api method is erased to BetterAuthPlugin in auth.ts
			// (due to the $ERROR_CODES type cast); access via unknown to avoid TS error.
			const inviteApi = auth.api as unknown as {
				createInvite: (ctx: { body: { email?: string; role: string }; headers: HeadersInit }) => Promise<unknown>;
			};
			const result = await inviteApi.createInvite({
				body: { email: body.email, role: body.role },
				headers: fromNodeHeaders(request.headers),
			});

			if (!result) {
				throw fastify.httpErrors.conflict(
					'A staff member with this email already exists.',
				);
			}

			return { message: `Invite sent to ${body.email}.` };
		},
	);

	// DELETE /api/v1/staff/:id — remove a staff member (admin only)
	fastify.delete(
		'/staff/:id',
		{
			schema: {
				params: StaffIdParamSchema,
				response: {
					200: z.object({ message: z.string() }),
					404: z.object({ error: z.string() }),
				},
			},
		},
		async (request, _reply) => {
			assertAdmin(request, fastify);
			const { id } = request.params as z.infer<typeof StaffIdParamSchema>;
			// removeUser is requireHeaders:true — pass Fastify request headers so Better Auth
			// can validate the caller is an admin session
			await auth.api.removeUser({
				body: { userId: id },
				headers: fromNodeHeaders(request.headers),
			});
			return { message: 'Staff member removed.' };
		},
	);

	// PUT /api/v1/staff/:id/role — update a staff member's role (admin only)
	fastify.put(
		'/staff/:id/role',
		{
			schema: {
				params: StaffIdParamSchema,
				body: SetRoleSchema.describe('Update staff member role'),
				response: {
					200: z.object({ message: z.string() }),
					404: z.object({ error: z.string() }),
				},
			},
		},
		async (request, _reply) => {
			assertAdmin(request, fastify);
			const { id } = request.params as z.infer<typeof StaffIdParamSchema>;
			const body = request.body as z.infer<typeof SetRoleSchema>;
			// setRole is requireHeaders:true — pass headers so Better Auth can validate the admin session.
			// Cast role: Better Auth setRole types only accept 'user'|'admin' but the admin
			// plugin stores any string role at runtime. Our custom roles ('staff','manager') are safe.
			await auth.api.setRole({
				body: { userId: id, role: body.role as 'admin' },
				headers: fromNodeHeaders(request.headers),
			});
			return { message: `Role updated to ${body.role}.` };
		},
	);
};

export default staffRoutes;
