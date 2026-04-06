/**
 * Tables API routes — /api/v1/tables
 * Read-only table data. Write operations (Config) are in Phase 2.
 */

import { getTables } from '../services/table-service.js';
import type { FastifyPluginAsync } from 'fastify';

const tablesRoutes: FastifyPluginAsync = async fastify => {
	// GET /api/v1/tables — list all active restaurant tables
	fastify.get('/tables', async (_request, _reply) => {
		const allTables = await getTables();
		return { tables: allTables, count: allTables.length };
	});
};

export default tablesRoutes;
