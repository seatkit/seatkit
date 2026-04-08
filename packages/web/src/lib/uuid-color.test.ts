import { describe, it, expect } from 'vitest';
import { uuidToColor } from './uuid-color.js';

describe('uuidToColor (RES-11)', () => {
	it('is deterministic — same UUID returns same color', () => {
		const uuid = '550e8400-e29b-41d4-a716-446655440000';
		const first = uuidToColor(uuid);
		const second = uuidToColor(uuid);
		expect(first.bg).toBe(second.bg);
		expect(first.text).toBe(second.text);
	});

	it('returns hsl format strings', () => {
		const { bg, text } = uuidToColor('550e8400-e29b-41d4-a716-446655440000');
		expect(bg).toMatch(/^hsl\(\d+, 65%, 72%\)$/);
		expect(text).toMatch(/^hsl\(\d+, 65%, 22%\)$/);
	});

	it('bg and text share the same hue', () => {
		const { bg, text } = uuidToColor('aaaabbbb-cccc-dddd-eeee-ffffffffffff');
		const bgHue = parseInt(bg.replace(/^hsl\((\d+).*/, '$1'));
		const textHue = parseInt(text.replace(/^hsl\((\d+).*/, '$1'));
		expect(bgHue).toBe(textHue);
	});

	it('hue is in valid range 0-359', () => {
		const uuids = [
			'00000000-0000-0000-0000-000000000000',
			'ffffffff-ffff-ffff-ffff-ffffffffffff',
			'550e8400-e29b-41d4-a716-446655440000',
		];
		for (const uuid of uuids) {
			const { bg } = uuidToColor(uuid);
			const hue = parseInt(bg.replace(/^hsl\((\d+).*/, '$1'));
			expect(hue).toBeGreaterThanOrEqual(0);
			expect(hue).toBeLessThan(360);
		}
	});

	it('different UUIDs produce different hues (statistically likely)', () => {
		const a = uuidToColor('00000000-0000-0000-0000-000000000000');
		const b = uuidToColor('aabbccdd-eeff-0011-2233-445566778899');
		// Not guaranteed but these specific UUIDs have different hex prefixes
		expect(a.bg).not.toBe(b.bg);
	});
});
