/**
 * TanStack Query Provider
 * QueryClient setup for server state management
 * @module providers/query-provider
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

type QueryProviderProps = {
	children: ReactNode;
};

/**
 * QueryProvider component
 * Wraps the app with TanStack Query client for server state management
 */
export function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000, // 5 minutes
						refetchOnWindowFocus: false,
						retry: 1,
					},
					mutations: {
						retry: 1,
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}

