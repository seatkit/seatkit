/**
 * Error Boundary Component
 * React error boundary for catching and displaying errors
 * @module components/error-boundary
 */

'use client';

import { Component, type ReactNode } from 'react';

type ErrorBoundaryProps = {
	children: ReactNode;
	fallback?: (error: Error, reset: () => void) => ReactNode;
};

type ErrorBoundaryState = {
	hasError: boolean;
	error: Error | null;
};

/**
 * Error Boundary component
 * Catches React errors in child components and displays fallback UI
 */
export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: unknown): void {
		// Log error to error reporting service in production
		// eslint-disable-next-line no-console
		console.error('ErrorBoundary caught an error:', error, errorInfo);
	}

	reset = (): void => {
		this.setState({ hasError: false, error: null });
	};

	render(): ReactNode {
		if (this.state.hasError && this.state.error) {
			if (this.props.fallback) {
				return this.props.fallback(this.state.error, this.reset);
			}

			return (
				<div className="flex min-h-screen flex-col items-center justify-center p-24">
					<div className="text-center">
						<h1 className="text-4xl font-bold mb-4 text-red-600">
							Something went wrong
						</h1>
						<p className="text-xl text-gray-600 mb-8">
							{this.state.error.message}
						</p>
						<button
							onClick={this.reset}
							className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
						>
							Try again
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

