/**
 * SettingsLayout — two-column layout: sidebar nav + content area
 * Sidebar: 240px fixed on desktop, top-tab strip on mobile (< 768px)
 */
import type { FC, ReactNode } from 'react';

type SettingsLayoutProps = {
	nav: ReactNode;
	children: ReactNode;
};

export const SettingsLayout: FC<SettingsLayoutProps> = ({ nav, children }) => (
	<div className="min-h-screen bg-background">
		{/* Mobile: stacked. Desktop: sidebar + content */}
		<div className="flex flex-col md:flex-row">
			{/* Sidebar */}
			<aside className="w-full md:w-60 bg-muted md:min-h-screen border-b md:border-b-0 md:border-r border-border">
				{nav}
			</aside>
			{/* Content */}
			<main className="flex-1 p-8">{children}</main>
		</div>
	</div>
);
