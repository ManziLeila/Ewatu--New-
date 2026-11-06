#!/usr/bin/env bash
# Run ON the server (Linux) after git clone — no GitHub Actions required.
# Usage:
#   ./scripts/deploy-on-server.sh UAT
#   ./scripts/deploy-on-server.sh main
set -euo pipefail

BRANCH="${1:-main}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> E-Watu deploy: branch=$BRANCH at $ROOT"

git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

if ! command -v node >/dev/null; then
  echo "Node.js 20+ required on the server."
  exit 1
fi

npm ci
npm run db:generate:all
npm run db:migrate:all
npm run build:all

if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  if [ -f docker-compose.coolify.yml ] && [ -n "${COOLIFY:-}" ]; then
    docker compose -f docker-compose.coolify.yml up -d --build
  elif [ -f docker-compose.yml ]; then
    docker compose up -d --build
  fi
fi

echo "==> Done $(date -u +%Y-%m-%dT%H:%M:%SZ)"
