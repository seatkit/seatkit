/**
 * Interactive secrets setup using gcloud CLI
 * Prompts user for secret values and creates them in Google Secret Manager
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;

if (!PROJECT_ID) {
	console.error('❌ GOOGLE_CLOUD_PROJECT environment variable is required');
	console.log('Set it with: export GOOGLE_CLOUD_PROJECT=your-project-id');
	process.exit(1);
}

interface SecretConfig {
	name: string;
	description: string;
	prompt: string;
	defaultValue?: string;
	sensitive?: boolean; // Hide input for sensitive values
}

const DEV_SECRETS: SecretConfig[] = [
	{
		name: 'seatkit-dev-supabase-url',
		description: 'Supabase project URL for development',
		prompt: 'Enter your Supabase URL',
	},
	{
		name: 'seatkit-dev-supabase-publishable-key',
		description: 'Supabase publishable key for development',
		prompt: 'Enter your Supabase publishable key',
		sensitive: true,
	},
	{
		name: 'seatkit-dev-supabase-secret-key',
		description: 'Supabase secret key for development',
		prompt: 'Enter your Supabase secret key',
		sensitive: true,
	},
	{
		name: 'seatkit-dev-database-url',
		description: 'Database connection URL for development',
		prompt: 'Enter your database password (will be inserted into connection URL)',
		sensitive: true,
	},
];

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

/**
 * Prompt user for input with optional default value
 */
function promptUser(question: string, defaultValue?: string, sensitive = false): Promise<string> {
	return new Promise((resolve) => {
		const prompt = defaultValue
			? `${question} (default: ${sensitive ? '***' : defaultValue}): `
			: `${question}: `;

		if (sensitive) {
			// For sensitive values, just use regular input but note it's sensitive
			// The hidden input was causing issues
			rl.question(prompt, (answer) => {
				resolve(answer.trim() || defaultValue || '');
			});
		} else {
			rl.question(prompt, (answer) => {
				resolve(answer.trim() || defaultValue || '');
			});
		}
	});
}

/**
 * Create or update a secret in Google Secret Manager
 */
async function createSecret(name: string, value: string) {
	try {
		console.log(`🔄 Creating secret: ${name}...`);

		// First check if Secret Manager API is enabled
		try {
			await execAsync('gcloud services list --enabled --filter="name:secretmanager.googleapis.com" --format="value(name)"');
		} catch (error) {
			console.log('🔄 Enabling Secret Manager API...');
			await execAsync('gcloud services enable secretmanager.googleapis.com');
			console.log('✅ Secret Manager API enabled');
		}

		// Try to create the secret - use a simpler approach with temp file
		const tempCmd = `echo '${value.replace(/'/g, "'\\''")}' | gcloud secrets create ${name} --data-file=-`;
		await execAsync(tempCmd);

		console.log(`✅ Created secret: ${name}`);
	} catch (error: any) {
		const errorMessage = error.message.toLowerCase();
		if (errorMessage.includes('already exists') || errorMessage.includes('already exist')) {
			console.log(`   Secret already exists: ${name}`);

			// Ask if user wants to update
			const shouldUpdate = await promptUser('Update existing secret? (y/N)', 'n', false);

			if (shouldUpdate.toLowerCase() === 'y' || shouldUpdate.toLowerCase() === 'yes') {
				try {
					const updateCmd = `echo '${value.replace(/'/g, "'\\''")}' | gcloud secrets versions add ${name} --data-file=-`;
					await execAsync(updateCmd);
					console.log(`   ✅ Updated secret: ${name}`);
				} catch (updateError) {
					console.log(`   ❌ Could not update ${name}:`, updateError);
				}
			} else {
				console.log(`   ⏭️  Skipped updating ${name}`);
			}
		} else {
			console.error(`❌ Failed to create ${name}:`, error.message);
		}
	}
}

/**
 * Check if gcloud CLI is available and user is authenticated
 */
async function checkGcloud() {
	try {
		const { stdout } = await execAsync('gcloud --version');
		console.log('✅ Google Cloud CLI is available');

		// Check if authenticated
		const { stdout: authInfo } = await execAsync(
			'gcloud auth list --filter=status:ACTIVE --format="value(account)"'
		);
		if (!authInfo.trim()) {
			console.error('❌ Not authenticated with Google Cloud');
			console.log('Run: gcloud auth login');
			process.exit(1);
		}

		console.log(`✅ Authenticated as: ${authInfo.trim()}`);
	} catch (error) {
		console.error('❌ Google Cloud CLI not found or not authenticated');
		console.log('1. Install: https://cloud.google.com/sdk/docs/install');
		console.log('2. Run: gcloud auth login');
		console.log('3. Run: gcloud auth application-default login');
		process.exit(1);
	}
}

/**
 * Main setup function
 */
async function setupSecrets() {
	console.log(`🔐 Setting up secrets for project: ${PROJECT_ID}\n`);

	await checkGcloud();

	console.log('📦 Setting up development secrets...\n');

	for (const secret of DEV_SECRETS) {
		console.log(`\n📝 ${secret.description}`);

		let value: string;

		if (secret.name === 'seatkit-dev-database-url') {
			// Special handling for database URL
			const password = await promptUser(secret.prompt, secret.defaultValue, secret.sensitive);
			value = `postgresql://postgres:${password}@db.xynyfjxcxrkyopagelnx.supabase.co:5432/postgres`;
		} else {
			value = await promptUser(secret.prompt, secret.defaultValue, secret.sensitive);
		}

		if (value) {
			await createSecret(secret.name, value);
		} else {
			console.log(`⏭️  Skipped ${secret.name} (no value provided)`);
		}
	}

	rl.close();

	console.log('\n✅ Secret setup complete!');
	console.log('\nTest your setup:');
	console.log(`export GOOGLE_CLOUD_PROJECT=${PROJECT_ID}`);
	console.log('pnpm dev');
}

if (import.meta.url === `file://${process.argv[1]}`) {
	setupSecrets().catch((error) => {
		console.error('Setup failed:', error);
		rl.close();
		process.exit(1);
	});
}