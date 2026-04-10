'use client';

import React from 'react';

type FilterChipProps = Readonly<{
	label: string;
	active: boolean;
	onToggle: () => void;
	/** Optional count badge to display alongside the label */
	count?: number;
}>;

/**
 * FilterChip — reusable filter chip for list view filters.
 * Active state: bg-foreground text-background (inverted).
 * Inactive state: border border-border text-foreground.
 * Uses a native checkbox (visually hidden) for toggle semantics.
 */
export function FilterChip({ label, active, onToggle, count }: FilterChipProps) {
	return (
		<label
			className={[
				'inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-sm font-medium cursor-pointer',
				'transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1',
				'whitespace-nowrap',
				active
					? 'bg-foreground text-background border-foreground'
					: 'bg-transparent text-foreground border-border hover:border-foreground/50 hover:bg-muted/50',
			].join(' ')}
		>
			<input
				type="checkbox"
				checked={active}
				onChange={() => { onToggle(); }}
				className="sr-only"
			/>
			{label}
			{count !== undefined && (
				<span
					className={[
						'inline-flex items-center justify-center rounded-full text-xs min-w-[18px] h-[18px] px-1',
						active ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground',
					].join(' ')}
				>
					{count}
				</span>
			)}
		</label>
	);
}
