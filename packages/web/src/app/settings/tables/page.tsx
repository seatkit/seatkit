'use client';

import {
	SettingsPage,
	ForbiddenBanner,
	DestructiveButton,
} from '@seatkit/ui';
import { useState } from 'react';

import { ConfirmDialog } from '../../../components/confirm-dialog.js';
import { Skeleton } from '../../../components/ui/skeleton.js';
import { useSession } from '../../../lib/auth-client.js';
import { useTables, useCreateTable, useDeleteTable } from '../../../lib/queries/settings.js';

export default function TablesSettingsPage() {
	const { data: session } = useSession();
	const isAdmin = session?.user?.role === 'admin';

	const { data, isLoading } = useTables();
	const createTable = useCreateTable();
	const deleteTable = useDeleteTable();

	const [newName, setNewName] = useState('');
	const [newMaxCap, setNewMaxCap] = useState('');
	const [newPosX, setNewPosX] = useState('');
	const [newPosY, setNewPosY] = useState('');
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
	const [saveError, setSaveError] = useState('');

	if (!isAdmin) {
		return (
			<SettingsPage heading="Tables">
				<ForbiddenBanner />
			</SettingsPage>
		);
	}

	async function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		setSaveError('');
		try {
			await createTable.mutateAsync({
				name: newName,
				maxCapacity: parseInt(newMaxCap, 10),
				positionX: newPosX ? parseInt(newPosX, 10) : null,
				positionY: newPosY ? parseInt(newPosY, 10) : null,
			});
			setNewName('');
			setNewMaxCap('');
			setNewPosX('');
			setNewPosY('');
		} catch {
			setSaveError('Failed to save. Please try again.');
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		try {
			await deleteTable.mutateAsync(deleteTarget.id);
			setDeleteTarget(null);
		} catch {
			setSaveError('Failed to save. Please try again.');
		}
	}

	return (
		<SettingsPage heading="Tables">
			{isLoading && (
				<div className="space-y-3">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			)}

			{/* Table list */}
			<div className="space-y-2 mb-8">
				{data?.tables.map(table => (
					<div
						key={table.id}
						className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3"
					>
						<div>
							<span className="text-sm font-semibold">{table.name}</span>
							<span className="ml-3 text-sm text-muted-foreground">
								Capacity {table.minCapacity}–{table.maxCapacity}
							</span>
							{(table.positionX !== null || table.positionY !== null) && (
								<span className="ml-3 text-sm text-muted-foreground">
									Row {table.positionY ?? '—'} / Col {table.positionX ?? '—'}
								</span>
							)}
						</div>
						<DestructiveButton
							aria-label={`Delete table ${table.name}`}
							onClick={() => setDeleteTarget({ id: table.id, name: table.name })}
						/>
					</div>
				))}
			</div>

			{/* Add table form */}
			<form onSubmit={e => void handleAdd(e)} className="space-y-4">
				<h2 className="text-sm font-semibold text-foreground">Add table</h2>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label htmlFor="table-name" className="text-sm font-semibold block mb-1.5">
							Name
						</label>
						<input
							id="table-name"
							value={newName}
							onChange={e => setNewName(e.target.value)}
							placeholder="e.g. T8"
							required
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						/>
					</div>
					<div>
						<label htmlFor="table-capacity" className="text-sm font-semibold block mb-1.5">
							Max capacity
						</label>
						<input
							id="table-capacity"
							type="number"
							min="1"
							value={newMaxCap}
							onChange={e => setNewMaxCap(e.target.value)}
							required
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						/>
					</div>
					<div>
						<label htmlFor="table-posx" className="text-sm font-semibold block mb-1.5">
							Grid column
						</label>
						<input
							id="table-posx"
							type="number"
							value={newPosX}
							onChange={e => setNewPosX(e.target.value)}
							placeholder="optional"
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						/>
					</div>
					<div>
						<label htmlFor="table-posy" className="text-sm font-semibold block mb-1.5">
							Grid row
						</label>
						<input
							id="table-posy"
							type="number"
							value={newPosY}
							onChange={e => setNewPosY(e.target.value)}
							placeholder="optional"
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						/>
					</div>
				</div>
				{saveError && <p className="text-sm text-destructive">{saveError}</p>}
				<button
					type="submit"
					disabled={createTable.isPending}
					className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold min-h-[44px] disabled:opacity-50 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					{createTable.isPending ? 'Saving...' : 'Save changes'}
				</button>
			</form>

			<ConfirmDialog
				open={deleteTarget !== null}
				heading="Delete table"
				body={`Deleting ${deleteTarget?.name ?? 'this table'} will remove it from all future reservations. This cannot be undone.`}
				confirmLabel="Delete table"
				onConfirm={() => void handleDelete()}
				onCancel={() => setDeleteTarget(null)}
			/>
		</SettingsPage>
	);
}
