#!/bin/bash

# Authenticated endpoint testing script
BASE_URL="http://127.0.0.1:8000/api"

echo "=== Testing Authenticated API Endpoints ==="
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
echo "=== Testing Authenticated Endpoints ==="

# Function to test authenticated endpoint
test_auth_endpoint() {
    local endpoint=$1
    local method=$2
    local expected_status=$3
    
    echo -n "Testing $method $endpoint... "
    
    if [ "$method" = "GET" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" \
          -H "Authorization: Bearer $ACCESS_TOKEN")
    elif [ "$method" = "POST" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL$endpoint" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "Content-Type: application/json")
    elif [ "$method" = "PATCH" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL$endpoint" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "Content-Type: application/json")
    fi
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $status)"
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status)"
    fi
}

# Test authenticated accounts endpoints
echo "=== Authenticated Accounts Endpoints ==="
test_auth_endpoint "/accounts/user/" "GET" "200"
test_auth_endpoint "/accounts/manager-request/" "GET" "200"

echo ""
echo "=== Authenticated Management/Projects Endpoints ==="
test_auth_endpoint "/management/projects/" "GET" "200"
test_auth_endpoint "/management/projects/?my_projects=true" "GET" "200"

echo ""
echo "=== Authenticated Management/Applications Endpoints ==="
test_auth_endpoint "/management/applications/" "GET" "200"
test_auth_endpoint "/management/received-applications/" "GET" "200"

echo ""
echo "=== Testing Nested Routes (should return 404 or 200 with empty data) ==="
test_auth_endpoint "/management/projects/test-project/" "GET" "404"
test_auth_endpoint "/management/projects/test-project/tasks/" "GET" "404"
test_auth_endpoint "/management/projects/test-project/applications/" "GET" "404"
test_auth_endpoint "/management/projects/test-project/departments/" "GET" "404"

echo ""
echo "=== Testing with real project creation ==="
# Create a test project
CREATE_PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/management/projects/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Project\",
    \"description\": \"A test project for endpoint testing\",
    \"is_public\": true
  }")

PROJECT_SLUG=$(echo "$CREATE_PROJECT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('slug', ''))" 2>/dev/null)

if [ -n "$PROJECT_SLUG" ]; then
  echo -e "${GREEN}✓ Project created with slug: $PROJECT_SLUG${NC}"
  
  echo ""
  echo "=== Testing with real project ==="
  test_auth_endpoint "/management/projects/$PROJECT_SLUG/" "GET" "200"
  test_auth_endpoint "/management/projects/$PROJECT_SLUG/tasks/" "GET" "200"
  test_auth_endpoint "/management/projects/$PROJECT_SLUG/applications/" "GET" "200"
  test_auth_endpoint "/management/projects/$PROJECT_SLUG/departments/" "GET" "200"
  
  # Create a task
  CREATE_TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/management/projects/$PROJECT_SLUG/tasks/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Test Task\",
      \"description\": \"A test task for endpoint testing\"
    }")
  
  TASK_SLUG=$(echo "$CREATE_TASK_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('slug', ''))" 2>/dev/null)
  
  if [ -n "$TASK_SLUG" ]; then
    echo -e "${GREEN}✓ Task created with slug: $TASK_SLUG${NC}"
    test_auth_endpoint "/management/projects/$PROJECT_SLUG/tasks/$TASK_SLUG/" "GET" "200"
    test_auth_endpoint "/management/projects/$PROJECT_SLUG/tasks/$TASK_SLUG/comments/" "GET" "200"
  else
    echo -e "${YELLOW}⚠ Task creation failed${NC}"
  fi
  
  # Clean up - delete the project
  echo ""
  echo "Cleaning up test project..."
  DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/management/projects/$PROJECT_SLUG/" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  if [ "$DELETE_STATUS" = "204" ] || [ "$DELETE_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Test project deleted${NC}"
  else
    echo -e "${YELLOW}⚠ Could not delete test project (status: $DELETE_STATUS)${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Project creation failed${NC}"
  echo "Response: $CREATE_PROJECT_RESPONSE"
fi

echo ""
echo "=== Testing Logout ==="
LOGOUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/accounts/logout/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [ "$LOGOUT_STATUS" = "200" ] || [ "$LOGOUT_STATUS" = "204" ]; then
  echo -e "${GREEN}✓ Logout successful${NC}"
else
  echo -e "${YELLOW}⚠ Logout returned status: $LOGOUT_STATUS${NC}"
fi

echo ""
echo "=== Authenticated Endpoint Testing Complete ==="