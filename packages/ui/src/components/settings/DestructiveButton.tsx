/**
 * DestructiveButton — icon button for destructive actions (remove/delete)
 * Requires aria-label matching the tooltip text (accessibility requirement)
 */
'use client';

import { Trash2 } from 'lucide-react';

import type { ButtonHTMLAttributes } from 'react';

type DestructiveButtonProps = {
	'aria-label': string;
} & ButtonHTMLAttributes<HTMLButtonElement>

export function DestructiveButton({ 'aria-label': ariaLabel, ...props }: DestructiveButtonProps) {
	return (
		<button
			type="button"
			aria-label={ariaLabel}
			title={ariaLabel}
			{...props}
			className={[
				'inline-flex items-center justify-center rounded-md',
				'text-destructive hover:bg-destructive/10',
				'min-h-[44px] min-w-[44px]',
				'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
				'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
				props.className ?? '',
			].join(' ')}
		>
			<Trash2 className="h-4 w-4" aria-hidden="true" />
		</button>
	);
}
