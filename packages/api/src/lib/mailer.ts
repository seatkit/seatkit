/**
 * Nodemailer transporter factory
 * SMTP email for Better Auth invite emails.
 * Uses env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from 'nodemailer';

type InviteEmailOptions = {
	to: string;
	role: string;
	inviteUrl: string;
}

function createTransporter() {
	const host = process.env.SMTP_HOST;
	const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!host || !user || !pass) {
		// In development without SMTP configured, log instead of crash
		return null;
	}

	return nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: { user, pass },
	});
}

export async function sendInviteEmail({ to, role, inviteUrl }: InviteEmailOptions): Promise<void> {
	const transporter = createTransporter();
	const from = process.env.SMTP_FROM ?? 'noreply@seatkit.app';

	if (!transporter) {
		// Development fallback: log invite URL to console
		/* eslint-disable no-console */
		console.log(`[INVITE] To: ${to}, Role: ${role}, URL: ${inviteUrl}`);
		return;
	}

	await transporter.sendMail({
		from,
		to,
		subject: 'You have been invited to SeatKit',
		text: [
			`You have been invited to join SeatKit as ${role}.`,
			'',
			'Click the link below to accept your invitation and set your password:',
			inviteUrl,
			'',
			'This link expires in 48 hours.',
		].join('\n'),
		html: [
			`<p>You have been invited to join SeatKit as <strong>${role}</strong>.</p>`,
			`<p><a href="${inviteUrl}">Accept invitation and set your password</a></p>`,
			'<p>This link expires in 48 hours.</p>',
		].join('\n'),
	});
}
