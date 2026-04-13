'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster(props: ToasterProps) {
	const { theme = 'system' } = useTheme();
	const resolvedTheme = (theme === 'dark' || theme === 'light' ? theme : 'system') as 'light' | 'dark' | 'system';

	return (
		<Sonner
			theme={resolvedTheme}
			className="toaster group"
			style={
				{
					'--normal-bg': 'hsl(var(--foreground))',
					'--normal-text': 'hsl(var(--background))',
					'--normal-border': 'hsl(var(--border))',
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: 'group toast group-[.toaster]:shadow-lg group-[.toaster]:border-border',
					description: 'group-[.toast]:text-muted-foreground',
					actionButton: 'group-[.toast]:!bg-transparent group-[.toast]:!text-amber-400 group-[.toast]:hover:!text-amber-300 group-[.toast]:!font-semibold group-[.toast]:underline group-[.toast]:!p-0 group-[.toast]:!h-auto',
					cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
				},
			}}
			{...props}
		/>
	);
}

export { Toaster };
