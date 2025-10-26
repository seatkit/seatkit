/**
 * Tests for session schema
 * @module schemas/session.test
 */

import { describe, it, expect } from 'vitest';

import {
	SessionStatusSchema,
	DeviceTypeSchema,
	SessionContextSchema,
	SessionSchema,
	PresenceInfoSchema,
} from './session.js';

describe('SessionStatusSchema', () => {
	it('should validate session status values', () => {
		expect(SessionStatusSchema.parse('active')).toBe('active');
		expect(() => SessionStatusSchema.parse('invalid')).toThrow();
	});
});

describe('DeviceTypeSchema', () => {
	it('should validate device types', () => {
		expect(DeviceTypeSchema.parse('desktop')).toBe('desktop');
		expect(() => DeviceTypeSchema.parse('smartwatch')).toThrow();
	});
});

describe('SessionContextSchema', () => {
	it('should validate session context', () => {
		const context = {
			view: 'timeline' as const,
			focusedReservationId: 'res-123',
		};
		expect(SessionContextSchema.parse(context)).toEqual(context);
	});
});

describe('SessionSchema', () => {
	const validSession = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		createdAt: '2025-01-15T14:30:00Z',
		updatedAt: '2025-01-15T14:30:00Z',
		userId: 'user-123',
		userName: 'John Doe',
		status: 'active' as const,
		device: { type: 'desktop' as const },
		lastActiveAt: '2025-01-15T14:30:00Z',
		expiresAt: '2025-01-15T16:30:00Z',
	};

	it('should validate complete session', () => {
		const result = SessionSchema.parse(validSession);
		expect(result.id).toBe(validSession.id);
		expect(result.createdAt).toBeInstanceOf(Date);
		expect(result.updatedAt).toBeInstanceOf(Date);
		expect(result.lastActiveAt).toBeInstanceOf(Date);
		expect(result.expiresAt).toBeInstanceOf(Date);
		expect(result.userId).toBe(validSession.userId);
		expect(result.userName).toBe(validSession.userName);
		expect(result.status).toBe(validSession.status);
	});

	it('should allow optional context', () => {
		const withContext = {
			...validSession,
			context: {
				view: 'timeline' as const,
				focusedReservationId: 'res-123',
			},
		};
		const result = SessionSchema.parse(withContext);
		expect(result.createdAt).toBeInstanceOf(Date);
		expect(result.updatedAt).toBeInstanceOf(Date);
		expect(result.lastActiveAt).toBeInstanceOf(Date);
		expect(result.expiresAt).toBeInstanceOf(Date);
		expect(result.context).toEqual(withContext.context);
	});
});

describe('PresenceInfoSchema', () => {
	it('should validate presence information', () => {
		const presence = {
			userId: 'user-123',
			userName: 'John Doe',
			status: 'active' as const,
			device: 'desktop' as const,
			lastActiveAt: '2025-01-15T14:30:00Z',
		};
		const result = PresenceInfoSchema.parse(presence);
		expect(result.userId).toBe(presence.userId);
		expect(result.userName).toBe(presence.userName);
		expect(result.status).toBe(presence.status);
		expect(result.device).toBe(presence.device);
		expect(result.lastActiveAt).toBeInstanceOf(Date);
	});
});
