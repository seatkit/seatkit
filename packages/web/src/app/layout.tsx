import type { Metadata } from 'next';

import { ErrorBoundary } from '@/components/error-boundary';
import { QueryProvider } from '@/providers/query-provider';

import './globals.css';

export const metadata: Metadata = {
	title: 'SeatKit - Restaurant Reservation Management',
	description: 'Modern, collaborative reservation management for restaurants',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				<ErrorBoundary>
					<QueryProvider>{children}</QueryProvider>
				</ErrorBoundary>
			</body>
		</html>
	);
}
