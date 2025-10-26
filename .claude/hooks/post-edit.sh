#!/bin/bash
set -euo pipefail

# Hook script for automatic eslint fix on file changes

# Opt out by setting CLAUDE_SKIP_ESLINT to true
if [ "${CLAUDE_SKIP_ESLINT:-false}" = "true" ]; then
    exit 0
fi


# Check for required dependencies
if ! command -v jq >/dev/null 2>&1; then
    echo "❌ Error: jq is required but not installed." >&2
    echo "   Install with: brew install jq (macOS) or apt-get install jq (Linux)" >&2
    exit 1
fi

# Determine project directory with fallback to git root
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"

if [ -z "$PROJECT_DIR" ] || [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Unable to determine project directory. Ensure you're in a git repository." >&2
    exit 1
fi

# Read claude code input with timeout to prevent hanging (macOS compatible)
if command -v timeout >/dev/null 2>&1; then
    # Use timeout if available (Linux)
    if ! INPUT=$(timeout 5 cat 2>/dev/null); then
        exit 0
    fi
else
    # Fallback for macOS - read with a simple approach
    INPUT=$(cat 2>/dev/null || echo "")
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
FILE_PATH=$(realpath "$FILE_PATH")

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

RELATIVE_PATH=$(echo "$FILE_PATH" | sed "s|$PROJECT_DIR/||")

# Only process TypeScript/JavaScript files
if ! [[ "$RELATIVE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
    exit 0
fi

# Walk up directories to find nearest package.json
# Safety: Never go above PROJECT_DIR
find_package_root() {
    local current_dir="$(dirname "$FILE_PATH")"

    # Walk up until we find package.json or hit project root
    while [[ "$current_dir" != "$PROJECT_DIR" ]] && [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/package.json" ]]; then
            echo "$current_dir"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done

    # Check project root itself
    if [[ -f "$PROJECT_DIR/package.json" ]]; then
        echo "$PROJECT_DIR"
        return 0
    fi

    # No package.json found
    return 1
}

PACKAGE_DIR=$(find_package_root)

# If no package.json found, skip linting
if [ -z "$PACKAGE_DIR" ]; then
    exit 0
fi

PACKAGE_RELATIVE=$(echo "$PACKAGE_DIR" | sed "s|$PROJECT_DIR/||")

# Navigate to package directory
cd "$PACKAGE_DIR" || exit 1


# Run eslint with auto-fix on the changed file, silencing errors to avoid polluting claude context
pnpm exec eslint --cache --fix "$FILE_PATH" 2>/dev/null || true