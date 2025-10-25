#!/usr/bin/env bash
#
# Claude Code Post-Edit Hook
# Runs after every file edit to catch errors immediately
#
# This hook:
# 1. Runs ESLint on edited files
# 2. Runs TypeScript type checking
# 3. Shows errors inline for Claude to fix
#

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get the edited file from Claude's environment
EDITED_FILE="${CLAUDE_EDITED_FILE:-$1}"

if [ -z "$EDITED_FILE" ]; then
  echo -e "${YELLOW}⚠️  No file specified for post-edit hook${NC}"
  exit 0
fi

echo -e "${GREEN}🔍 Checking: ${EDITED_FILE}${NC}"

# Only run on TypeScript files
if [[ "$EDITED_FILE" =~ \.(ts|tsx)$ ]]; then

  # Determine which package the file belongs to
  PACKAGE_DIR=""
  if [[ "$EDITED_FILE" =~ packages/([^/]+)/ ]]; then
    PACKAGE_NAME="${BASH_REMATCH[1]}"
    PACKAGE_DIR="packages/$PACKAGE_NAME"
  fi

  # Run ESLint on the edited file
  echo -e "${YELLOW}📋 Running ESLint...${NC}"
  if [ -n "$PACKAGE_DIR" ] && [ -d "$PACKAGE_DIR" ]; then
    cd "$PACKAGE_DIR"
    pnpm exec eslint "$EDITED_FILE" --max-warnings 0 2>&1 || {
      echo -e "${RED}❌ ESLint found issues${NC}"
      exit 1
    }
    cd - > /dev/null
  else
    pnpm exec eslint "$EDITED_FILE" --max-warnings 0 2>&1 || {
      echo -e "${RED}❌ ESLint found issues${NC}"
      exit 1
    }
  fi

  # TypeScript type checking happens in watch mode, so we just report success
  echo -e "${GREEN}✅ ESLint passed${NC}"
  echo -e "${YELLOW}💡 Check your tsc --watch terminal for type errors${NC}"

else
  echo -e "${YELLOW}⏭️  Skipping checks (not a TypeScript file)${NC}"
fi

exit 0
