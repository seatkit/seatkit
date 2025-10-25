# Security Policy

Thank you for helping keep SeatKit and its users safe. We take security seriously and appreciate coordinated disclosure.

## Reporting a Vulnerability (private, non-public)

- Email: **security@seatkit.dev** (replace if different)
- Or use GitHub’s **“Report a vulnerability”** from the repository’s _Security → Advisories_ tab.

Please include:

- A clear description of the issue and affected package(s)/version(s)
- Reproduction steps or a proof of concept
- Expected vs. actual behavior
- Impact assessment (what could an attacker achieve?)
- Any relevant logs, configs, or environment details

If you need encryption, send an email requesting our PGP key (or publish your key; we’ll reply encrypted).

## Triage & Response SLAs

- **Acknowledgement:** within **72 hours**
- **Initial assessment / severity assignment:** within **5 business days**
- **Fix window:** targeted within **90 days** of acknowledgement for High/Critical issues (earlier if feasible). Lower severities may ship in the next regular release.

We’ll keep you updated at key points (acknowledged → triaged → fix in progress → release).

## Supported Versions

We currently support and issue security fixes for:

- The **latest minor** in the current major (e.g., `0.x` latest)
- The **previous minor** (grace period) after a new minor is released

> Until 1.0, expect rapid iteration on `0.x`. We will always disclose which versions are affected in advisories.

## Coordinated Disclosure

Please do **not** open public issues or PRs for exploitable vulnerabilities.
We will:

1. Confirm and reproduce the issue.
2. Assign a severity (CVSS where applicable).
3. Prepare a fix and tests in a private branch.
4. Publish a release and a security advisory crediting you (unless you request anonymity).
5. Provide mitigation guidance if a fix cannot ship quickly.

## Scope / Out-of-Scope

**In scope**

- Vulnerabilities in SeatKit packages under the `@seatkit/*` scope
- Default configurations and example deployments in this repo

**Out of scope**

- Vulnerabilities that require root/admin or physical access
- Clickjacking or TLS config on non-production demo sites
- Third-party services unless clearly bundled and enabled by default
- Purely theoretical issues without a practical impact

## Safe Harbor

We will not pursue civil/criminal action or DMCA claims for good-faith research that:

- Avoids data exfiltration, privacy violations, or service degradation
- Respects rate limits and applicable laws
- Stops immediately upon request and reports promptly

If in doubt, contact **security@seatkit.dev** before you test.

## Credits

Security researchers are thanked in release notes and advisories. Let us know how you’d like to be credited.
