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
			toastOptions={{
				classNames: {
					toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
					description: 'group-[.toast]:text-muted-foreground',
					actionButton: 'group-[.toast]:text-amber-400 group-[.toast]:hover:text-amber-300 group-[.toast]:font-semibold group-[.toast]:underline group-[.toast]:bg-transparent group-[.toast]:p-0',
					cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
				},
			}}
			{...props}
		/>
	);
}

export { Toaster };
