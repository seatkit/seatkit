/**
 * SettingsPage — content area wrapper with heading
 */
import type { FC, ReactNode } from 'react';

type SettingsPageProps = {
	heading: string;
	children: ReactNode;
};

export const SettingsPage: FC<SettingsPageProps> = ({ heading, children }) => (
	<div className="max-w-2xl">
		<h1 className="text-xl font-semibold text-foreground mb-6">{heading}</h1>
		{children}
	</div>
);
