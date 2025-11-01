// app/api/cards/route.ts

import { NextResponse } from 'next/server';
import IORedis from 'ioredis';

// 2. [추가] 환경 변수에서 KV_URL을 가져옵니다.
const redis = new IORedis(process.env.KV_URL || 'redis://localhost:6379');

// 3. [추가] KV_URL이 없으면 오류를 방지하고, 있으면 Redis 객체를 TCP 모드로 생성합니다.
//    (이 방법이 KV_REST_API_* 변수를 완전히 무시하도록 강제합니다.)
const kv = redisUrl
  ? createClient({ url: redisUrl }) 
  : { 
      // KV_URL이 없을 때의 더미 객체 (실패 로직을 위해)
      get: async () => { throw new Error('KV_URL 환경 변수가 설정되지 않았습니다.'); },
      set: async () => { throw new Error('KV_URL 환경 변수가 설정되지 않았습니다.'); },
    };

// 모든 방문자가 공용으로 사용할 데이터베이스 '키' (하나의 파일명 같은 개념)
const CARDS_KEY = 'global_cards';

/**
 * GET 요청: 저장된 카드 목록 전체를 불러옵니다.
 */
export async function GET() {
  console.log('--- [API] GET /api/cards: 카드 불러오기 시도 ---');
  try {
    // 2. [수정] redis.get은 문자열을 반환하므로 JSON.parse가 필요합니다.
    const rawCards = await redis.get(CARDS_KEY);
    
    if (!rawCards) {
      console.log('--- [API] GET: 저장된 카드가 없음. 빈 배열 반환.');
      return NextResponse.json([]);
    }
    
    const cards = JSON.parse(rawCards);
    
    console.log(`--- [API] GET: 카드 ${Array.isArray(cards) ? cards.length : '??'}개 불러오기 성공.`);
    return NextResponse.json(cards);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('--- [API] GET: 카드 불러오기 실패!', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch data', details: errorMessage }, { status: 500 });
  }
}

/**
 * POST 요청: 새로운 카드 목록 '전체'를 덮어씁니다.
 */
export async function POST(request: Request) {
  console.log('--- [API] POST /api/cards: 카드 저장 시도 ---');
  try {
    const newCards = await request.json();
    
    // 3. [수정] redis.set은 문자열을 요구하므로 JSON.stringify를 사용합니다.
    await redis.set(CARDS_KEY, JSON.stringify(newCards));
    
    console.log(`--- [API] POST: 카드 ${newCards.length}개 저장 성공.`);
    return NextResponse.json({ success: true, savedCards: newCards });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('--- [API] POST: 카드 저장 실패!', errorMessage);
    return NextResponse.json({ error: 'Failed to save data', details: errorMessage }, { status: 500 });
  }
}