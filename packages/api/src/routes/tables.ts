/**
 * Tables API routes — /api/v1/tables
 * GET: read-only table list.
 * POST, PUT, DELETE: admin-only table management (Phase 2, CONFIG-01).
 */

import { z } from 'zod';

import {
	getTables,
	createTable,
	updateTable,
	deactivateTable,
} from '../services/table-service.js';

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';

// ── Schemas ───────────────────────────────────────────────────────────────────

const TableSchema = z.object({
	id: z.string().uuid(),
	createdAt: z.date(),
	updatedAt: z.date(),
	name: z.string(),
	maxCapacity: z.number().int(),
	minCapacity: z.number().int(),
	positionX: z.number().int().nullable(),
	positionY: z.number().int().nullable(),
	isActive: z.boolean(),
});

const ListTablesResponseSchema = z.object({
	tables: z.array(TableSchema),
	count: z.number().int().nonnegative(),
});

const CreateTableSchema = z.object({
	name: z.string().min(1).max(50).describe('Table name (e.g. "T8")'),
	maxCapacity: z.number().int().min(1).describe('Maximum guest capacity'),
	minCapacity: z.number().int().min(1).optional().describe('Minimum guest capacity'),
	positionX: z.number().int().nullable().optional().describe('Grid column position'),
	positionY: z.number().int().nullable().optional().describe('Grid row position'),
});

const UpdateTableSchema = CreateTableSchema.partial();

const TableIdParamSchema = z.object({
	id: z.string().uuid(),
});

// ── Role guard ────────────────────────────────────────────────────────────────

/**
 * Throws 403 if the authenticated user is not an admin.
 * Relies on the session attached by the onRequest hook in index.ts.
 */
function assertAdmin(request: FastifyRequest, fastify: FastifyInstance): void {
	const role = request.session?.user?.role;
	if (role !== 'admin') {
		throw fastify.httpErrors.forbidden('Admin access required.');
	}
}

// ── Routes ────────────────────────────────────────────────────────────────────

const tablesRoutes: FastifyPluginAsync = async fastify => {
	// GET /api/v1/tables — list all active restaurant tables
	fastify.get(
		'/tables',
		{
			schema: {
				response: { 200: ListTablesResponseSchema },
			},
		},
		async (_request, _reply) => {
			const allTables = await getTables();
			return { tables: allTables, count: allTables.length };
		},
	);

	// POST /api/v1/tables — create table (admin only)
	fastify.post(
		'/tables',
		{
			schema: {
				body: CreateTableSchema.describe('Create a new restaurant table'),
				response: { 201: z.object({ table: TableSchema }) },
			},
		},
		async (request, reply) => {
			assertAdmin(request, fastify);
			const raw = request.body as z.infer<typeof CreateTableSchema>;
			// Build input explicitly to satisfy exactOptionalPropertyTypes
			const input: import('../services/table-service.js').CreateTableInput = {
				name: raw.name,
				maxCapacity: raw.maxCapacity,
				...(raw.minCapacity !== undefined && { minCapacity: raw.minCapacity }),
				...(raw.positionX !== undefined && { positionX: raw.positionX }),
				...(raw.positionY !== undefined && { positionY: raw.positionY }),
			};
			const table = await createTable(input);
			return reply.status(201).send({ table });
		},
	);

	// PUT /api/v1/tables/:id — update table (admin only)
	fastify.put(
		'/tables/:id',
		{
			schema: {
				params: TableIdParamSchema,
				body: UpdateTableSchema.describe('Update table properties'),
				response: {
					200: z.object({ table: TableSchema }),
					404: z.object({ error: z.string() }),
				},
			},
		},
		async (request, _reply) => {
			assertAdmin(request, fastify);
			const { id } = request.params as z.infer<typeof TableIdParamSchema>;
			const raw = request.body as z.infer<typeof UpdateTableSchema>;
			// Strip undefined keys to satisfy exactOptionalPropertyTypes
			const input: import('../services/table-service.js').UpdateTableInput = {};
			if (raw.name !== undefined) input.name = raw.name;
			if (raw.maxCapacity !== undefined) input.maxCapacity = raw.maxCapacity;
			if (raw.minCapacity !== undefined) input.minCapacity = raw.minCapacity;
			if ('positionX' in raw) input.positionX = raw.positionX ?? null;
			if ('positionY' in raw) input.positionY = raw.positionY ?? null;
			const table = await updateTable(id, input);
			if (!table) throw fastify.httpErrors.notFound('Table not found.');
			return { table };
		},
	);

	// DELETE /api/v1/tables/:id — deactivate table (admin only, soft delete)
	fastify.delete(
		'/tables/:id',
		{
			schema: {
				params: TableIdParamSchema,
				response: {
					200: z.object({ message: z.string() }),
					404: z.object({ error: z.string() }),
				},
			},
		},
		async (request, _reply) => {
			assertAdmin(request, fastify);
			const { id } = request.params as z.infer<typeof TableIdParamSchema>;
			const deactivated = await deactivateTable(id);
			if (!deactivated) throw fastify.httpErrors.notFound('Table not found.');
			return { message: `Table ${deactivated.name} deactivated.` };
		},
	);
};

export default tablesRoutes;
