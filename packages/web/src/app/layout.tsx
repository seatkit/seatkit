import Link from 'next/link';

import type { Metadata } from 'next';

import { ErrorBoundary } from '@/components/error-boundary';
import { AppPresenceBadgeRow } from '@/components/presence-badge';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from '@/components/ui/sonner';
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
		<html lang="en" suppressHydrationWarning>
			<body className="min-h-screen bg-background text-foreground">
				<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange storageKey="seatkit-theme">
					<ErrorBoundary>
						<QueryProvider>
							{/* App nav bar — h-14, border-b */}
							<header className="h-14 bg-background border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
								<Link href="/reservations" className="font-semibold text-lg tracking-tight">
									SeatKit
								</Link>
								<div className="flex items-center gap-2">
									<ThemeToggle />
									<AppPresenceBadgeRow />
								</div>
							</header>
							<main className="flex flex-col flex-1">
								{children}
							</main>
						</QueryProvider>
					</ErrorBoundary>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
