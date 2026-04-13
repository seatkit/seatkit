'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const cycle = { system: 'dark', dark: 'light', light: 'system' } as const;
type ThemeKey = keyof typeof cycle;

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		// Placeholder to avoid layout shift before hydration
		return <div className="w-8 h-8" />;
	}

	const current = (theme ?? 'system') as ThemeKey;
	const next = cycle[current] ?? 'system';

	const Icon = current === 'dark' ? Moon : current === 'light' ? Sun : Monitor;

	return (
		<button
			type="button"
			onClick={() => setTheme(next)}
			aria-label={`Switch to ${next} mode`}
			className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
		>
			<Icon className="h-4 w-4" />
		</button>
	);
}
