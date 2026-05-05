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
export PATH=$PATH:/usr/local/bin:/opt/bin

if docker compose version &> /dev/null; then
  echo "Using 'docker compose' plugin"
  docker compose -f docker-compose.prod.yml pull || true
  docker compose -f docker-compose.prod.yml up -d --build
elif docker-compose version &> /dev/null; then
  echo "Using standalone 'docker-compose'"
  docker-compose -f docker-compose.prod.yml pull || true
  docker-compose -f docker-compose.prod.yml up -d --build
else
  echo "ERROR: Neither 'docker compose' nor 'docker-compose' found in PATH ($PATH)."
  exit 1
fi

echo ">> Cleaning dangling Docker images"
docker image prune -f

echo ">> Deployment completed"
