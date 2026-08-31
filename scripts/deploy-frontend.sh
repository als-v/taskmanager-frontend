#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

docker compose -f docker-compose.frontend.yml \
  -f docker-compose.frontend.build.yml \
  build frontend

docker compose -f docker-compose.frontend.yml \
  -f docker-compose.frontend.build.yml \
  up -d --no-deps --force-recreate frontend
