#!/usr/bin/env bash
# Biên dịch theo chiều phụ thuộc: common -> database -> service -> frontend.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v javac >/dev/null || { echo "Cần JDK 17+ (có javac), không chỉ JRE."; exit 1; }
mkdir -p build/backend build/frontend
# Xóa class cũ để việc tách module không bị che lỗi bởi đầu ra lần trước.
find build/backend build/frontend -name '*.class' -delete
for module in common database service; do
  find "backend/$module/src/main/java" -name '*.java' > "build/$module-sources.txt"
  javac -encoding UTF-8 --release 17 -cp build/backend -d build/backend "@build/$module-sources.txt"
done
find frontend/src/main/java -name '*.java' > build/frontend-sources.txt
javac -encoding UTF-8 --release 17 -cp build/backend -d build/frontend @build/frontend-sources.txt
echo 'Biên dịch thành công: common -> database -> service -> frontend.'
