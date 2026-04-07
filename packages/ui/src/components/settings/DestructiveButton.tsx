/**
 * DestructiveButton — icon button for destructive actions (remove/delete)
 * Requires aria-label matching the tooltip text (accessibility requirement)
 */
'use client';

import { Trash2 } from 'lucide-react';

import type { ButtonHTMLAttributes, FC } from 'react';

// aria-label is required on this component for accessibility (screen readers + tooltip)
type DestructiveButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'aria-label': string;
};

export const DestructiveButton: FC<DestructiveButtonProps> = ({
	'aria-label': ariaLabel,
	...props
}) => (
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
