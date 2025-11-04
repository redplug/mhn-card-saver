#!/bin/bash

# set -euo pipefail

ENV_ARG=${1:-prod} # prod | dev

if [ -z "$ENV_ARG" ]; then
  ENV_ARG="prod"
fi

if [ "$ENV_ARG" = "prod" ] || [ "$ENV_ARG" = "main" ]; then
  BRANCH="main"
  APP_NAME="mhn-app"
  REDIS_NAME="mhn-redis"
  PORT=3020
  IMAGE_TAG="redplug/mhn-saver:latest"
  VOLUME_NAME="mhn-redis-data"
elif [ "$ENV_ARG" = "dev" ]; then
  BRANCH="dev"
  APP_NAME="mhn-app-dev"
  REDIS_NAME="mhn-redis-dev"
  PORT=3021
  IMAGE_TAG="redplug/mhn-saver:dev"
  VOLUME_NAME="mhn-redis-data-dev"
else
  echo "Usage: $0 [prod|dev]"; exit 1
fi

echo "--- Deploying ENV=$ENV_ARG (branch=$BRANCH, app=$APP_NAME, redis=$REDIS_NAME, port=$PORT) ---"

cd /home/redplug/mhn-card-saver
git fetch --all --prune
git checkout "$BRANCH"
git pull origin "$BRANCH"

docker build -t "$IMAGE_TAG" .

# 네트워크 보장
docker network inspect mhn-network >/dev/null 2>&1 || docker network create mhn-network

# 기존 컨테이너 정리
docker rm -f "$APP_NAME" >/dev/null 2>&1 || true
docker rm -f "$REDIS_NAME" >/dev/null 2>&1 || true

# Redis 기동 (alias=db, healthcheck 포함)
docker run -d --name "$REDIS_NAME" \
    --network mhn-network \
    --network-alias db \
    -v "$VOLUME_NAME":/data \
    --health-cmd "redis-cli ping || exit 1" \
    --health-interval=5s \
    --health-timeout=3s \
    --health-retries=10 \
    --restart unless-stopped \
    redis:alpine redis-server --save 1 1 --dir /data


# 앱 기동
docker run -d --name "$APP_NAME" \
    -p $PORT:3000 \
    --network mhn-network \
    --env KV_URL="redis://db:6379" \
    --restart unless-stopped \
    "$IMAGE_TAG"

echo "--- Done. ENV=$ENV_ARG running on port $PORT ---"