/**
 * SettingsNav — left sidebar nav with section heading and nav items
 */
import type { ReactNode } from 'react';

type SettingsNavProps = {
	children: ReactNode;
}

export function SettingsNav({ children }: SettingsNavProps) {
	return (
		<nav className="p-4" aria-label="Settings navigation">
			<p className="text-sm font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wide">
				Settings
			</p>
			<ul className="space-y-1" role="list">
				{children}
			</ul>
		</nav>
	);
}
