// app/api/screenshot/route.ts (최종 정리 버전)

import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 한국어 버튼과 스크린샷 영역을 찾기 위한 선택자는 사용자님이 직접 찾은 값으로 교체해야 합니다.
// [추가] 드롭다운의 value 값을 설정합니다.
const KOREAN_LANG_VALUE = 'ko'; // ⚠️ [필수] 실제 웹사이트의 <option value=\"...\"> 값으로 교체하세요.

// 1. [수정] 한국어 버튼의 실제 CSS 선택자를 여기에 붙여넣으세요.
const KOREAN_DROPDOWN_SELECTOR = '#app > div.settings.svelte-ghcjle > div > div > select';
const START_SELECTOR = '#app > div.main.ko.svelte-1oecyh1 > div:nth-child(5)'; // ⚠️ [필수] 스크린샷 시작 영역의 안정적인 선택자로 교체하세요.
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
  let weaponBaseMonster = '';
  let weaponType = '';
  let monsterIconUrl: string | undefined;
  let weaponTypeIconUrl: string | undefined;
  let extractedInfo = null;
  let buffer;

  try {
    // 1. 브라우저 실행 설정 (개발/프로덕션 환경 구분)
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    let executablePath: string;
    let args: string[];
    
    if (isDevelopment) {
      // 개발 환경 (macOS): 로컬 Chrome 사용
      executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ];
      console.log('[DEV] Using local Chrome:', executablePath);
    } else {
      // 프로덕션 환경 (Docker): Chromium 사용
      try {
        executablePath = await chromium.executablePath();
        args = chromium.args;
        console.log('[PROD] Using Chromium from @sparticuz/chromium');
      } catch (chromiumError) {
        const errorMsg = chromiumError instanceof Error ? chromiumError.message : String(chromiumError);
        console.error('[PROD] Failed to load Chromium:', errorMsg);
        throw new Error(`Failed to initialize Chromium: ${errorMsg}`);
      }
    }
    
    const headless = true; // 서버에서는 항상 true (창 안 띄움)

    browser = await puppeteer.launch({
      args: args, 
      executablePath: executablePath,
      headless: headless,
    });

    const page = await browser.newPage();

    // --- ⬇️ [핵심 수정: 광고 및 분석 요청 차단] ⬇️ ---
    
    await page.setRequestInterception(true); // 요청 가로채기 활성화
    
    page.on('request', (request) => {
      // 차단할 URL 패턴을 정의합니다. (광고, 분석, 폰트/이미지 등)
      const url = request.url();
      if (
        url.includes('google-analytics.com') ||
        url.includes('googletagmanager.com') ||
        url.includes('googlesyndication.com') ||
        url.includes('cloudflareinsights.com') ||
        // request.resourceType() === 'media' || // 동영상, 음성 파일 차단
        request.resourceType() === 'media' // 동영상, 음성 파일 차단
        // request.resourceType() === 'image'    // 이미지 파일 차단 (선택적)
      ) {
        request.abort(); // 요청을 차단하고 즉시 종료
      } else {
        request.continue(); // 그 외 요청은 계속 진행
      }
    });

    // --- ⬆️ 광고 차단 로직 끝 ⬆️ ---

    // --- ⬇️ [핵심 디버깅 코드 추가] ⬇️ ---
    
    // 1. 브라우저 콘솔 로그를 서버 터미널에 출력
    page.on('console', (msg) => {
      console.log(`[PAGE CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    // 2. 페이지 에러/크래시 이벤트를 서버 터미널에 출력
    page.on('pageerror', (err) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[PAGE ERROR] ${errorMessage}`);
    });
    
    // 3. 페이지가 요청을 실패할 때 네트워크 에러를 기록
    page.on('requestfailed', (request) => {
      console.error(`[NET ERROR] ${request.failure()?.errorText}: ${request.url()}`);
    });
    
    // --- ⬆️ 디버깅 코드 끝 ⬆️ ---
    
    // 2. 언어 및 뷰포트 설정
    await page.setUserAgent(MOBILE_USER_AGENT); 
    await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    
    // 한국어 선호 헤더 추가
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000,
    });

    // 3. 한국어 버튼 클릭 및 컨텐츠 대기
    try {
      // 1. [수정] 드롭다운 요소가 '클릭 가능'할 때까지 기다립니다.
      //    (visible: true 대신 'visible' 속성을 사용하며, timeout은 30초)
      await page.waitForSelector(KOREAN_DROPDOWN_SELECTOR, { timeout: 30000, visible: true });
      
      // 2. [핵심 수정] select()를 사용해 드롭다운 값을 변경하고, 페이지 재로딩을 기다립니다.
      const selectAndReload = Promise.all([
          // 페이지 재로딩 대기
          page.waitForNavigation({ waitUntil: 'networkidle0' }), 
          // 드롭다운 요소에서 'ko' 값을 선택
          page.select(KOREAN_DROPDOWN_SELECTOR, KOREAN_LANG_VALUE) 
      ]);
      
      await selectAndReload; // 선택 및 재로딩 완료 대기
      
      // 페이지가 완전히 렌더링될 시간을 추가로 줍니다.
      await delay(5000);

      // 5. 스크린샷 끝 요소 대기 (60초)
      await page.waitForSelector(END_SELECTOR, { timeout: 60000 });

    } catch (waitError) {
      // 10초 내에 버튼 클릭이나 컨텐츠 로드에 실패한 경우
      const consoleErrorMessage = waitError instanceof Error ? waitError.message : String(waitError);
      console.error(`Failed to find UI element or content: ${consoleErrorMessage}`);
      
      // 디버그 스크린샷을 찍어 무엇이 보이는지 확인
      const debugBuffer = await page.screenshot({ type: 'png', encoding: 'base64' });
      await browser.close();

      const errorMessage = waitError instanceof Error ? waitError.message : String(waitError);
      return NextResponse.json(
        {
          error: `Failed to find element ${END_SELECTOR} (Timeout or Selector Break)`,
          details: errorMessage,
          debugScreenshotBase64: debugBuffer
        },
        { status: 500 }
      );
    }
    
    // 4. 스크린샷 영역 계산 및 촬영
    const startElement = await page.$(START_SELECTOR);
    const endElement = await page.$(END_SELECTOR);
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

      // 6. 몬스터와 무기 정보 추출 (모바일 뷰에 맞게 수정)
      try {
        const weaponNameSelector = '.mobile-eq .part-name.mobile';
        await page.waitForSelector(weaponNameSelector, { timeout: 10000 }); // Wait for the element to appear

                const weaponNameElement = await page.$('.mobile-eq .part-name.mobile');
        
                if (weaponNameElement) {
                  const monsterIconElement = await page.$('.mobile-eq .mobile-eq-monster img.icon');
                            if (monsterIconElement) {
                              const src = await monsterIconElement.evaluate(el => el.getAttribute('src'));
                              if (src) {
                                const absoluteIconUrl = new URL(src, url).toString();
                                console.log(`[INFO] Fetching Monster Icon from: ${absoluteIconUrl}`);
                                try {
                                  const imageResponse = await fetch(absoluteIconUrl);
                                  if (imageResponse.ok) {
                                    const imageBuffer = await imageResponse.arrayBuffer();
                                    const base64Image = Buffer.from(imageBuffer).toString('base64');
                                    monsterIconUrl = `data:image/png;base64,${base64Image}`;
                                                      console.log(`[INFO] Successfully encoded monster icon to base64.`);
                                                    } else {
                                                      console.warn(`[WARN] Failed to fetch monster icon. Status: ${imageResponse.status}`);
                                                    }
                                                  } catch (fetchError) {
                                                    const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
                                                    console.error(`[ERROR] Failed to fetch monster icon: ${errorMsg}`);
                                                  }
                                                }
                                              }
                                    
                                              const weaponTypeIconElement = await page.$('.mobile-eq .mobile-eq-type img');
                                              if (weaponTypeIconElement) {
                                                const src = await weaponTypeIconElement.evaluate(el => el.getAttribute('src'));
                                                if (src) {
                                                  const absoluteIconUrl = new URL(src, url).toString();
                                                  console.log(`[INFO] Fetching Weapon Type Icon from: ${absoluteIconUrl}`);
                                                  try {
                                                    const imageResponse = await fetch(absoluteIconUrl);
                                                    if (imageResponse.ok) {
                                                      const imageBuffer = await imageResponse.arrayBuffer();
                                                      const base64Image = Buffer.from(imageBuffer).toString('base64');
                                                      weaponTypeIconUrl = `data:image/png;base64,${base64Image}`;
                                                      console.log(`[INFO] Successfully encoded weapon type icon to base64.`);
                                                    } else {
                                                      console.warn(`[WARN] Failed to fetch weapon type icon. Status: ${imageResponse.status}`);
                                                    }
                                                  } catch (fetchError) {
                                                    const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
                                                    console.error(`[ERROR] Failed to fetch weapon type icon: ${errorMsg}`);
                                                  }
                                                }
                                              }                  const fullWeaponName = await weaponNameElement.evaluate(el => {
                    let result = '';
                    for (const node of el.childNodes) {
                      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                        result += node.textContent.trim() + ' ';
                      }
                    }
                    return result.trim();
                  });
          if (fullWeaponName) {
            console.log(`[INFO] Found full weapon name: "${fullWeaponName}"`);
            const lastSpaceIndex = fullWeaponName.lastIndexOf(' ');
            if (lastSpaceIndex !== -1) {
              weaponBaseMonster = fullWeaponName.substring(0, lastSpaceIndex);
              weaponType = fullWeaponName.substring(lastSpaceIndex + 1);
              console.log(`[INFO] Extracted - Monster: "${weaponBaseMonster}", Weapon: "${weaponType}"`);
            } else {
              weaponBaseMonster = fullWeaponName;
              weaponType = '';
              console.log(`[INFO] Extracted - Monster: "${weaponBaseMonster}", Weapon: (not found)`);
            }
          }
        } else {
          console.warn(`[WARN] Weapon name selector not found: ${weaponNameSelector}`);
          // This is not a critical error, so we don't return a 500 response.
          // The screenshot will be returned without monster/weapon info.
        }
      } catch (extractError) {
        const errorMsg = extractError instanceof Error ? extractError.message : String(extractError);
        console.error('[WARN] Failed to extract monster/weapon info:', errorMsg);
        // 정보 추출 실패해도 스크린샷은 계속 진행
      }

    await browser.close();
    
        // 몬스터와 무기 정보도 함께 반환
        return NextResponse.json({
          screenshotBase64: buffer,
          monster: weaponBaseMonster || undefined,
          weapon: weaponType || undefined,
          weaponBaseMonster: weaponBaseMonster || undefined,
          weaponType: weaponType || undefined,
          monsterIconUrl: monsterIconUrl || undefined,
          weaponTypeIconUrl: weaponTypeIconUrl || undefined
        });
  } catch (error) {
    console.error("--- Critical Error in GET API ---", error);
    if (browser) {
      // 브라우저가 실행 중이었다면 닫기
      await browser.close(); 
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Log the full error object for debugging
    console.error("Full puppeteer launch error object:", error);
    return NextResponse.json(
      { error: 'Critical Browser Launch Failure', details: errorMessage },
      { status: 500 }
    );
  }
}
