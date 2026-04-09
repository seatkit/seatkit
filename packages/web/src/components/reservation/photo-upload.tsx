'use client';

import { X } from 'lucide-react';
import React, { useState, useRef, useCallback } from 'react';

type PhotoUploadProps = Readonly<{
	reservationId: string | null; // null in create mode — upload deferred until save
	currentPhotoUrl?: string | null;
	onPhotoUrlChange: (url: string | null) => void;
}>;

type UploadState = 'idle' | 'uploading' | 'success' | 'error';
type ErrorType = 'too_large' | 'upload_failed' | null;

export function PhotoUpload({ reservationId, currentPhotoUrl, onPhotoUrlChange }: PhotoUploadProps) {
	const [uploadState, setUploadState] = useState<UploadState>(
		currentPhotoUrl ? 'success' : 'idle',
	);
	const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl ?? null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [errorType, setErrorType] = useState<ErrorType>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file || !reservationId) return;

			// Client-side size check (D-18: 10 MB)
			if (file.size > 10 * 1024 * 1024) {
				setUploadState('error');
				setErrorType('too_large');
				return;
			}

			setUploadState('uploading');
			setUploadProgress(10);
			setErrorType(null);

			try {
				const formData = new FormData();
				formData.append('file', file);

				const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
				const response = await fetch(`${apiBase}/api/v1/reservations/${reservationId}/photo`, {
					method: 'POST',
					body: formData,
					credentials: 'include',
				});

				setUploadProgress(80);

				if (response.status === 413) {
					setUploadState('error');
					setErrorType('too_large');
					return;
				}
				if (!response.ok) {
					setUploadState('error');
					setErrorType('upload_failed');
					return;
				}

				const json = (await response.json()) as { photoUrl: string };
				setUploadProgress(100);
				setUploadState('success');
				setPhotoUrl(json.photoUrl);
				onPhotoUrlChange(json.photoUrl);
			} catch {
				setUploadState('error');
				setErrorType('upload_failed');
			}
		},
		[reservationId, onPhotoUrlChange],
	);

	const handleRemove = useCallback(() => {
		setPhotoUrl(null);
		setUploadState('idle');
		setUploadProgress(0);
		setErrorType(null);
		onPhotoUrlChange(null);
		if (inputRef.current) inputRef.current.value = '';
	}, [onPhotoUrlChange]);

	return (
		<div className="flex flex-col gap-2">
			{uploadState !== 'success' && (
				<label className="flex flex-col gap-1">
					<span className="sr-only">Attach a photo</span>
					<input
						ref={inputRef}
						type="file"
						accept="image/*"
						capture="environment"
						onChange={(e) => { handleFileChange(e); }}
						disabled={uploadState === 'uploading' || !reservationId}
						className="text-sm text-foreground file:mr-3 file:py-1 file:px-3 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-background file:cursor-pointer disabled:opacity-50"
						aria-label="Attach a photo"
					/>
				</label>
			)}

			{/* Progress bar */}
			{uploadState === 'uploading' && (
				<progress
					value={uploadProgress}
					max={100}
					aria-label="Upload progress"
					className="w-full h-1.5 rounded-full overflow-hidden appearance-none [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-amber-500 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-amber-500"
				/>
			)}

			{/* Error messages */}
			{uploadState === 'error' && errorType === 'too_large' && (
				<p className="text-destructive text-sm" role="alert">
					File too large. Maximum size is 10 MB.
				</p>
			)}
			{uploadState === 'error' && errorType === 'upload_failed' && (
				<p className="text-destructive text-sm" role="alert">
					Upload failed. Check your connection and try again.
				</p>
			)}

			{/* Preview thumbnail */}
			{uploadState === 'success' && photoUrl && (
				<div className="relative inline-block w-16 h-16">
					{/* img tag — photoUrl is our own API response URL, not external user content */}
					<img
						src={photoUrl}
						alt="Reservation"
						className="w-16 h-16 rounded-md object-cover"
					/>
					<button
						type="button"
						onClick={handleRemove}
						aria-label="Remove photo"
						className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<X className="w-3 h-3" />
					</button>
				</div>
			)}
		</div>
	);
}
