/* eslint-disable no-console */
/**
 * Simple Google Secret Manager integration
 * Minimal implementation that works for both dev and production
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'seatkit-dev'; // Hardcoded fallback
const ENVIRONMENT = process.env.NODE_ENV || 'development';

type Secrets = {
	supabaseUrl: string;
	supabasePublishableKey: string;
	supabaseSecretKey: string;
	databaseUrl: string;
	betterAuthSecret?: string;
	smtpHost?: string;
	smtpPort?: string;
	smtpUser?: string;
	smtpPass?: string;
	smtpFrom?: string;
};

/**
 * Simple function to get a secret from Google Secret Manager
 */
async function getSecret(secretName: string): Promise<string> {
	if (!PROJECT_ID) {
		throw new Error('PROJECT_ID is required');
	}

	// Create client using Application Default Credentials (ADC)
	// As per official docs: no configuration needed, ADC handles everything
	const client = new SecretManagerServiceClient();

	const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;

	try {
		console.log(`🔍 Accessing secret: ${name}`);
		const [version] = await client.accessSecretVersion({ name });
		const payload = version.payload?.data?.toString();

		if (!payload) {
			throw new Error(`Empty payload for secret: ${secretName}`);
		}

		console.log(`✅ Successfully retrieved secret: ${secretName}`);
		return payload;
	} catch (error) {
		console.error(`❌ Failed to get secret ${secretName}:`, error);
		throw error;
	}
}

/**
 * Load all secrets from Google Secret Manager
 */
async function tryGetSecret(secretName: string): Promise<string | undefined> {
	try {
		return await getSecret(secretName);
	} catch {
		return undefined;
	}
}

async function loadFromSecretManager(): Promise<Secrets> {
	const env = PROJECT_ID === 'seatkit-prod' ? 'prod' : 'dev';

	console.log(`☁️  Loading secrets from Google Secret Manager (${env})`);

	const [
		supabaseUrl,
		supabasePublishableKey,
		supabaseSecretKey,
		databaseUrl,
		betterAuthSecret,
		smtpHost,
		smtpPort,
		smtpUser,
		smtpPass,
		smtpFrom,
	] = await Promise.all([
		getSecret(`seatkit-${env}-supabase-url`),
		getSecret(`seatkit-${env}-supabase-publishable-key`),
		getSecret(`seatkit-${env}-supabase-secret-key`),
		getSecret(`seatkit-${env}-database-url`),
		// Optional secrets — do not fail if absent
		tryGetSecret(`seatkit-${env}-better-auth-secret`),
		tryGetSecret(`seatkit-${env}-smtp-host`),
		tryGetSecret(`seatkit-${env}-smtp-port`),
		tryGetSecret(`seatkit-${env}-smtp-user`),
		tryGetSecret(`seatkit-${env}-smtp-pass`),
		tryGetSecret(`seatkit-${env}-smtp-from`),
	]);

	return {
		supabaseUrl,
		supabasePublishableKey,
		supabaseSecretKey,
		databaseUrl,
		// Spread optional fields only when defined — required by exactOptionalPropertyTypes
		...(betterAuthSecret !== undefined && { betterAuthSecret }),
		...(smtpHost !== undefined && { smtpHost }),
		...(smtpPort !== undefined && { smtpPort }),
		...(smtpUser !== undefined && { smtpUser }),
		...(smtpPass !== undefined && { smtpPass }),
		...(smtpFrom !== undefined && { smtpFrom }),
	};
}

/**
 * Load secrets from environment variables (.env fallback)
 */
function loadFromEnv(): Secrets {
	const required = {
		supabaseUrl: process.env.SUPABASE_URL ?? '',
		supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
		supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? '',
		databaseUrl: process.env.DATABASE_URL ?? '',
	};

	const missing = Object.entries(required)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missing.length > 0) {
		throw new Error(`Missing environment variables: ${missing.join(', ')}`);
	}

	// Spread optional env vars only when defined — required by exactOptionalPropertyTypes
	const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
	const smtpHost = process.env.SMTP_HOST;
	const smtpPort = process.env.SMTP_PORT;
	const smtpUser = process.env.SMTP_USER;
	const smtpPass = process.env.SMTP_PASS;
	const smtpFrom = process.env.SMTP_FROM;

	return {
		...required,
		...(betterAuthSecret !== undefined && { betterAuthSecret }),
		...(smtpHost !== undefined && { smtpHost }),
		...(smtpPort !== undefined && { smtpPort }),
		...(smtpUser !== undefined && { smtpUser }),
		...(smtpPass !== undefined && { smtpPass }),
		...(smtpFrom !== undefined && { smtpFrom }),
	};
}

/**
 * Main function: Get secrets from Secret Manager or .env fallback
 */
export async function getSecrets(): Promise<Secrets> {
	// If GOOGLE_CLOUD_PROJECT is set, try Secret Manager first
	if (PROJECT_ID) {
		try {
			return await loadFromSecretManager();
		} catch (error) {
			console.warn('⚠️  Failed to load from Secret Manager:', error);

			// In development, fallback to .env
			if (ENVIRONMENT === 'development') {
				console.log('🔄 Falling back to .env file');
				return loadFromEnv();
			}

			// In production, fail fast
			throw error;
		}
	}

	// No PROJECT_ID set - use .env (development only)
	if (ENVIRONMENT === 'development') {
		console.log('🔧 Local development: Loading from .env file');
		return loadFromEnv();
	}

	throw new Error(
		'No secret source available. Set GOOGLE_CLOUD_PROJECT or provide .env in development',
	);
}
