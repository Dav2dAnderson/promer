#!/bin/bash

# Test new security endpoints with authentication
BASE_URL="http://127.0.0.1:8000/api"

echo "=== Testing New Security Endpoints ==="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test user credentials
TEST_USERNAME="testuser_$(date +%s)"
TEST_PASSWORD="TestPassword123!"
TEST_EMAIL="${TEST_USERNAME}@example.com"

echo "Creating test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/accounts/registration/" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"email\": \"$TEST_EMAIL\",
    \"password1\": \"$TEST_PASSWORD\",
    \"password2\": \"$TEST_PASSWORD\",
    \"first_name\": \"Test\",
    \"last_name\": \"User\",
    \"phone_number\": \"1234567890\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q "key\|access"; then
  echo -e "${GREEN}✓ User registered successfully${NC}"
else
  echo -e "${RED}✗ User registration failed${NC}"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo ""
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/accounts/login/" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\"
  }")

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)

if [ -n "$ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo "=== Testing that new endpoints require authentication ==="

# Test without authentication
echo -n "Testing PATCH /management/received-applications/test/accept/ without auth... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/management/received-applications/test/accept/")
if [ "$STATUS" = "401" ]; then
  echo -e "${GREEN}✓ PASS${NC} (Status: $STATUS)"
else
  echo -e "${RED}✗ FAIL${NC} (Expected: 401, Got: $STATUS)"
fi

echo -n "Testing PATCH /management/received-applications/test/reject/ without auth... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/management/received-applications/test/reject/")
if [ "$STATUS" = "401" ]; then
  echo -e "${GREEN}✓ PASS${NC} (Status: $STATUS)"
else
  echo -e "${RED}✗ FAIL${NC} (Expected: 401, Got: $STATUS)"
fi

echo -n "Testing PATCH /management/projects/test/tasks/test/complete/ without auth... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/management/projects/test/tasks/test/complete/")
if [ "$STATUS" = "401" ]; then
  echo -e "${GREEN}✓ PASS${NC} (Status: $STATUS)"
else
  echo -e "${RED}✗ FAIL${NC} (Expected: 401, Got: $STATUS)"
fi

echo -n "Testing GET /management/projects/test/departments/test/members/ without auth... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/management/projects/test/departments/test/members/")
if [ "$STATUS" = "401" ]; then
  echo -e "${GREEN}✓ PASS${NC} (Status: $STATUS)"
else
  echo -e "${RED}✗ FAIL${NC} (Expected: 401, Got: $STATUS)"
fi

echo ""
echo "=== Testing new reject endpoint exists ==="

# Test with authentication (should return 404 for non-existent application)
echo -n "Testing PATCH /management/received-applications/test/reject/ with auth (should return 404)... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/management/received-applications/test/reject/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
if [ "$STATUS" = "404" ]; then
  echo -e "${GREEN}✓ PASS${NC} (Status: $STATUS - endpoint exists but application not found)"
else
  echo -e "${YELLOW}⚠ WARNING${NC} (Expected: 404, Got: $STATUS)"
fi

echo ""
echo "=== Testing that endpoints work with proper permissions ==="
echo "Note: These tests would require creating actual projects, applications, and tasks"
echo "with proper ownership relationships to fully test the permission logic."

echo ""
echo "=== Security Endpoint Testing Complete ==="