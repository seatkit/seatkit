import Link from 'next/link';

import type { Metadata } from 'next';

import { ErrorBoundary } from '@/components/error-boundary';
import { AppPresenceBadgeRow } from '@/components/presence-badge';
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
			<body className="min-h-screen bg-background text-foreground">
				<ErrorBoundary>
					<QueryProvider>
						{/* App nav bar — h-14, border-b */}
						<header className="h-14 bg-background border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
							<Link href="/reservations" className="font-semibold text-lg tracking-tight">
								SeatKit
							</Link>
							<AppPresenceBadgeRow />
						</header>
						<main className="flex flex-col flex-1">
							{children}
						</main>
					</QueryProvider>
				</ErrorBoundary>
			</body>
		</html>
	);
}
