// app/api/screenshot/route.ts (최종 정리 버전)

import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// 한국어 버튼과 스크린샷 영역을 찾기 위한 선택자는 사용자님이 직접 찾은 값으로 교체해야 합니다.
const KOREAN_BUTTON_SELECTOR = '#app > div.settings.svelte-ghcjle > div > div > select'; // 예: '#app > header > button.lang-ko'; // ⚠️ [필수] 한국어 버튼의 실제 CSS 선택자로 교체하세요.
const KOREAN_BUTTON = '#app > div.settings.svelte-ghcjle > div > div > select > option:nth-child(4)'
const START_SELECTOR = '#app > div.main.ko.svelte-1oecyh1 > div:nth-child(6)'; // ⚠️ [필수] 스크린샷 시작 영역의 안정적인 선택자로 교체하세요.
const END_SELECTOR = '#app > div.main.ko.svelte-1oecyh1 > div.drift-buff.mobile.svelte-1oecyh1'; // ⚠️ [필수] 스크린샷 끝 영역의 안정적인 선택자로 교체하세요.

// 모바일 User-Agent
const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// 메인 함수
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  let browser = null;

  try {
    // 1. 브라우저 실행 설정 (Docker 환경에서는 항상 Chromium 사용)
    const executablePath = await chromium.executablePath();
    const headless = true; // 서버에서는 항상 true (창 안 띄움)
    const args = chromium.args; 

    browser = await puppeteer.launch({
      args: args, 
      executablePath: executablePath,
      headless: headless,
    });

    const page = await browser.newPage();
    
    // 2. 언어 및 뷰포트 설정
    await page.setUserAgent(MOBILE_USER_AGENT); 
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    
    // 한국어 선호 헤더 추가
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });
    
    await page.goto(url, { 
      waitUntil: 'networkidle0', 
      referrer: 'https://www.google.com/', 
    });

    // 3. 한국어 버튼 클릭 및 컨텐츠 대기
    try {
      // 1. 한국어 버튼이 나타날 때까지 기다립니다.
      await page.waitForSelector(KOREAN_BUTTON_SELECTOR, { timeout: 10000 });
      
      // 2. [수정] 클릭 후 페이지가 완전히 재로딩될 때까지 기다립니다.
      //    (클릭과 재로딩 대기를 동시에 실행하는 표준 Puppeteer 패턴)
      
      const clickAndReload = Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }), // 페이지 재로딩을 기다림
          page.click(KOREAN_BUTTON_SELECTOR),
          page.click(KOREAN_BUTTON)                      // 클릭을 실행
      ]);
      
      await clickAndReload; // 클릭 및 재로딩 완료 대기
      
      // 3. 이제 페이지가 한국어로 완전히 로드되었으므로,
      //    스크린샷 끝 요소가 렌더링될 때까지 기다립니다.
      await page.waitForSelector(END_SELECTOR, { timeout: 10000 });

    } catch (waitError) {
      // 10초 내에 버튼 클릭이나 컨텐츠 로드에 실패한 경우
      console.error(`Failed to find UI element or content: ${waitError.message}`);
      
      // 디버그 스크린샷을 찍어 무엇이 보이는지 확인
      const debugBuffer = await page.screenshot({ type: 'png', encoding: 'base64' });
      await browser.close();

      const errorMessage = waitError instanceof Error ? waitError.message : String(waitError);
      return NextResponse.json(
        { 
          error: `Failed to find element \`${END_SELECTOR}\` (Timeout or Selector Break)`, 
          details: errorMessage,
          debugScreenshotBase64: debugBuffer
        },
        { status: 500 }
      );
    }
    
    // 4. 스크린샷 영역 계산 및 촬영
    const startElement = await page.$(START_SELECTOR);
    const endElement = await page.$(END_SELECTOR);

    let buffer;
    if (startElement && endElement) {
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
        // 좌표 계산 실패 시 전체 스크린샷
        buffer = await page.screenshot({ type: 'png', encoding: 'base64' });
      }
    } else {
      // 요소 찾기 실패 시 전체 스크린샷
      buffer = await page.screenshot({ type: 'png', encoding: 'base64' });
    }

    await browser.close();
    return NextResponse.json({ screenshotBase64: buffer });

  } catch (error) {
    console.error("--- Critical Error in GET API ---", error);
    if (browser) {
      // 브라우저가 실행 중이었다면 닫기
      await browser.close(); 
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Critical Browser Launch Failure', details: errorMessage },
      { status: 500 }
    );
  }
}