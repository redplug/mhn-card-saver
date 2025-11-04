#!/bin/bash

# 사용법:
#   ./restore_volume.sh <VOLUME_NAME> <BACKUP_FILE_PATH> [CONTAINER_NAME]
# 예시:
#   ./restore_volume.sh mhn-redis-data /backup/mhnb_docker_volume/mhn-redis-data_20250101_120000.tar.gz mhn-redis

set -euo pipefail

VOLUME_NAME="${1:-}"
BACKUP_FILE="${2:-}"
CONTAINER_NAME="${3:-}"

if [ -z "$VOLUME_NAME" ] || [ -z "$BACKUP_FILE" ]; then
  echo "사용법: $0 <VOLUME_NAME> <BACKUP_FILE_PATH> [CONTAINER_NAME]"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ 백업 파일을 찾을 수 없습니다: $BACKUP_FILE"
  exit 1
fi

BACKUP_DIR=$(cd "$(dirname "$BACKUP_FILE")" && pwd)
BACKUP_BASENAME=$(basename "$BACKUP_FILE")

echo "--- [$(date)] 볼륨 복구 시작 ---"
echo "대상 볼륨: $VOLUME_NAME"
echo "백업 파일: $BACKUP_FILE"
if [ -n "$CONTAINER_NAME" ]; then
  echo "대상 컨테이너: $CONTAINER_NAME (자동 정지/시작)"
fi

# 컨테이너 자동 정지 (선택적)
if [ -n "$CONTAINER_NAME" ]; then
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "컨테이너 정지: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME"
  else
    echo "알림: 실행 중인 컨테이너가 아님 또는 존재하지 않음: $CONTAINER_NAME"
  fi
fi

# 임시 컨테이너를 사용해 복구 수행
# 주의: 복구 전 /volume 내용을 비웁니다
docker run --rm \
  -v "$VOLUME_NAME":/volume \
  -v "$BACKUP_DIR":/backup \
  alpine sh -c "\
    set -e; \
    if [ -z '\"$BACKUP_BASENAME\"' ]; then echo '백업 파일명이 비어있습니다.' && exit 1; fi; \
    echo '기존 볼륨 데이터 삭제 중 (/volume/*)'; \
    rm -rf /volume/*; \
    echo '압축 해제 중...'; \
    tar xzf /backup/\"$BACKUP_BASENAME\" -C /volume; \
    echo '복구 완료' \
  "

if [ $? -eq 0 ]; then
  echo "✅ 복구 성공: $VOLUME_NAME <= $BACKUP_FILE"
else
  echo "❌ 복구 실패"
  exit 1
fi

# 컨테이너 자동 시작 (선택적)
if [ -n "$CONTAINER_NAME" ]; then
  echo "컨테이너 시작: $CONTAINER_NAME"
  docker start "$CONTAINER_NAME" || {
    echo "경고: 컨테이너 시작 실패 - 수동으로 확인하세요."
  }
fi

echo "--- 복구 작업 종료 ---"


