#!/bin/bash
# scripts/test-concurrency.sh
#
# On-Spot Change 2 demonstration: fires two identical "save distribution"
# requests at the exact same instant, for a farmer/input-type combination
# that only has room for ONE of them to succeed. Confirms exactly one
# request is saved and the other is cleanly refused, with no duplicate
# ending up in the database.
#
# Usage:
#   1. In one terminal:  npm start
#   2. In another:       bash scripts/test-concurrency.sh
#
# Works the same way on Windows via Git Bash or WSL.

FARMER_ID="F${RANDOM}"
URL="http://localhost:3000/api/records"
PAYLOAD='{"farmer_id":"'"$FARMER_ID"'","farmer_name":"Concurrency Test","phone_number":"9000000001","village":"Natham","input_type":"Paddy Seed","entitlement_qty":20,"issued_qty":20,"issue_date":"2026-07-15"}'

echo "Firing two simultaneous requests for a fresh farmer_id ($FARMER_ID), entitlement 20 kg, each asking for the full 20 kg..."
echo

curl -s -w "\n[REQUEST A] HTTP %{http_code}\n" -X POST "$URL" -H "Content-Type: application/json" -d "$PAYLOAD" > /tmp/reqA.txt &
curl -s -w "\n[REQUEST B] HTTP %{http_code}\n" -X POST "$URL" -H "Content-Type: application/json" -d "$PAYLOAD" > /tmp/reqB.txt &
wait

echo "--- Request A result ---"
cat /tmp/reqA.txt
echo
echo "--- Request B result ---"
cat /tmp/reqB.txt
echo
echo "--- Final database state for $FARMER_ID (should show exactly ONE record) ---"
curl -s "http://localhost:3000/api/records?search=$FARMER_ID"
echo
echo
echo "Expected: one request returns HTTP 201 (saved), the other returns HTTP 409"
echo "(refused, entitlement already fully drawn), and the final list shows exactly one record."
