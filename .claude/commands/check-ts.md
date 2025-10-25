# TypeScript Compilation Checking for SeatKit

When you make changes to the codebase, you must check the TypeScript compilation status following these rules:

## Usage

1. **Use the automated script** to check TS compilation across tracked packages:
   ```bash
   .claude/commands/utils/check-tsc-output.sh
   ```

2. **Wait for ongoing compilation**: When you execute the script and see that a compilation is still ongoing, wait for a few seconds and check the output of the script again.

3. **Manual checking for untracked packages**: If you are making changes to a package for which no information is returned from the script, run TSC manually for that package and let the user know by showing this warning:
   ```
   ⚠️  WARNING: This package is not covered by the automated TS check script.
   Running manual TypeScript compilation check for this package only.
   Consider adding this package to the automated checking script if it should be included.
   ```

## Initial Setup

Before continuing with any TypeScript changes:
1. Execute the script to verify it works correctly
2. Confirm you are starting from a point with no compilation errors
3. Explain to the user which packages are being monitored by the script

## Currently Monitored Packages

The script currently monitors TypeScript compilation for these packages:
- **@seatkit/types** - Core type definitions and Zod schemas

As more packages are developed with TypeScript code, add them to the `TSC_PACKAGES` array in the script.

## Configuration

You can customize the behavior with environment variables:

- `CLAUDE_IGNORE_TS_ERRORS` - Set to any value to disable TypeScript checking
- `CLAUDE_TSC_SESSION_NAME` - Custom tmux session name (default: `seatkit-ts`)
- `CLAUDE_TSC_TIMEOUT` - Timeout in seconds for initial compilation (default: 120)

## Requirements

- **tmux** must be installed on your system
- Each monitored package must have a `typecheck:watch` script in its package.json
- The script uses `pnpm` as the package manager

## How It Works

1. Creates or reuses a tmux session with a dedicated "tsc" window
2. Runs `pnpm run typecheck:watch` in each monitored package (one pane per package)
3. Monitors the output of each watcher for compilation errors
4. Returns exit code 0 if all packages have no errors, exit code 2 if errors are found

## Adding New Packages

When a new package with TypeScript code is created:

1. Ensure the package has these scripts in its `package.json`:
   ```json
   {
     "scripts": {
       "typecheck": "tsc --noEmit",
       "typecheck:watch": "tsc --noEmit --watch"
     }
   }
   ```

2. Add the package name to `TSC_PACKAGES` array in `.claude/commands/utils/check-tsc-output.sh`:
   ```bash
   TSC_PACKAGES=(
       "types"
       "your-new-package"
   )
   ```

3. Ensure the turbo.json includes the `typecheck` and `typecheck:watch` tasks
