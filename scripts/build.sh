#!/usr/bin/env bash
# Biên dịch backend trước, frontend chỉ phụ thuộc đầu ra backend.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v javac >/dev/null || { echo "Cần JDK 17+ (có javac), không chỉ JRE."; exit 1; }
mkdir -p build/backend build/frontend build/test
find backend/src/main/java -name '*.java' > build/backend-sources.txt
javac -encoding UTF-8 --release 17 -d build/backend @build/backend-sources.txt
find frontend/src/main/java -name '*.java' > build/frontend-sources.txt
javac -encoding UTF-8 --release 17 -cp build/backend -d build/frontend @build/frontend-sources.txt
echo 'Biên dịch thành công.'
