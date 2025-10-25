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
		expect(SessionSchema.parse(validSession)).toEqual(validSession);
	});

	it('should allow optional context', () => {
		const withContext = {
			...validSession,
			context: {
				view: 'timeline' as const,
				focusedReservationId: 'res-123',
			},
		};
		expect(SessionSchema.parse(withContext)).toEqual(withContext);
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
		expect(PresenceInfoSchema.parse(presence)).toEqual(presence);
	});
});
