import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // --- 사용자의 기존 설정 (예시) ---
  reactStrictMode: true,
  // (만약 다른 설정이 더 있다면, 그대로 두세요)
  /**
   * Vercel 빌드 시 누락되는 파일을 강제로 포함시킵니다.
   * /api/screenshot 경로의 함수를 빌드할 때,
   * @sparticuz/chromium 패키지의 'bin' 폴더 내부 모든 파일을
   * 강제로 포함(include)시킵니다.
   */

  // Next.js에게 'KV_REST_API_URL' 변수는 개발 환경에서 필요 없다고 알려줍니다.
  env: {
    KV_REST_API_URL: process.env.KV_REST_API_URL || "http://dummy-url.com",
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || "dummy-token",
  },

  outputFileTracingIncludes: {
    '/api/screenshot': ['./node_modules/@sparticuz/chromium/bin/**'],
  },

};

export default nextConfig;
