'use client';

/**
 * Login page — /login
 * D-16: After successful login, redirect to /.
 * No register link (invite-only, D-07).
 * No forgot password (deferred to v2).
 * No remember me (long-lived sessions handle this automatically, D-04).
 */

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { signIn } from '../../lib/auth-client.js';

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [emailError, setEmailError] = useState('');
	const [formError, setFormError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	function validateEmail(value: string): string {
		if (!value) return 'Email is required.';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
		return '';
	}

	function handleEmailBlur() {
		setEmailError(validateEmail(email));
	}

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();

		// Client-side validation (on submit)
		const emailValidationError = validateEmail(email);
		if (emailValidationError) {
			setEmailError(emailValidationError);
			return;
		}
		if (!password) {
			setFormError('Password is required.');
			return;
		}

		setIsLoading(true);
		setFormError('');

		try {
			const result = await signIn.email({
				email,
				password,
				callbackURL: '/',
			});

			if (result.error) {
				// 401 from API — credential error
				setFormError('Incorrect email or password. Please try again.');
				return;
			}

			// Success — redirect to main dashboard
			router.push('/');
		} catch {
			// Network or unexpected error
			setFormError('Unable to connect. Check your connection and try again.');
		} finally {
			setIsLoading(false);
		}
	}

	const isFormValid = email.length > 0 && password.length > 0;

	return (
		// AuthLayout: full screen centered, no header, no nav
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm mt-16">
				{/* Display heading — "SeatKit" */}
				<h1 className="text-[1.75rem] font-semibold text-foreground mb-2">SeatKit</h1>
				{/* Subheading */}
				<p className="text-base font-normal text-muted-foreground mb-8">Sign in to continue</p>

				<form onSubmit={e => { void handleSubmit(e); }} noValidate className="space-y-6">
					{/* Email field */}
					<div className="space-y-1.5">
						<label htmlFor="email" className="text-sm font-semibold text-foreground">
							Email
						</label>
						<input
							id="email"
							type="email"
							autoComplete="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							onBlur={handleEmailBlur}
							aria-describedby={emailError ? 'email-error' : undefined}
							aria-invalid={emailError ? 'true' : undefined}
							disabled={isLoading}
							className={[
								'w-full rounded-md border bg-background px-4 py-2 text-base',
								'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
								emailError ? 'border-destructive focus:ring-destructive' : 'border-input',
							].join(' ')}
						/>
						{emailError && (
							<p id="email-error" className="text-sm text-destructive">
								{emailError}
							</p>
						)}
					</div>

					{/* Password field */}
					<div className="space-y-1.5">
						<label htmlFor="password" className="text-sm font-semibold text-foreground">
							Password
						</label>
						<input
							id="password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							disabled={isLoading}
							className={[
								'w-full rounded-md border bg-background px-4 py-2 text-base',
								'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
								'border-input',
							].join(' ')}
						/>
					</div>

					{/* Form-level error (credential or network) */}
					{formError && (
						<p className="text-sm text-destructive" role="alert">
							{formError}
						</p>
					)}

					{/* Submit button */}
					<button
						type="submit"
						disabled={isLoading || !isFormValid}
						className={[
							'w-full rounded-md bg-primary text-primary-foreground',
							'px-4 py-2.5 text-base font-semibold min-h-[44px]',
							'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
							'disabled:opacity-50 disabled:cursor-not-allowed',
							'hover:bg-primary/90 transition-colors',
						].join(' ')}
					>
						{isLoading ? (
							<span className="flex items-center justify-center gap-2">
								<svg
									className="h-4 w-4 animate-spin"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
									/>
								</svg>
								Signing in...
							</span>
						) : (
							'Sign In'
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
