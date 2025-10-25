# SeatKit Development Workflow

## 🔍 Quality Assurance Setup

This project uses automated linting and type checking to catch errors immediately during development.

### How It Works

1. **Claude Code Hook**: After every file edit, ESLint runs automatically via a post-edit hook
2. **TypeScript Watch**: Run `tsc --watch` in a separate terminal to see type errors in real-time
3. **Continuous Feedback**: Both systems run concurrently, catching issues as you code

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start TypeScript Watch Mode

Open a terminal and run:

```bash
# Watch all packages
pnpm typecheck --filter="@seatkit/*" --parallel

# Or watch specific package (recommended)
cd packages/types
pnpm typecheck:watch
```

Keep this terminal open! It will show TypeScript errors in real-time.

### 3. Start Coding

When you (or Claude) edit a file:

- ✅ **ESLint runs automatically** (via Claude Code hook)
- ✅ **TypeScript shows errors** in your watch terminal
- ✅ **Errors appear inline** for Claude to fix immediately

---

## 📋 ESLint Rules

### Type Safety (Errors)

- `no-unused-vars` - No unused variables/imports (prefix with `_` to ignore)
- `explicit-function-return-type` - All functions must have return types
- `explicit-module-boundary-types` - Exported functions must have return types
- `no-unsafe-assignment` - Prevent unsafe type assignments

### Promise Handling (Errors)

- `no-floating-promises` - All promises must be awaited or handled
- `await-thenable` - Only await actual promises
- `no-misused-promises` - Prevent promise bugs

### Code Style (Errors)

- `consistent-type-imports` - Use `import type` for types
- `consistent-type-definitions` - Prefer `type` over `interface`
- `import/order` - Consistent import ordering with groups

### Naming Conventions (Errors)

- Variables: `camelCase`, `UPPER_CASE` (constants), `PascalCase` (React components)
- Types: `PascalCase`
- Enum members: `UPPER_CASE`
- Functions: `camelCase`

### Warnings

- `no-explicit-any` - Avoid `any` types (use `unknown` instead)
- `no-non-null-assertion` - Avoid `!` operator
- `no-console` - Development only (error in production)

---

## 🛠 Manual Commands

### Linting

```bash
# Lint all packages
pnpm lint

# Lint and auto-fix
pnpm lint --fix

# Lint specific package
pnpm --filter @seatkit/types lint

# Production lint (stricter console rules)
pnpm --filter @seatkit/types lint:prod
```

### Type Checking

```bash
# Check all packages
pnpm typecheck

# Watch mode (recommended for development)
pnpm --filter @seatkit/types typecheck:watch
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @seatkit/types build
```

---

## 🔧 Hook Configuration

The post-edit hook is configured in `.claude/settings.local.json`:

```json
{
	"hooks": {
		"PostToolUse": [
			{
				"matcher": "Edit|Write",
				"hooks": [
					{
						"type": "command",
						"command": ".claude/hooks/post-edit.sh",
						"timeout": 30
					}
				]
			}
		]
	}
}
```

### Hook Behavior

- **Runs on**: Every `Edit` or `Write` tool use by Claude
- **Checks**: TypeScript files (`.ts`, `.tsx`)
- **Reports**: ESLint errors inline
- **Timeout**: 30 seconds per file
- **TypeScript**: Relies on `tsc --watch` terminal (not run in hook)

---

## 📊 Workflow Example

### Terminal Setup

```bash
# Terminal 1: TypeScript Watch
cd packages/types
pnpm typecheck:watch

# Terminal 2: Claude Code
claude-code
```

### Editing Flow

1. You/Claude edits `packages/types/src/schemas/reservation.ts`
2. **Hook triggers**: ESLint checks the file
3. **TypeScript watch**: Updates type errors in Terminal 1
4. **Claude sees**: Any ESLint errors inline
5. **You see**: Any TypeScript errors in Terminal 1
6. **Fix immediately**: Before moving to next file

---

## 🎯 Benefits

- ✅ **Catch errors immediately** - Before they compound
- ✅ **Type safety enforced** - No implicit `any`, explicit return types
- ✅ **Consistent code style** - Auto-formatted imports, naming
- ✅ **Promise safety** - No unhandled promises or async bugs
- ✅ **Fast feedback loop** - No need to wait for CI

---

## 🔍 Troubleshooting

### Hook Not Running

Check `.claude/settings.local.json` has the hooks configured properly.

### ESLint Errors Not Showing

1. Ensure dependencies are installed: `pnpm install`
2. Check the hook script is executable: `chmod +x .claude/hooks/post-edit.sh`
3. Test manually: `.claude/hooks/post-edit.sh packages/types/src/index.ts`

### TypeScript Errors Not Showing

1. Make sure `tsc --watch` is running in a terminal
2. Check `tsconfig.json` includes your files
3. Verify no `@ts-ignore` comments hiding errors

### False Positives

- **Unused vars**: Prefix with `_` (e.g., `_unusedParam`)
- **Any types**: Use `unknown` or proper types
- **Console logs**: OK in development, removed in production builds

---

## 📚 Additional Resources

- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/rules/)
- [Import Plugin](https://github.com/import-js/eslint-plugin-import)
- [Claude Code Hooks](https://docs.claude.com/en/docs/claude-code/hooks)
