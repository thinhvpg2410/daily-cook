#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$HOME/daily-cook}"
BRANCH="${BRANCH:-feature/ai}"

echo ">> Moving to project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo ">> Pulling latest source from branch: $BRANCH"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo ">> Building and starting production stack"
docker compose -f docker-compose.prod.yml pull || true
docker compose -f docker-compose.prod.yml up -d --build

echo ">> Cleaning dangling Docker images"
docker image prune -f

echo ">> Deployment completed"
