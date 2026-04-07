/**
 * Tables API routes — /api/v1/tables
 * Read-only table data. Write operations (Config) are in Phase 2.
 */

import { z } from 'zod';

import { getTables } from '../services/table-service.js';

import type { FastifyPluginAsync } from 'fastify';

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
};

export default tablesRoutes;
