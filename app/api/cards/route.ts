// app/api/cards/route.ts

import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// 모든 방문자가 공용으로 사용할 데이터베이스 '키' (하나의 파일명 같은 개념)
const CARDS_KEY = 'global_cards';

/**
 * GET 요청: 저장된 카드 목록 전체를 불러옵니다.
 */
export async function GET() {
  console.log('--- [API] GET /api/cards: 카드 불러오기 시도 ---');
  try {
    // Docker 환경에서는 KV_URL(redis://db:6379)을 참조하여 Redis DB에 접속합니다.
    const cards = await kv.get(CARDS_KEY);
    
    if (!cards) {
      console.log('--- [API] GET: 저장된 카드가 없음 (null). 빈 배열 반환.');
      return NextResponse.json([]);
    }
    
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
    // 클라이언트(브라우저)가 보낸 새로운 카드 목록 (배열)
    const newCards = await request.json();
    
    // Docker 환경에서는 KV_URL을 참조하여 Redis DB에 데이터를 씁니다.
    await kv.set(CARDS_KEY, newCards);
    
    console.log(`--- [API] POST: 카드 ${newCards.length}개 저장 성공.`);
    return NextResponse.json({ success: true, savedCards: newCards });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('--- [API] POST: 카드 저장 실패!', errorMessage);
    return NextResponse.json({ error: 'Failed to save data', details: errorMessage }, { status: 500 });
  }
}