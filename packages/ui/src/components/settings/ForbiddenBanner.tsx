/**
 * ForbiddenBanner — 403 message for non-admin staff accessing admin-only pages
 * D-11: Admin-only pages show this banner instead of hiding the nav link
 */
import type { FC } from 'react';

export const ForbiddenBanner: FC = () => (
	<div role="alert" className="rounded-md border border-border bg-muted p-6 text-center">
		<p className="text-sm font-semibold text-foreground mb-1">Access restricted</p>
		<p className="text-sm font-normal text-muted-foreground">
			This section requires admin access. Contact your admin to request access.
		</p>
	</div>
);
