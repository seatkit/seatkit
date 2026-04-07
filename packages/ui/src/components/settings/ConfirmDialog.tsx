/**
 * ConfirmDialog — modal confirmation for destructive actions
 * Accessibility: role=dialog, aria-modal=true, focus trap
 */
'use client';

import { useEffect, useRef } from 'react';

import type { FC } from 'react';

type ConfirmDialogProps = {
	open: boolean;
	heading: string;
	body: string;
	confirmLabel: string;
	onConfirm: () => void;
	onCancel: () => void;
};

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
	open,
	heading,
	body,
	confirmLabel,
	onConfirm,
	onCancel,
}) => {
	const cancelRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (open) {
			cancelRef.current?.focus();
		}
	}, [open]);

	if (!open) return null;

	return (
		<div
			role="presentation"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onClick={onCancel}
			onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="confirm-dialog-heading"
				className="relative w-full max-w-sm rounded-lg bg-background p-6 shadow-lg mx-4"
				onClick={e => { e.stopPropagation(); }}
				onKeyDown={e => { e.stopPropagation(); }}
			>
				<h2
					id="confirm-dialog-heading"
					className="text-xl font-semibold text-foreground mb-3"
				>
					{heading}
				</h2>
				<p className="text-base font-normal text-muted-foreground mb-6">{body}</p>
				<div className="flex gap-3 justify-end">
					<button
						ref={cancelRef}
						type="button"
						onClick={onCancel}
						className={[
							'px-4 py-2 rounded-md text-sm font-semibold min-h-[44px]',
							'border border-border bg-background text-foreground',
							'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
						].join(' ')}
					>
						Go back
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className={[
							'px-4 py-2 rounded-md text-sm font-semibold min-h-[44px]',
							'bg-destructive text-destructive-foreground',
							'hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
						].join(' ')}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
};
