#!/bin/bash

# Validate Agent Plugin Secrets
# Purpose: Check that all agents have required credentials provisioned before assignment
# Usage: ./scripts/validate-agent-plugin-secrets.sh [company-id] [optional: agent-id]

set -e

API_URL="${PAPERCLIP_API_URL:-http://localhost:3100}"
AUTH_KEY="${PAPERCLIP_API_KEY:-test-key}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
COMPANY_ID="${1}"
AGENT_ID="${2}"

if [ -z "$COMPANY_ID" ]; then
  echo "Usage: $0 <company-id> [optional: agent-id]"
  echo ""
  echo "Example:"
  echo "  $0 bf8c322a-ed79-4421-9fff-b4be5ee9a148"
  echo "  $0 bf8c322a-ed79-4421-9fff-b4be5ee9a148 30032683-ee3a-404c-ad3c-48d676f931a5"
  exit 1
fi

echo "=========================================================================="
echo "AGENT PLUGIN SECRETS VALIDATION"
echo "=========================================================================="
echo "Company: $COMPANY_ID"
echo "API: $API_URL"
echo ""

# Fetch all secrets in company
echo "Fetching company secrets..."
SECRETS=$(curl -s "$API_URL/api/companies/$COMPANY_ID/secrets" \
  -H "Authorization: Bearer $AUTH_KEY")

if [ -z "$SECRETS" ]; then
  echo -e "${RED}✗ Failed to fetch secrets${NC}"
  exit 1
fi

# Extract secret mappings
TAVILY_ID=$(echo "$SECRETS" | jq -r '.[] | select(.name == "tavily_api_key") | .id' 2>/dev/null || echo "")
BITLY_ID=$(echo "$SECRETS" | jq -r '.[] | select(.name == "bitly_access_token") | .id' 2>/dev/null || echo "")
X_BEARER_ID=$(echo "$SECRETS" | jq -r '.[] | select(.name == "x_bearer_token") | .id' 2>/dev/null || echo "")
SLACK_ID=$(echo "$SECRETS" | jq -r '.[] | select(.name == "slack_webhook_url") | .id' 2>/dev/null || echo "")

echo -e "${GREEN}✓ Secrets found:${NC}"
[ -n "$TAVILY_ID" ] && echo "  • tavily_api_key: $TAVILY_ID" || echo "  • tavily_api_key: ${RED}NOT FOUND${NC}"
[ -n "$BITLY_ID" ] && echo "  • bitly_access_token: $BITLY_ID" || echo "  • bitly_access_token: ${RED}NOT FOUND${NC}"
[ -n "$X_BEARER_ID" ] && echo "  • x_bearer_token: $X_BEARER_ID" || echo "  • x_bearer_token: ${RED}NOT FOUND${NC}"
[ -n "$SLACK_ID" ] && echo "  • slack_webhook_url: $SLACK_ID" || echo "  • slack_webhook_url: ${RED}NOT FOUND${NC}"
echo ""

# Fetch agents
echo "Fetching agents..."
AGENTS=$(curl -s "$API_URL/api/companies/$COMPANY_ID/agents" \
  -H "Authorization: Bearer $AUTH_KEY")

if [ -z "$AGENTS" ]; then
  echo -e "${RED}✗ Failed to fetch agents${NC}"
  exit 1
fi

# Filter by specific agent if provided
if [ -n "$AGENT_ID" ]; then
  AGENTS=$(echo "$AGENTS" | jq "[.[] | select(.id == \"$AGENT_ID\")]")
fi

AGENT_COUNT=$(echo "$AGENTS" | jq 'length')
echo -e "${GREEN}✓ Found $AGENT_COUNT agent(s)${NC}"
echo ""

# Check each agent
PASSED=0
FAILED=0
WARNINGS=0

echo "=========================================================================="
echo "AGENT CONFIGURATION AUDIT"
echo "=========================================================================="
echo ""

echo "$AGENTS" | jq -c '.[]' | while read -r AGENT; do
  AGENT_ID=$(echo "$AGENT" | jq -r '.id')
  AGENT_NAME=$(echo "$AGENT" | jq -r '.name')
  AGENT_ROLE=$(echo "$AGENT" | jq -r '.role')
  ADAPTER_CONFIG=$(echo "$AGENT" | jq '.adapterConfig // {}')
  ENV_CONFIG=$(echo "$ADAPTER_CONFIG" | jq '.env // {}')
  
  echo -e "${BLUE}Agent: $AGENT_NAME ($AGENT_ROLE) [${AGENT_ID:0:8}...]${NC}"
  
  # Check if env has any secrets
  ENV_KEYS=$(echo "$ENV_CONFIG" | jq 'keys[]' -r | grep -E "TAVILY|BITLY|X_BEARER|SLACK" || true)
  
  if [ -z "$ENV_KEYS" ]; then
    echo -e "  ${YELLOW}⚠ No plugin secrets configured${NC}"
    ((WARNINGS++))
  else
    # List configured secrets
    echo "  Configured secrets:"
    echo "$ENV_CONFIG" | jq -c 'to_entries[] | select(.value | type == "object" and .type == "secret_ref")' | while read -r ENTRY; do
      KEY=$(echo "$ENTRY" | jq -r '.key')
      SECRET_ID=$(echo "$ENTRY" | jq -r '.value.secretId')
      echo "    • $KEY → $SECRET_ID"
    done
  fi
  
  # Check for common issues
  ISSUES=()
  
  # If instructions mention web-search/tavily, check for TAVILY_API_KEY
  if [ -f "/Users/home/.paperclip/instances/default/companies/$COMPANY_ID/agents/$AGENT_ID/instructions/AGENTS.md" ]; then
    INSTRUCTIONS=$(cat "/Users/home/.paperclip/instances/default/companies/$COMPANY_ID/agents/$AGENT_ID/instructions/AGENTS.md")
    
    if echo "$INSTRUCTIONS" | grep -qi "web-search\|tavily"; then
      TAVILY_IN_ENV=$(echo "$ENV_CONFIG" | jq 'keys | index("TAVILY_API_KEY")' || echo "null")
      if [ "$TAVILY_IN_ENV" == "null" ]; then
        ISSUES+=("${RED}✗ Instructions mention web-search/tavily but TAVILY_API_KEY not in env${NC}")
        ((FAILED++))
      fi
    fi
    
    if echo "$INSTRUCTIONS" | grep -qi "x-api\|twitter\|x\.com"; then
      X_IN_ENV=$(echo "$ENV_CONFIG" | jq 'keys | index("X_BEARER_TOKEN")' || echo "null")
      if [ "$X_IN_ENV" == "null" ]; then
        ISSUES+=("${RED}✗ Instructions mention X/Twitter but X_BEARER_TOKEN not in env${NC}")
        ((FAILED++))
      fi
    fi
    
    if echo "$INSTRUCTIONS" | grep -qi "bitly\|shortlink\|link\."; then
      BITLY_IN_ENV=$(echo "$ENV_CONFIG" | jq 'keys | index("BITLY_ACCESS_TOKEN")' || echo "null")
      if [ "$BITLY_IN_ENV" == "null" ]; then
        ISSUES+=("${RED}✗ Instructions mention bitly but BITLY_ACCESS_TOKEN not in env${NC}")
        ((FAILED++))
      fi
    fi
    
    if echo "$INSTRUCTIONS" | grep -qi "slack"; then
      SLACK_IN_ENV=$(echo "$ENV_CONFIG" | jq 'keys | index("SLACK_WEBHOOK_URL")' || echo "null")
      if [ "$SLACK_IN_ENV" == "null" ]; then
        ISSUES+=("${RED}✗ Instructions mention Slack but SLACK_WEBHOOK_URL not in env${NC}")
        ((FAILED++))
      fi
    fi
  fi
  
  if [ ${#ISSUES[@]} -gt 0 ]; then
    for ISSUE in "${ISSUES[@]}"; do
      echo "  $ISSUE"
    done
  else
    echo -e "  ${GREEN}✓ Configuration looks good${NC}"
    ((PASSED++))
  fi
  
  echo ""
done

# Summary
echo "=========================================================================="
echo "SUMMARY"
echo "=========================================================================="
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
[ $WARNINGS -gt 0 ] && echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
[ $FAILED -gt 0 ] && echo -e "${RED}✗ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}ACTION REQUIRED:${NC}"
  echo "1. Open failing agent's AGENTS.md"
  echo "2. Add missing secrets to adapterConfig.env section"
  echo "3. Reference secret IDs from company secrets list above"
  echo "4. Test by manually triggering a run"
  exit 1
else
  echo -e "${GREEN}All agents are ready!${NC}"
  exit 0
fi
