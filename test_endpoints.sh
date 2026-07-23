#!/bin/bash

# Backend API endpoint testing script
BASE_URL="http://127.0.0.1:8000/api"

echo "=== Testing Backend API Endpoints ==="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local method=$2
    local expected_status=$3
    
    echo -n "Testing $method $endpoint... "
    
    if [ "$method" = "GET" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL$endpoint" -H "Content-Type: application/json")
    fi
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $status)"
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status)"
    fi
}

# Test Accounts endpoints
echo "=== Accounts Endpoints ==="
test_endpoint "/accounts/user/" "GET" "401"
test_endpoint "/accounts/login/" "POST" "400"  # Will fail without credentials
test_endpoint "/accounts/registration/" "POST" "400"  # Will fail without data
test_endpoint "/accounts/logout/" "POST" "401"
test_endpoint "/accounts/manager-request/" "GET" "401"
test_endpoint "/accounts/manager-request/" "POST" "401"

echo ""
echo "=== Management/Projects Endpoints ==="
test_endpoint "/management/projects/" "GET" "401"
test_endpoint "/management/projects/?my_projects=true" "GET" "401"

echo ""
echo "=== Management/Applications Endpoints ==="
test_endpoint "/management/applications/" "GET" "401"
test_endpoint "/management/received-applications/" "GET" "401"

echo ""
echo "=== Webhook Endpoint ==="
test_endpoint "/management/webhooks/github/" "POST" "400"  # Returns 400 without proper webhook data

echo ""
echo "=== Testing with nested routes (should return 401 or 404) ==="
test_endpoint "/management/projects/test-project/" "GET" "401"
test_endpoint "/management/projects/test-project/tasks/" "GET" "401"
test_endpoint "/management/projects/test-project/applications/" "GET" "401"
test_endpoint "/management/projects/test-project/departments/" "GET" "401"
test_endpoint "/management/projects/test-project/tasks/test-task/comments/" "GET" "401"
test_endpoint "/management/projects/test-project/departments/test-dept/members/" "GET" "401"  # Now requires authentication

echo ""
echo "=== Testing received applications actions ==="
test_endpoint "/management/received-applications/test-app/accept/" "PATCH" "401"  # Now requires authentication
test_endpoint "/management/received-applications/test-app/reject/" "PATCH" "401"  # Now requires authentication

echo ""
echo "=== Testing task actions ==="
test_endpoint "/management/projects/test-project/tasks/test-task/complete/" "PATCH" "401"  # Now requires authentication

echo ""
echo "=== Endpoint Testing Complete ==="