#!/bin/bash

# RaiderMatch Welcome Email Setup Script
# This script sets up the complete welcome email system

set -e

echo "🚀 RaiderMatch Welcome Email Setup"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"

# Project configuration
PROJECT_REF="tjahvypvfrjulnqmnhsh"
PROJECT_ID="tjahvypvfrjulnqmnhsh"

echo ""
echo "📋 Setup Checklist:"
echo "1. Deploy Edge Function"
echo "2. Set Supabase Secrets"
echo "3. Set Database Hook Secret"
echo "4. Apply Database Migration"
echo ""

# Step 1: Deploy Edge Function
echo -e "${YELLOW}Step 1: Deploying send-welcome edge function...${NC}"
supabase functions deploy send-welcome --project-ref $PROJECT_REF
echo -e "${GREEN}✓ Edge function deployed${NC}"
echo ""

# Step 2: Set Secrets
echo -e "${YELLOW}Step 2: Setting Supabase Secrets${NC}"
echo ""
echo "Please enter your secrets (they will be hidden):"
echo ""

read -sp "Enter RESEND_API_KEY: " RESEND_API_KEY
echo ""
read -sp "Enter HOOK_SECRET (or press enter to generate): " HOOK_SECRET
echo ""

# Generate hook secret if not provided
if [ -z "$HOOK_SECRET" ]; then
    HOOK_SECRET=$(openssl rand -hex 32)
    echo -e "${GREEN}✓ Generated random HOOK_SECRET${NC}"
fi

# Set secrets
supabase secrets set RESEND_API_KEY="$RESEND_API_KEY" --project-ref $PROJECT_REF
supabase secrets set HOOK_SECRET="$HOOK_SECRET" --project-ref $PROJECT_REF
echo -e "${GREEN}✓ Secrets configured in Supabase${NC}"
echo ""

# Step 3: Set Database Hook Secret
echo -e "${YELLOW}Step 3: Setting database hook secret...${NC}"
echo "This requires database password. Get it from:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo ""

# Create SQL file
cat > /tmp/set_hook_secret.sql <<EOF
alter database postgres set app.settings.hook_secret = '$HOOK_SECRET';
EOF

echo "Connecting to database..."
supabase db execute --project-ref $PROJECT_REF --file /tmp/set_hook_secret.sql

rm /tmp/set_hook_secret.sql
echo -e "${GREEN}✓ Database hook secret configured${NC}"
echo ""

# Step 4: Apply Migration
echo -e "${YELLOW}Step 4: Applying database migration...${NC}"
supabase db push --project-ref $PROJECT_REF
echo -e "${GREEN}✓ Migration applied${NC}"
echo ""

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "🎉 Welcome email system is now active!"
echo ""
echo "Test it with:"
echo "  ./scripts/test-welcome-email.sh your-email@ttu.edu \"Your Name\""
echo ""
echo "Important URLs:"
echo "  • Function logs: https://supabase.com/dashboard/project/$PROJECT_REF/functions/send-welcome/logs"
echo "  • Edge functions: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo "  • Resend dashboard: https://resend.com/emails"
echo ""