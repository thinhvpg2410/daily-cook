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

if docker compose version 2>&1 | grep -qi 'compose'; then
  echo "Using 'docker compose' plugin"
  docker compose -f docker-compose.prod.yml pull || true
  docker compose -f docker-compose.prod.yml up -d --build
elif docker-compose version 2>&1 | grep -qi 'compose'; then
  echo "Using standalone 'docker-compose'"
  docker-compose -f docker-compose.prod.yml pull || true
  docker-compose -f docker-compose.prod.yml up -d --build
else
  echo "Valid docker-compose not found. Installing standalone docker-compose..."
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  
  echo "Using standalone 'docker-compose' (newly installed)"
  docker-compose -f docker-compose.prod.yml pull || true
  docker-compose -f docker-compose.prod.yml up -d --build
fi

echo ">> Cleaning dangling Docker images"
docker image prune -f

echo ">> Deployment completed"
