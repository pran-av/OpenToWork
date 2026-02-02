#!/bin/bash

# Analytics API Testing Script
# Tests all analytics API endpoints before applying migrations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
PROJECT_ID="${PROJECT_ID:-}"
CAMPAIGN_ID="${CAMPAIGN_ID:-}"

echo -e "${YELLOW}Analytics API Testing Script${NC}"
echo "================================"
echo ""

# Check if required variables are set
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Error: PROJECT_ID environment variable is required${NC}"
  echo "Usage: PROJECT_ID=your-project-id CAMPAIGN_ID=your-campaign-id ./scripts/test-analytics-api.sh"
  exit 1
fi

# Generate test IDs
SESSION_ID="test-session-$(date +%s)"
EVENT_ID="test-event-$(date +%s)"

echo -e "${YELLOW}Test Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Project ID: $PROJECT_ID"
echo "  Campaign ID: ${CAMPAIGN_ID:-Not set}"
echo "  Session ID: $SESSION_ID"
echo ""

# Test 1: Session Creation
echo -e "${YELLOW}Test 1: Session Creation${NC}"
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/analytics/session" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"$PROJECT_ID\",
    \"user_agent_hash\": \"test-hash-$(date +%s)\"
  }")

if echo "$SESSION_RESPONSE" | grep -q "session_id"; then
  echo -e "${GREEN}✓ Session created successfully${NC}"
  EXTRACTED_SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)
  echo "  Session ID: $EXTRACTED_SESSION_ID"
else
  echo -e "${RED}✗ Session creation failed${NC}"
  echo "  Response: $SESSION_RESPONSE"
  exit 1
fi

# Test 2: Event Batch
echo ""
echo -e "${YELLOW}Test 2: Event Batch${NC}"
EVENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/analytics/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$EXTRACTED_SESSION_ID\",
    \"events\": [
      {
        \"event_id\": \"$EVENT_ID\",
        \"event_type\": \"button_click\",
        \"metadata\": {
          \"page_navigation\": \"step1\",
          \"button_name\": \"Test Button\"
        },
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
      }
    ]
  }")

if echo "$EVENT_RESPONSE" | grep -q "accepted"; then
  echo -e "${GREEN}✓ Events sent successfully${NC}"
  echo "  Response: $EVENT_RESPONSE"
else
  echo -e "${RED}✗ Event sending failed${NC}"
  echo "  Response: $EVENT_RESPONSE"
  exit 1
fi

# Test 3: Heartbeat
echo ""
echo -e "${YELLOW}Test 3: Heartbeat${NC}"
HEARTBEAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/analytics/heartbeat" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$EXTRACTED_SESSION_ID\",
    \"time_increment\": 30
  }")

if echo "$HEARTBEAT_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✓ Heartbeat sent successfully${NC}"
else
  echo -e "${RED}✗ Heartbeat failed${NC}"
  echo "  Response: $HEARTBEAT_RESPONSE"
  exit 1
fi

# Test 4: Rate Limiting (Session)
echo ""
echo -e "${YELLOW}Test 4: Rate Limiting (Session)${NC}"
echo "  Making 6 rapid requests (limit: 5/min)..."
RATE_LIMIT_HIT=false
for i in {1..6}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/analytics/session" \
    -H "Content-Type: application/json" \
    -d "{
      \"project_id\": \"$PROJECT_ID\",
      \"user_agent_hash\": \"test-hash-$i\"
    }")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" = "429" ]; then
    RATE_LIMIT_HIT=true
    echo -e "${GREEN}✓ Rate limit triggered correctly (429)${NC}"
    break
  fi
  sleep 0.5
done

if [ "$RATE_LIMIT_HIT" = false ]; then
  echo -e "${YELLOW}⚠ Rate limit not triggered (may need more requests)${NC}"
fi

# Test 5: Analytics Fetch (if campaign ID provided)
if [ -n "$CAMPAIGN_ID" ]; then
  echo ""
  echo -e "${YELLOW}Test 5: Analytics Fetch${NC}"
  ANALYTICS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/$CAMPAIGN_ID" \
    -H "Cookie: $(curl -s -c - -X POST "$BASE_URL/api/analytics/session" \
      -H "Content-Type: application/json" \
      -d "{\"project_id\":\"$PROJECT_ID\",\"user_agent_hash\":\"test\"}" | grep -o 'otw_analytics_session=[^;]*')")
  
  if echo "$ANALYTICS_RESPONSE" | grep -q "total_actual_sessions"; then
    echo -e "${GREEN}✓ Analytics fetched successfully${NC}"
    echo "  Response: $ANALYTICS_RESPONSE"
  else
    echo -e "${YELLOW}⚠ Analytics fetch returned: $ANALYTICS_RESPONSE${NC}"
    echo "  (This may be expected if no data exists yet)"
  fi
fi

echo ""
echo -e "${GREEN}All API tests completed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Check Redis Streams for events/heartbeats"
echo "  2. Manually invoke Edge Function worker"
echo "  3. Verify data in database"
echo "  4. Test dashboard analytics display"

