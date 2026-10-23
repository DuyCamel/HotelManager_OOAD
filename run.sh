#!/usr/bin/env bash
# Chạy Java app trên Linux/macOS với JDK 17+.
set -euo pipefail
cd "$(dirname "$0")"
bash scripts/build.sh
java -cp build/backend:build/frontend vn.hotel.app.HotelApplication
