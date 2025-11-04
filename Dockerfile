# ----------------------------------------
# STAGE 1: Dependency Installation & Build
# ----------------------------------------
FROM node:20-bookworm-slim AS builder

# Puppeteer/Chromium 실행에 필요한 OS 시스템 의존성 설치
# (libnssutil3.so 오류 해결 포함)
# Runner 스테이지의 재설치를 위해 -dev 패키지들은 제외하고 필수 런타임 패키지만 설치합니다.
USER root
RUN apt-get update && apt-get install -y \
    libnspr4 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    fontconfig \
    fonts-nanum \
    libgconf-2-4 \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 폰트 캐시를 새로고침하여 시스템에 적용
RUN fc-cache -fv

# /app 디렉토리를 작업 경로로 설정합니다.
WORKDIR /app

# Host의 package.json, package-lock.json 파일을 복사합니다.
COPY package*.json ./

# node_modules 설치 (Linux용 바이너리가 설치됨)
RUN npm install

# 나머지 모든 소스 코드를 복사합니다.
COPY . .

# Next.js 앱을 프로덕션용으로 빌드합니다.
# output: "standalone" 옵션을 사용하면 서버 실행에 필요한 모든 파일이 standalone 폴더에 들어갑니다.
RUN npm run build

# ----------------------------------------
# STAGE 2: Final Production Runtime Image
# ----------------------------------------
FROM node:20-bookworm-slim AS runner

# Runner 이미지에 Puppeteer 런타임 종속성 재설치
USER root
RUN apt-get update && apt-get install -y \
    libnspr4 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    fontconfig \
    fonts-nanum \
    libgconf-2-4 \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 복사한 폰트 캐시를 갱신합니다.
RUN fc-cache -fv

WORKDIR /app

# Next.js의 Standalone 실행 파일 및 node_modules 복사
# Next.js의 output: "standalone" 옵션은 node_modules와 서버 파일을 통합하여 복사하기 쉽습니다.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

# package.json만 복사 (실행 환경 정보용)
COPY package.json ./

# Next.js의 기본 포트인 3000번을 엽니다.
EXPOSE 3000

# Next.js의 프로덕션 서버 시작 명령
# server.js는 standalone 빌드에 의해 생성됩니다.
CMD ["node", "server.js"]