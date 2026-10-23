#!/usr/bin/env bash
# Chạy kiểm thử tích hợp backend, không cần tải JUnit.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/build.sh
find backend/src/test/java -name '*.java' > build/test-sources.txt
javac -encoding UTF-8 --release 17 -cp build/backend -d build/test @build/test-sources.txt
java -cp build/backend:build/test vn.hotel.BackendWorkflowTest

java -cp build/backend:build/test vn.hotel.DatabaseConfigTest
