import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PhotoUpload } from './photo-upload.js';

// Mock fetch globally
const mockFetch = vi.fn();
beforeEach(() => {
	vi.stubGlobal('fetch', mockFetch);
});

async function renderAndUpload() {
	render(
		<PhotoUpload
			reservationId="test-id"
			currentPhotoUrl={null}
			onPhotoUrlChange={() => {}}
		/>,
	);
	const input = screen.getByLabelText('Attach a photo');
	const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
	await userEvent.upload(input, file);
}

describe('PhotoUpload (RES-10)', () => {
	it('shows progress bar during upload', async () => {
		mockFetch.mockImplementation(
			() => new Promise(() => { /* never resolves — simulates upload in progress */ }),
		);

		render(
			<PhotoUpload
				reservationId="test-id"
				currentPhotoUrl={null}
				onPhotoUrlChange={() => {}}
			/>,
		);

		const input = screen.getByLabelText('Attach a photo');
		const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
		await userEvent.upload(input, file);

		expect(screen.getByRole('progressbar')).toBeTruthy();
	});

	it('shows thumbnail preview after successful upload', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ photoUrl: 'https://example.com/photo.jpg' }),
		} as Response);

		render(
			<PhotoUpload
				reservationId="test-id"
				currentPhotoUrl={null}
				onPhotoUrlChange={() => {}}
			/>,
		);

		const input = screen.getByLabelText('Attach a photo');
		const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
		await userEvent.upload(input, file);

		await waitFor(() => {
			expect(screen.getByAltText('Reservation')).toBeTruthy();
		});
	});

	it('shows "File too large" error on 413 response', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 413,
			json: async () => ({ message: 'Too large' }),
		} as Response);

		await renderAndUpload();

		await waitFor(() => {
			expect(screen.getByText('File too large. Maximum size is 10 MB.')).toBeTruthy();
		});
	});

	it('shows "Upload failed" error on network error', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));

		await renderAndUpload();

		await waitFor(() => {
			expect(screen.getByText('Upload failed. Check your connection and try again.')).toBeTruthy();
		});
	});

	it('remove button clears the preview', async () => {
		render(
			<PhotoUpload
				reservationId="test-id"
				currentPhotoUrl="https://example.com/photo.jpg"
				onPhotoUrlChange={() => {}}
			/>,
		);

		expect(screen.getByAltText('Reservation')).toBeTruthy();
		await userEvent.click(screen.getByLabelText('Remove photo'));
		expect(screen.queryByAltText('Reservation photo')).toBeNull();
	});
});
