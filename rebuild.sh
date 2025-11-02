cd /home/redplug/mhn-card-saver
git pull
docker build -t redplug/mhn-saver:latest .
docker rm -f mhn-app

# docker rm -f mhn-redis

# docker run -d --name mhn-redis \                     
#     --network mhn-network \
#     --network-alias db \
#     -v mhn-redis-data:/data \
#     redis:alpine redis-server --save 1 1 --dir /data

docker run -d --name mhn-app \
    -p 3020:3000 \
    --network mhn-network \
    --env KV_URL="redis://db:6379" \
    --restart unless-stopped \
    redplug/mhn-saver:latest