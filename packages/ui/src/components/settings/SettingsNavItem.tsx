/**
 * SettingsNavItem — individual nav link with active state
 * Variants: default, active
 */
'use client';

import type { FC, ReactNode } from 'react';

type SettingsNavItemProps = {
	href: string;
	isActive?: boolean;
	children: ReactNode;
};

export const SettingsNavItem: FC<SettingsNavItemProps> = ({ href, isActive, children }) => (
	<li>
		<a
			href={href}
			className={[
				'flex items-center px-3 rounded-md text-sm font-semibold min-h-[48px]',
				'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
				'transition-colors',
				isActive
					? 'bg-primary text-primary-foreground'
					: 'text-foreground hover:bg-accent hover:text-accent-foreground',
			].join(' ')}
			aria-current={isActive ? 'page' : undefined}
		>
			{children}
		</a>
	</li>
);
