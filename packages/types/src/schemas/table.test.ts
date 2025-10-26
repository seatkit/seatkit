/**
 * Tests for table schema
 * @module schemas/table.test
 */

import { describe, it, expect } from 'vitest';

import {
	TableStatusSchema,
	TableShapeSchema,
	TablePositionSchema,
	TableSchema,
	ValidatedTableSchema,
	CreateTableSchema,
} from './table.js';

describe('TableStatusSchema', () => {
	it('should validate table status values', () => {
		expect(TableStatusSchema.parse('available')).toBe('available');
		expect(() => TableStatusSchema.parse('invalid')).toThrow();
	});
});

describe('TableShapeSchema', () => {
	it('should validate table shapes', () => {
		expect(TableShapeSchema.parse('circle')).toBe('circle');
		expect(() => TableShapeSchema.parse('triangle')).toThrow();
	});
});

describe('TablePositionSchema', () => {
	it('should validate position coordinates', () => {
		const position = { x: 100, y: 50, rotation: 45 };
		expect(TablePositionSchema.parse(position)).toEqual(position);
	});

	it('should reject invalid coordinates', () => {
		expect(() => TablePositionSchema.parse({ x: -1, y: 0 })).toThrow();
		expect(() =>
			TablePositionSchema.parse({ x: 0, y: 0, rotation: 400 }),
		).toThrow();
	});
});

describe('TableSchema', () => {
	const validTable = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		createdAt: '2025-01-15T14:30:00Z',
		updatedAt: '2025-01-15T14:30:00Z',
		name: 'Table 1',
		minCapacity: 2,
		maxCapacity: 4,
		optimalCapacity: 4,
		status: 'available' as const,
		isActive: true,
	};

	it('should validate complete table', () => {
		const result = TableSchema.parse(validTable);
		expect(result.id).toBe(validTable.id);
		expect(result.createdAt).toBeInstanceOf(Date);
		expect(result.updatedAt).toBeInstanceOf(Date);
		expect(result.name).toBe(validTable.name);
		expect(result.status).toBe(validTable.status);
	});

	it('should allow optional fields', () => {
		const withOptional = {
			...validTable,
			displayName: 'Window Table',
			position: { x: 100, y: 50 },
			roomId: 'main-dining',
			features: ['window', 'quiet'],
		};
		const result = TableSchema.parse(withOptional);
		expect(result.createdAt).toBeInstanceOf(Date);
		expect(result.updatedAt).toBeInstanceOf(Date);
		expect(result.displayName).toBe('Window Table');
		expect(result.position).toEqual({ x: 100, y: 50 });
		expect(result.roomId).toBe('main-dining');
		expect(result.features).toEqual(['window', 'quiet']);
	});
});

describe('ValidatedTableSchema', () => {
	it('should enforce capacity constraints', () => {
		const validTable = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			createdAt: '2025-01-15T14:30:00Z',
			updatedAt: '2025-01-15T14:30:00Z',
			name: 'Table 1',
			minCapacity: 2,
			maxCapacity: 6,
			optimalCapacity: 4,
			status: 'available' as const,
			isActive: true,
		};
		const result = ValidatedTableSchema.parse(validTable);
		expect(result.id).toBe(validTable.id);
		expect(result.createdAt).toBeInstanceOf(Date);
		expect(result.updatedAt).toBeInstanceOf(Date);
		expect(result.minCapacity).toBe(2);
		expect(result.maxCapacity).toBe(6);
		expect(result.optimalCapacity).toBe(4);
	});

	it('should reject invalid capacity ordering', () => {
		const invalidTable = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			createdAt: '2025-01-15T14:30:00Z',
			updatedAt: '2025-01-15T14:30:00Z',
			name: 'Table 1',
			minCapacity: 4,
			maxCapacity: 6,
			optimalCapacity: 2, // Invalid: optimal < min
			status: 'available' as const,
			isActive: true,
		};
		expect(() => ValidatedTableSchema.parse(invalidTable)).toThrow();
	});
});

describe('CreateTableSchema', () => {
	it('should omit auto-generated fields', () => {
		const input = {
			name: 'Table 1',
			minCapacity: 2,
			maxCapacity: 4,
			optimalCapacity: 4,
		};
		expect(CreateTableSchema.parse(input)).toBeDefined();
	});
});
