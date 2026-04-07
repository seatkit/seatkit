/**
 * SettingsNav — left sidebar nav with section heading and nav items
 */
import type { FC, ReactNode } from 'react';

type SettingsNavProps = {
	children: ReactNode;
};

export const SettingsNav: FC<SettingsNavProps> = ({ children }) => (
	<nav className="p-4" aria-label="Settings navigation">
		<p className="text-sm font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wide">
			Settings
		</p>
		<ul className="space-y-1" role="list">
			{children}
		</ul>
	</nav>
);
