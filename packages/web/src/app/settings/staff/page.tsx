'use client';

import {
	DestructiveButton,
	ForbiddenBanner,
	SettingsPage,
} from '@seatkit/ui';
import { useState } from 'react';

import { ConfirmDialog } from '../../../components/confirm-dialog.js';
import { Skeleton } from '../../../components/ui/skeleton.js';
import { useSession } from '../../../lib/auth-client.js';
import { useStaff, useInviteStaff, useRemoveStaff, useSetStaffRole } from '../../../lib/queries/staff.js';

export default function StaffSettingsPage() {
	const { data: session } = useSession();
	const isAdmin = session?.user?.role === 'admin';

	const { data, isLoading } = useStaff();
	const inviteStaff = useInviteStaff();
	const removeStaff = useRemoveStaff();
	const setRole = useSetStaffRole();

	const [inviteEmail, setInviteEmail] = useState('');
	const [lastInvitedEmail, setLastInvitedEmail] = useState('');
	const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error-duplicate' | 'error'>('idle');
	const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

	if (!isAdmin) {
		return (
			<SettingsPage heading="Staff">
				<ForbiddenBanner />
			</SettingsPage>
		);
	}

	async function handleInvite(e: React.FormEvent) {
		e.preventDefault();
		setInviteStatus('idle');
		const emailToInvite = inviteEmail;
		try {
			await inviteStaff.mutateAsync({ email: emailToInvite, role: 'staff' });
			setLastInvitedEmail(emailToInvite);
			setInviteStatus('success');
			setInviteEmail('');
		} catch (err) {
			// Check for duplicate email (409 from API)
			const message = err instanceof Error ? err.message : '';
			if (message.includes('already exists')) {
				setInviteStatus('error-duplicate');
			} else {
				setInviteStatus('error');
			}
		}
	}

	async function handleRemove() {
		if (!removeTarget) return;
		try {
			await removeStaff.mutateAsync(removeTarget.id);
			setRemoveTarget(null);
		} catch {
			// Error handled silently; list will refresh or remain unchanged
		}
	}

	async function handleToggleRole(id: string, currentRole: string) {
		const newRole = currentRole === 'manager' ? 'staff' : 'manager';
		await setRole.mutateAsync({ id, role: newRole as 'staff' | 'manager' });
	}

	const staff = data?.users ?? [];

	return (
		<SettingsPage heading="Staff">
			{/* Invite form */}
			<div className="mb-8">
				<h2 className="text-sm font-semibold text-foreground mb-3">Invite staff member</h2>
				<form onSubmit={e => void handleInvite(e)} className="flex gap-3">
					<div className="flex-1">
						<label htmlFor="invite-email" className="sr-only">Email address</label>
						<input
							id="invite-email"
							type="email"
							value={inviteEmail}
							onChange={e => setInviteEmail(e.target.value)}
							placeholder="Email address"
							required
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						/>
					</div>
					<button
						type="submit"
						disabled={inviteStaff.isPending || !inviteEmail}
						className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold min-h-[44px] disabled:opacity-50 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						{inviteStaff.isPending ? 'Sending...' : 'Send invite'}
					</button>
				</form>
				{/* Invite status messages */}
				{inviteStatus === 'success' && (
					<p className="mt-2 text-sm text-foreground">
						Invite sent to {lastInvitedEmail}.
					</p>
				)}
				{inviteStatus === 'error-duplicate' && (
					<p className="mt-2 text-sm text-destructive">
						A staff member with this email already exists.
					</p>
				)}
				{inviteStatus === 'error' && (
					<p className="mt-2 text-sm text-destructive">
						Failed to send invite. Please try again.
					</p>
				)}
			</div>

			{/* Staff list */}
			{isLoading && (
				<div className="space-y-3">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			)}

			{!isLoading && staff.length === 0 && (
				<div className="text-center py-12">
					<p className="text-base font-semibold text-foreground mb-1">No staff members yet</p>
					<p className="text-sm text-muted-foreground">Send an invite to add your first staff member.</p>
				</div>
			)}

			<div className="space-y-2">
				{staff.map(member => (
					<div
						key={member.id}
						className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3"
					>
						<div>
							<span className="text-sm font-semibold">{member.name}</span>
							<span className="ml-2 text-sm text-muted-foreground">{member.email}</span>
						</div>
						<div className="flex items-center gap-3">
							{/* Role badge — click to toggle */}
							<button
								onClick={() => void handleToggleRole(member.id, member.role ?? 'staff')}
								disabled={member.id === session?.user?.id || setRole.isPending}
								className={[
									'px-3 py-0.5 rounded-full text-sm font-semibold min-h-[44px]',
									'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
									'disabled:opacity-50 disabled:cursor-not-allowed',
									member.role === 'manager'
										? 'bg-primary/10 text-primary'
										: 'bg-muted text-muted-foreground',
								].join(' ')}
								title={
									member.id === session?.user?.id
										? 'Cannot change your own role'
										: `Click to set ${member.role === 'manager' ? 'staff' : 'manager'}`
								}
							>
								{member.role ?? 'staff'}
							</button>
							{/* Remove button — not shown for current user */}
							{member.id !== session?.user?.id && (
								<DestructiveButton
									aria-label={`Remove staff member ${member.name}`}
									onClick={() => setRemoveTarget({ id: member.id, name: member.name })}
								/>
							)}
						</div>
					</div>
				))}
			</div>

			<ConfirmDialog
				open={removeTarget !== null}
				heading="Remove staff member"
				body={`This will immediately revoke ${removeTarget?.name ?? 'this staff member'}'s access. This cannot be undone.`}
				confirmLabel="Remove staff member"
				onConfirm={() => void handleRemove()}
				onCancel={() => setRemoveTarget(null)}
			/>
		</SettingsPage>
	);
}
