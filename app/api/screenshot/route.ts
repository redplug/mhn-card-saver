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
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });
    
    await page.goto(url, { waitUntil: 'networkidle0' });

    // ❗️ [중요] 이 선택자들은 mhn.quest 사이트가 업데이트되면 또 실패할 수 있습니다.
    // 더 안정적인 ID(#)나 고유 클래스(예: .stat-group)를 찾는 것이 좋습니다.
    const startSelector = '#app > div.main.ko.svelte-1oecyh1 > div:nth-child(6)';
    const endSelector = '#app > div.main.ko.svelte-1oecyh1 > div.drift-buff.mobile.svelte-1oecyh1';

    try {
      // 1. [추가] 끝 요소가 렌더링될 때까지 최대 5초간 기다립니다.
      // (이것이 타이밍 문제를 해결해 줄 것입니다.)
      await page.waitForSelector(endSelector, { timeout: 5000 });
    } catch (waitError) {
      // 5초간 기다려도 요소를 찾지 못하면, 선택자가 깨졌거나 페이지가 잘못된 것.
      console.error(`Failed to find element with selector: ${endSelector}`);
      const errorMessage = waitError instanceof Error ? waitError.message : String(waitError);
      
      // 'unknown' 타입 오류 방지
      if (browser) await browser.close();
      return NextResponse.json(
        { error: 'Failed to find screenshot element (timeout)', details: errorMessage },
        { status: 500 }
      );
    }

    // 2. 각 요소를 찾습니다. (이제 확실히 존재함)
    const startElement = await page.$(startSelector);
    const endElement = await page.$(endSelector);

    let buffer;

    // 3. 두 요소가 모두 존재할 때만 영역 계산
    if (startElement && endElement) {
      // ... (boundingBox 및 clip 계산 로직은 동일)
      const startBox = await startElement.boundingBox();
      const endBox = await endElement.boundingBox();

      if (startBox && endBox) {
        const clip = {
          x: startBox.x,
          y: startBox.y,
          width: startBox.width,
          height: (endBox.y + endBox.height) - startBox.y
        };
        buffer = await page.screenshot({ type: 'png', encoding: 'base64', clip: clip });
      } else {
        buffer = await page.screenshot({ type: 'png', encoding: 'base64' });
      }
    } else {
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