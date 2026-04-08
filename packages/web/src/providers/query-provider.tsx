/**
 * TanStack Query Provider
 * QueryClient setup for server state management
 * @module providers/query-provider
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { connectWebSocket, setPresenceUpdateCallback } from '../lib/ws-client.js';
import { usePresenceStore } from '../stores/presence-store.js';

type QueryProviderProps = {
	readonly children: ReactNode;
};

/**
 * QueryProvider component
 * Wraps the app with TanStack Query client for server state management.
 * Connects the WebSocket singleton once on mount and wires the presence callback.
 */
export function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000, // D-15: 5 minutes — still valid once WS invalidates
						refetchOnWindowFocus: false,
						retry: 1,
					},
					mutations: {
						retry: 1,
					},
				},
			}),
	);

	const setEntries = usePresenceStore((s) => s.setEntries);
	const cleanupRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		setPresenceUpdateCallback(setEntries);
		cleanupRef.current = connectWebSocket(queryClient);
		return () => {
			cleanupRef.current?.();
		};
	}, [queryClient, setEntries]);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}
