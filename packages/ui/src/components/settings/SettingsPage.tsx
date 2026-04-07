/**
 * SettingsPage — content area wrapper with heading
 */
import type { ReactNode } from 'react';

type SettingsPageProps = {
	heading: string;
	children: ReactNode;
}

export function SettingsPage({ heading, children }: SettingsPageProps) {
	return (
		<div className="max-w-2xl">
			<h1 className="text-xl font-semibold text-foreground mb-6">{heading}</h1>
			{children}
		</div>
	);
}
