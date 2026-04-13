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
				<div role="alert" className="flex min-h-screen flex-col items-center justify-center p-24">
					<div className="text-center">
						<h1 className="text-4xl font-bold mb-4 text-destructive">
							Something went wrong
						</h1>
						<p className="text-xl text-muted-foreground mb-8">
							{this.state.error.message}
						</p>
						<button
							onClick={this.reset}
							className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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

