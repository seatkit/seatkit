/**
 * Reservation mutation audit log tests — verifies that reservations.ts emits
 * structured warn-level audit events for create, update, delete, and recover.
 *
 * Strategy: structural source verification (read the file, assert log patterns)
 * combined with integration smoke tests that prove the code paths execute via
 * app.inject(). Since audit log calls are inline with the request handler,
 * a successful HTTP response proves the audit log code was reached.
 *
 * PII protection is verified structurally: audit events must NOT include
 * guestName, phone, or notes fields.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

import { setupIntegrationSuite } from '../test-helpers.js';

// Read the reservations.ts source for structural assertions
const reservationsSourcePath = resolve(import.meta.dirname, '..', 'reservations.ts');
const reservationsSource = readFileSync(reservationsSourcePath, 'utf-8');

// Dedicated test admin for audit log tests
const TEST_ADMIN_EMAIL = 'reservation-audit-admin@test.com';
const TEST_ADMIN_PASSWORD = 'audit-test-pass123!';

/** Minimal valid reservation payload for creating test fixtures */
const BASE_RESERVATION = {
	date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
	duration: 90,
	customer: {
		name: 'Audit Test Customer',
		phone: '+1-555-000-0099',
	},
	partySize: 2,
	category: 'lunch',
	createdBy: 'test-user-id',
} as const;

// --------------------------------------------------------------------------
// Structural verification: audit log patterns in source code
// --------------------------------------------------------------------------

describe('Reservation audit log events (structural)', () => {
	describe('event types', () => {
		it('emits reservation.created event at warn level', () => {
			expect(reservationsSource).toContain("event: 'reservation.created'");
			// Verify it uses request.log.warn (not .info or .debug)
			const createdBlock = reservationsSource.slice(
				reservationsSource.indexOf("event: 'reservation.created'") - 100,
				reservationsSource.indexOf("event: 'reservation.created'"),
			);
			expect(createdBlock).toContain('request.log.warn');
		});

		it('emits reservation.updated event at warn level', () => {
			expect(reservationsSource).toContain("event: 'reservation.updated'");
			const updatedBlock = reservationsSource.slice(
				reservationsSource.indexOf("event: 'reservation.updated'") - 100,
				reservationsSource.indexOf("event: 'reservation.updated'"),
			);
			expect(updatedBlock).toContain('request.log.warn');
		});

		it('emits reservation.deleted event at warn level', () => {
			expect(reservationsSource).toContain("event: 'reservation.deleted'");
			const deletedBlock = reservationsSource.slice(
				reservationsSource.indexOf("event: 'reservation.deleted'") - 100,
				reservationsSource.indexOf("event: 'reservation.deleted'"),
			);
			expect(deletedBlock).toContain('request.log.warn');
		});

		it('emits reservation.recovered event at warn level', () => {
			expect(reservationsSource).toContain("event: 'reservation.recovered'");
			const recoveredBlock = reservationsSource.slice(
				reservationsSource.indexOf("event: 'reservation.recovered'") - 100,
				reservationsSource.indexOf("event: 'reservation.recovered'"),
			);
			expect(recoveredBlock).toContain('request.log.warn');
		});
	});

	describe('audit event fields', () => {
		it('includes reservationId in all audit events', () => {
			// Each event block should reference reservationId
			const events = ['reservation.created', 'reservation.updated', 'reservation.deleted', 'reservation.recovered'];
			for (const event of events) {
				const eventIdx = reservationsSource.indexOf(`event: '${event}'`);
				// Look at the surrounding ~300 chars for the reservationId field
				const block = reservationsSource.slice(eventIdx - 50, eventIdx + 250);
				expect(block).toContain('reservationId');
			}
		});

		it('created event includes date, duration, partySize, category fields', () => {
			const createdIdx = reservationsSource.indexOf("event: 'reservation.created'");
			const block = reservationsSource.slice(createdIdx, createdIdx + 300);
			expect(block).toContain('date: reservation.date');
			expect(block).toContain('duration: reservation.duration');
			expect(block).toContain('partySize: reservation.partySize');
			expect(block).toContain('category: reservation.category');
		});

		it('updated event uses spread-conditional to log only changed fields', () => {
			const updatedIdx = reservationsSource.indexOf("event: 'reservation.updated'");
			const block = reservationsSource.slice(updatedIdx, updatedIdx + 500);
			// Spread-conditional pattern: ...(body.field !== undefined && { field: body.field })
			expect(block).toContain('body.date !== undefined');
			expect(block).toContain('body.duration !== undefined');
			expect(block).toContain('body.partySize !== undefined');
			expect(block).toContain('body.status !== undefined');
			expect(block).toContain('body.category !== undefined');
		});
	});

	describe('PII protection', () => {
		it('does NOT include guestName in any audit log event', () => {
			// Extract all request.log.warn blocks
			const warnCalls = reservationsSource.match(/request\.log\.warn\([^;]*?\);/gs) ?? [];
			for (const call of warnCalls) {
				expect(call).not.toContain('guestName');
				expect(call).not.toContain('customer');
			}
		});

		it('does NOT include phone in any audit log event', () => {
			const warnCalls = reservationsSource.match(/request\.log\.warn\([^;]*?\);/gs) ?? [];
			for (const call of warnCalls) {
				expect(call).not.toContain('phone');
			}
		});

		it('does NOT include notes in any audit log event', () => {
			const warnCalls = reservationsSource.match(/request\.log\.warn\([^;]*?\);/gs) ?? [];
			for (const call of warnCalls) {
				expect(call).not.toContain('notes');
			}
		});
	});
});

// --------------------------------------------------------------------------
// Integration tests: prove mutation code paths execute (audit logs fire inline)
// Skip when no DATABASE_URL — pre-existing CI/local constraint.
// --------------------------------------------------------------------------

const hasDb = Boolean(process.env.DATABASE_URL || process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)('Reservation audit log events (integration)', () => {
	const { inject } = setupIntegrationSuite({
		email: TEST_ADMIN_EMAIL,
		password: TEST_ADMIN_PASSWORD,
		displayName: 'Audit Test Admin',
	});

	it('POST /api/v1/reservations returns 201 (create audit log code path executed)', async () => {
		const res = await inject({
			method: 'POST',
			url: '/api/v1/reservations',
			payload: BASE_RESERVATION,
		});
		expect(res.statusCode).toBe(201);
		const body = res.json<{ reservation: { id: string }; message: string }>();
		expect(body.reservation.id).toBeDefined();
		expect(body.message).toBe('Reservation created successfully');
	});

	it('PUT /api/v1/reservations/:id returns 200 (update audit log code path executed)', async () => {
		// Create a reservation first
		const createRes = await inject({
			method: 'POST',
			url: '/api/v1/reservations',
			payload: BASE_RESERVATION,
		});
		const { reservation } = createRes.json<{ reservation: { id: string; version: number } }>();

		const res = await inject({
			method: 'PUT',
			url: `/api/v1/reservations/${reservation.id}`,
			payload: {
				notes: 'Updated by audit test',
				versionId: reservation.version,
			},
		});
		expect(res.statusCode).toBe(200);
		expect(res.json<{ message: string }>().message).toBe('Reservation updated successfully');
	});

	it('DELETE /api/v1/reservations/:id returns 200 (delete audit log code path executed)', async () => {
		const createRes = await inject({
			method: 'POST',
			url: '/api/v1/reservations',
			payload: BASE_RESERVATION,
		});
		const { reservation } = createRes.json<{ reservation: { id: string } }>();

		const res = await inject({
			method: 'DELETE',
			url: `/api/v1/reservations/${reservation.id}`,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json<{ message: string }>().message).toBe('Reservation deleted successfully');
	});

	it('POST /api/v1/reservations/:id/recover returns 200 (recover audit log code path executed)', async () => {
		const createRes = await inject({
			method: 'POST',
			url: '/api/v1/reservations',
			payload: BASE_RESERVATION,
		});
		const { reservation } = createRes.json<{ reservation: { id: string } }>();

		// Soft-delete first
		await inject({
			method: 'DELETE',
			url: `/api/v1/reservations/${reservation.id}`,
		});

		// Recover
		const res = await inject({
			method: 'POST',
			url: `/api/v1/reservations/${reservation.id}/recover`,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json<{ message: string }>().message).toBe('Reservation recovered successfully');
	});
});
