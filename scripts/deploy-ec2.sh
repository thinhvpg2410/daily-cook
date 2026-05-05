#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$HOME/daily-cook}"
BRANCH="${BRANCH:-feature/ai}"

echo ">> Moving to project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo ">> Pulling latest source from branch: $BRANCH"
git fetch origin
git reset --hard
git clean -fd
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo ">> Building and starting production stack"
if command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="docker compose"
fi

$COMPOSE_CMD -f docker-compose.prod.yml pull || true
$COMPOSE_CMD -f docker-compose.prod.yml up -d --build

echo ">> Cleaning dangling Docker images"
docker image prune -f

echo ">> Deployment completed"
