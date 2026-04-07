'use client';

import { SettingsLayout, SettingsNav, SettingsNavItem } from '@seatkit/ui';
import { usePathname, useRouter } from 'next/navigation';

import { signOut, useSession } from '../../lib/auth-client.js';

import type { ReactNode } from 'react';

const NAV_ITEMS = [
	{ href: '/settings/tables', label: 'Tables' },
	{ href: '/settings/service', label: 'Service' },
	{ href: '/settings/priority', label: 'Table priority' },
	{ href: '/settings/staff', label: 'Staff' },
] as const;

export default function SettingsLayoutWrapper({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { data: session } = useSession();

	async function handleSignOut() {
		await signOut();
		router.push('/login');
	}

	return (
		<SettingsLayout
			nav={
				<SettingsNav>
					{NAV_ITEMS.map(item => (
						<SettingsNavItem
							key={item.href}
							href={item.href}
							isActive={pathname.startsWith(item.href)}
						>
							{item.label}
						</SettingsNavItem>
					))}
					{session && (
						<li className="mt-4 pt-4 border-t border-border">
							<button
								onClick={() => void handleSignOut()}
								className="flex items-center px-3 w-full text-sm font-semibold text-muted-foreground hover:text-foreground min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
							>
								Sign out
							</button>
						</li>
					)}
				</SettingsNav>
			}
		>
			{children}
		</SettingsLayout>
	);
}
