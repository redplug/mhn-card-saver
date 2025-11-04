#!/bin/bash

# 사용법:
#   ./restore_volume.sh <VOLUME_NAME> <BACKUP_FILE_PATH>
# 예시:
#   ./restore_volume.sh mhn-redis-data /backup/mhnb_docker_volume/mhn-redis-data_20250101_120000.tar.gz

set -euo pipefail

VOLUME_NAME="${1:-}"
BACKUP_FILE="${2:-}"

if [ -z "$VOLUME_NAME" ] || [ -z "$BACKUP_FILE" ]; then
  echo "사용법: $0 <VOLUME_NAME> <BACKUP_FILE_PATH>"
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

echo "--- 복구 작업 종료 ---"


