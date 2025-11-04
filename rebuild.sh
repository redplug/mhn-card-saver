cd /home/redplug/mhn-card-saver
git pull
docker build -t redplug/mhn-saver:latest .

# 네트워크 보장
docker network inspect mhn-network >/dev/null 2>&1 || docker network create mhn-network

# 기존 컨테이너 정리
docker rm -f mhn-app >/dev/null 2>&1 || true
docker rm -f mhn-redis >/dev/null 2>&1 || true

# Redis 기동 (alias=db, healthcheck 포함)
docker run -d --name mhn-redis \
    --network mhn-network \
    --network-alias db \
    -v mhn-redis-data:/data \
    --health-cmd "redis-cli ping || exit 1" \
    --health-interval=5s \
    --health-timeout=3s \
    --health-retries=10 \
    --restart unless-stopped \
    redis:alpine redis-server --save 1 1 --dir /data

# Redis health 대기 (최대 60초)
echo "Waiting for Redis to be healthy..."
for i in $(seq 1 60); do
  status=$(docker inspect --format='{{.State.Health.Status}}' mhn-redis 2>/dev/null || echo "none")
  if [ "$status" = "healthy" ]; then
    echo "Redis is healthy."
    break
  fi
  sleep 1
  if [ "$i" -eq 60 ]; then
    echo "Redis health check timed out."; exit 1
  fi
done

# 앱 기동
docker run -d --name mhn-app \
    -p 3020:3000 \
    --network mhn-network \
    --env KV_URL="redis://db:6379" \
    --restart unless-stopped \
    redplug/mhn-saver:latest