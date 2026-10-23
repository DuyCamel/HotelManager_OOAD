#!/usr/bin/env bash
# Kiểm tra JDBC với cấu hình local, không thay đường chạy ứng dụng hiện tại.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/build.sh
java -cp "build/backend:backend/database/lib/*:lib/*" vn.hotel.infrastructure.database.DatabaseConnectionCheck "${1:-backend/database/config/database.properties}"
