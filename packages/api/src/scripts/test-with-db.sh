#!/bin/bash

# Run tests with database credentials from Google Secret Manager
# This script fetches the test database URL from Secret Manager and runs tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if GOOGLE_CLOUD_PROJECT is set
if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
    echo -e "${RED}❌ GOOGLE_CLOUD_PROJECT environment variable is required${NC}"
    echo "Set it with: export GOOGLE_CLOUD_PROJECT=your-project-id"
    exit 1
fi

echo -e "${GREEN}🔐 Fetching test database credentials from Secret Manager...${NC}"

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" > /dev/null 2>&1; then
    echo -e "${RED}❌ Not authenticated with Google Cloud${NC}"
    echo "Run: gcloud auth application-default login"
    exit 1
fi

# Fetch the test database URL from Secret Manager
# Note: Using seatkit-dev-database-url for now as we don't have a separate test database
# In production, you should have a separate test database secret
SECRET_NAME="seatkit-dev-database-url"

echo -e "${YELLOW}📊 Fetching secret: ${SECRET_NAME}${NC}"

if ! TEST_DATABASE_URL=$(gcloud secrets versions access latest --secret="$SECRET_NAME" 2>/dev/null); then
    echo -e "${RED}❌ Failed to fetch secret: ${SECRET_NAME}${NC}"
    echo "Make sure the secret exists in Secret Manager"
    echo "Run: pnpm secrets:setup"
    exit 1
fi

echo -e "${GREEN}✅ Successfully fetched database credentials${NC}"

# Run database migrations for test environment
echo -e "${YELLOW}📊 Running test database migrations...${NC}"
export NODE_ENV=test
export TEST_DATABASE_URL="$TEST_DATABASE_URL"

if pnpm db:migrate:test; then
    echo -e "${GREEN}✅ Test database migrations completed${NC}"
else
    echo -e "${RED}❌ Test database migrations failed${NC}"
    exit 1
fi

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
pnpm test

echo -e "${GREEN}✅ Tests completed successfully${NC}"
