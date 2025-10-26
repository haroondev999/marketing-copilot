#!/bin/bash

set -e

echo "🧪 Running Production Readiness Tests..."
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1. Validating environment variables..."
if npm run validate:env > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Environment variables valid${NC}"
else
    echo -e "${RED}❌ Environment validation failed${NC}"
    exit 1
fi

echo ""
echo "2. Running security checks..."

if grep -r "localStorage" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -v "// OK:" | grep -v "use-toast"; then
    echo -e "${RED}❌ Found localStorage usage${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No localStorage usage${NC}"
fi

if grep -rE "(sk-[a-zA-Z0-9]{20,}|pk_[a-zA-Z0-9]{20,})" src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo -e "${RED}❌ Found hardcoded secrets${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No hardcoded secrets${NC}"
fi

echo ""
echo "3. Checking for vulnerable dependencies..."
if npm audit --audit-level=high > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No high/critical vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠️  Vulnerabilities found, run 'npm audit' for details${NC}"
fi

echo ""
echo "4. Testing build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""
echo "5. Running TypeScript checks..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No TypeScript errors${NC}"
else
    echo -e "${RED}❌ TypeScript errors found${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Production readiness check complete!${NC}"
echo "========================================"
