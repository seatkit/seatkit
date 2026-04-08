/**
 * Photo service — RES-10
 * Uploads reservation photos to Supabase Storage and returns the public URL.
 * Files are validated for MIME type before upload.
 */
import { createClient } from '@supabase/supabase-js';
import type { FastifyInstance } from 'fastify';

const BUCKET = 'seatkit-reservation-photos';

// Allowed image MIME types (T-04-02-01: server-side MIME allowlist)
const ALLOWED_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/heic',
	'image/heif',
]);

/**
 * Uploads a photo buffer to Supabase Storage under
 * `seatkit-reservation-photos/{reservationId}/{timestamp}.{ext}`.
 * Returns the public URL of the uploaded file.
 * Throws an HTTP error if the MIME type is invalid or the upload fails.
 *
 * @param reservationId - UUID of the reservation (validated by IdParamsSchema — no path traversal risk, T-04-02-06)
 * @param fileBuffer - Raw file bytes read from the multipart stream
 * @param mimetype - MIME type declared by the upload (validated against ALLOWED_MIME_TYPES)
 * @param fastify - Fastify instance for httpErrors and logging
 */
export async function uploadReservationPhoto(
	reservationId: string,
	fileBuffer: Buffer,
	mimetype: string,
	fastify: FastifyInstance,
): Promise<string> {
	// T-04-02-01: Validate MIME type against allowlist — client-supplied Accept header is untrusted
	if (!ALLOWED_MIME_TYPES.has(mimetype)) {
		throw fastify.httpErrors.unsupportedMediaType(
			`File type "${mimetype}" is not supported. Allowed types: JPEG, PNG, WebP, GIF, HEIC.`,
		);
	}

	// T-04-02-03: Credentials read from env at request time — never returned to client
	const supabaseUrl = process.env.SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
	if (!supabaseUrl || !supabaseKey) {
		fastify.log.error('Supabase credentials not configured for photo upload');
		throw fastify.httpErrors.internalServerError('Storage not configured');
	}

	const supabase = createClient(supabaseUrl, supabaseKey);

	// Build storage path — reservationId is a validated UUID so no path traversal possible (T-04-02-06)
	const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
	const path = `${reservationId}/${Date.now()}.${ext}`;

	const { data, error } = await supabase.storage
		.from(BUCKET)
		.upload(path, fileBuffer, {
			contentType: mimetype,
			upsert: false,
		});

	if (error || !data) {
		fastify.log.error({ error }, 'Supabase Storage upload failed');
		throw fastify.httpErrors.internalServerError('Photo upload failed. Please try again.');
	}

	const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
	return urlData.publicUrl;
}
