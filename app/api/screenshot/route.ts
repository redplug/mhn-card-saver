// app/api/screenshot/route.ts (최종 수정본)

import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  let browser = null;

  try {
    // --- ⬇️ 이 부분이 핵심 수정 사항 ⬇️ ---
    
    const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
    // --- ⬆️ 여기까지 ⬆️ ---
    // 현재 환경이 프로덕션(Vercel)인지 확인
    const isProd = process.env.NODE_ENV === 'production';

    // 1. 실행 경로 설정
    const executablePath = isProd
      ? await chromium.executablePath()
      : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    
// 2. 헤드리스 옵션 설정
    const headless = isProd 
      ? true  // [수정] 'chromium.headless'가 아니라 'true'입니다. (Vercel은 항상 true)
      : true; // 로컬 환경 (false로 두면 창이 뜹니다. true로 바꿔도 됩니다)
    
    // 3. 실행 인수(args) 설정
    const args = isProd 
      ? chromium.args 
      : []; // ❗️[수정] 개발 환경에선 충돌 방지를 위해 빈 배열 전달

    // --- ⬆️ 여기까지 ⬆️ ---


    // Vercel 서버(또는 내 PC)에서 크롬 브라우저를 실행
    browser = await puppeteer.launch({
      args: args, // 'args' 변수 사용
      executablePath: executablePath,
      headless: headless,
    //   ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // 2. User-Agent를 모바일로 설정합니다. (goto보다 먼저!)
    await page.setUserAgent(MOBILE_USER_AGENT); 

    // 3. 뷰포트를 설정합니다. (isMobile: true도 중요)
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    
    // 이 부분에서 오류가 발생했습니다.
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    
    await page.goto(url, { waitUntil: 'networkidle0' });

    // ❗️ [중요] 스크린샷을 시작할 요소와 끝낼 요소의 CSS 선택자를 직접 찾아야 합니다.
    // 아래는 예시이며, 실제 mhn.quest 페이지에서 개발자 도구로 찾아야 합니다.
    const startSelector = '#app > div.main.ko.svelte-1oecyh1 > div:nth-child(6)'; // 예: '장비' 또는 '스탯' 영역의 선택자
    const endSelector = '#app > div.main.ko.svelte-1oecyh1 > div.drift-buff.mobile.svelte-1oecyh1';   // 예: '스킬 테이블' 영역의 선택자

    // 2. 각 요소를 찾습니다.
    const startElement = await page.$(startSelector);
    const endElement = await page.$(endSelector);

    let buffer;

    // 3. 두 요소가 모두 존재할 때만 영역 계산을 실행합니다.
    if (startElement && endElement) {
      // 4. 각 요소의 위치와 크기 정보를 가져옵니다.
      const startBox = await startElement.boundingBox();
      const endBox = await endElement.boundingBox();

      if (startBox && endBox) {
        // 5. 스크린샷을 찍을 '사각형(clip)' 영역을 계산합니다.
        const clip = {
          x: startBox.x, // 시작 요소의 x 좌표
          y: startBox.y, // 시작 요소의 y 좌표
          width: startBox.width, // 너비는 시작 요소를 따름 (모바일이라 동일)
          
          // 높이 = (끝 요소의 바닥 y좌표) - (시작 요소의 맨 위 y좌표)
          height: (endBox.y + endBox.height) - startBox.y
        };

        // 6. 계산된 영역(clip)으로 스크린샷을 찍습니다.
        buffer = await page.screenshot({
          type: 'png',
          encoding: 'base64',
          clip: clip
        });
      } else {
        // 요소는 찾았으나 좌표 계산에 실패하면 전체 스크린샷
        console.warn('Could not get bounding box. Taking full page screenshot.');
        buffer = await page.screenshot({ type: 'png', encoding: 'base64' });
      }
    } else {
      // 시작 또는 끝 요소를 찾지 못하면 전체 스크린샷
      console.warn(`Could not find start ('${startSelector}') or end ('${endSelector}') element. Taking full page screenshot.`);
      buffer = await page.screenshot({ type: 'png', encoding: 'base64' });
    }

    await browser.close();

    return NextResponse.json({ screenshotBase64: buffer });

  } catch (error) {
    console.error(error);
    if (browser) {
      await browser.close();
    }

    // 1. 에러 메시지를 담을 변수 생성
    let errorMessage = 'An unknown error occurred';

    // 2. error가 'Error' 객체의 인스턴스(instance)인지 확인
    if (error instanceof Error) {
      errorMessage = error.message; // 맞으면 .message 속성을 사용
    }

    // 3. 'details'에 error.message 대신 'errorMessage' 변수를 사용
    return NextResponse.json(
      { error: 'Failed to take screenshot', details: errorMessage },
      { status: 500 }
    );
  }
}