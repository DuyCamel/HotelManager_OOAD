#!/usr/bin/env bash
# Kiểm thử mở giao diện, cần desktop hoặc X server trong DISPLAY.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/build.sh
find frontend/src/test/java -name '*.java' > build/ui-test-sources.txt
javac -encoding UTF-8 --release 17 -cp build/backend:build/frontend -d build/test @build/ui-test-sources.txt
java -cp build/backend:build/frontend:build/test vn.hotel.FrontendSmokeTest
