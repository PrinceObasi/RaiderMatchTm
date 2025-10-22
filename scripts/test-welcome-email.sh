#!/bin/bash

# Test script for welcome email system
# Usage: ./scripts/test-welcome-email.sh email@example.com "Student Name"

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Error: Email address required${NC}"
    echo "Usage: ./scripts/test-welcome-email.sh email@example.com \"Student Name\""
    exit 1
fi

EMAIL="$1"
NAME="${2:-Student}"

echo -e "${YELLOW}Testing welcome email system...${NC}"
echo ""
echo "Recipient: $EMAIL"
echo "Name: $NAME"
echo ""

# Get HOOK_SECRET from environment or prompt
if [ -z "$HOOK_SECRET" ]; then
    read -sp "Enter HOOK_SECRET: " HOOK_SECRET
    echo ""
fi

# Project configuration
PROJECT_REF="tjahvypvfrjulnqmnhsh"
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/send-welcome"

echo "Calling function: $FUNCTION_URL"
echo ""

# Make the request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "x-hook-secret: $HOOK_SECRET" \
  -d "{\"to\":\"$EMAIL\",\"name\":\"$NAME\"}")

# Split response and status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

echo "Response Status: $HTTP_STATUS"
echo "Response Body: $HTTP_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Email sent successfully!${NC}"
    echo ""
    echo "Check your inbox at: $EMAIL"
    echo "Also check the Resend dashboard: https://resend.com/emails"
    exit 0
else
    echo -e "${RED}✗ Failed to send email${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. HOOK_SECRET incorrect or not set"
    echo "  2. RESEND_API_KEY not configured"
    echo "  3. Email domain not verified in Resend"
    echo "  4. verify_jwt = false not set in config.toml"
    echo ""
    echo "Check function logs:"
    echo "  https://supabase.com/dashboard/project/$PROJECT_REF/functions/send-welcome/logs"
    exit 1
fi