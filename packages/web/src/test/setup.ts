/**
 * Test setup file for React Testing Library
 * @module test/setup
 */

import '@testing-library/jest-dom';

// @tanstack/react-virtual uses ResizeObserver to measure scroll containers.
// jsdom does not implement ResizeObserver, so we provide a minimal mock that
// immediately fires the callback with a non-zero rect so virtualizer renders rows.
class MockResizeObserver {
	private callback: ResizeObserverCallback;
	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
	}
	observe(target: Element) {
		// Fire immediately with a 600px height so virtualizer considers rows visible
		this.callback(
			[
				{
					target,
					contentRect: target.getBoundingClientRect(),
					borderBoxSize: [{ blockSize: 600, inlineSize: 1200 }],
					contentBoxSize: [{ blockSize: 600, inlineSize: 1200 }],
					devicePixelContentBoxSize: [{ blockSize: 600, inlineSize: 1200 }],
				},
			],
			this as unknown as ResizeObserver,
		);
	}
	unobserve() {}
	disconnect() {}
}

globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

