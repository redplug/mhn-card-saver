#!/bin/bash

# 설정 (변수 변경 필요)
VOLUME_NAME="mhn-redis-data" # 백업하려는 Docker 볼륨 이름
BACKUP_DIR="/backup/mhnb_docker_volume" # 백업 파일을 저장할 호스트 경로
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${VOLUME_NAME}_${TIMESTAMP}.tar.gz"
DAYS_TO_KEEP=30 # 보관 기간 (7일)

echo "--- [$(date)] $VOLUME_NAME 백업 시작 ---"

# 1. 백업 디렉토리 생성 (없을 경우)
mkdir -p $BACKUP_DIR

# 2. 임시 컨테이너를 이용해 볼륨 백업
# - --rm: 종료 시 컨테이너 삭제
# - -v $VOLUME_NAME:/volume: 백업 대상 볼륨 마운트
# - -v $BACKUP_DIR:/backup: 호스트 백업 경로 마운트
# - alpine: 가벼운 이미지 사용
# - tar...: /volume의 내용을 압축하여 /backup 경로에 저장
docker run --rm \
    -v $VOLUME_NAME:/volume:ro \
    -v $BACKUP_DIR:/backup \
    alpine \
    tar czf /backup/"${VOLUME_NAME}_${TIMESTAMP}.tar.gz" -C /volume .

if [ $? -eq 0 ]; then
    echo "✅ $VOLUME_NAME 백업 성공: $BACKUP_FILE"
else
    echo "❌ $VOLUME_NAME 백업 실패!"
    exit 1
fi

# 3. 오래된 백업 파일 정리 (Retention)
echo "--- 오래된 백업 파일 ($DAYS_TO_KEEP일 초과) 정리 시작 ---"
# find 명령어로 지정된 기간이 초과된 파일을 찾아 삭제
find $BACKUP_DIR -name "${VOLUME_NAME}_*.tar.gz" -mtime +$DAYS_TO_KEEP -delete

echo "--- 백업 및 정리 완료 ---"