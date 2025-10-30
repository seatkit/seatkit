import type { Metadata } from 'next';
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
			<body>{children}</body>
		</html>
	);
}
