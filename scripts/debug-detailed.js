
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('진단 시작...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // 화면 크기 크게 설정
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const url = 'https://bcraping.kr/monitor/danang1004';
        console.log(`이동 중: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log('페이지 로드 완료. 데이터 렌더링 대기 중 (최대 30초)...');

        // "누적 별풍선" 텍스트가 생길 때까지 대기
        try {
            await page.waitForFunction(
                () => document.body.innerText.includes('누적 별풍선'),
                { timeout: 30000 }
            );
            console.log('✅ "누적 별풍선" 텍스트 발견됨!');
        } catch (e) {
            console.log('❌ 30초 대기 후에도 "누적 별풍선" 텍스트를 찾지 못했습니다.');
        }

        // 현재 상태 스크린샷 (디버깅용)
        await page.screenshot({ path: 'debug-view.png', fullPage: true });

        // 해당 부분 HTML 구조 정밀 분석
        const debugInfo = await page.evaluate(() => {
            const results = {};

            // 텍스트를 포함하는 모든 요소 찾기
            function findByText(text) {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                let node;
                const matches = [];
                while (node = walker.nextNode()) {
                    if (node.textContent.includes(text)) {
                        matches.push({
                            text: node.textContent.trim(),
                            parentTag: node.parentElement.tagName,
                            parentClass: node.parentElement.className,
                            grandParentOuterHTML: node.parentElement.parentElement ? node.parentElement.parentElement.outerHTML : 'null'
                        });
                    }
                }
                return matches;
            }

            results['누적 별풍선'] = findByText('누적 별풍선');
            results['누적 방송 시간'] = findByText('누적 방송 시간');

            return results;
        });

        console.log('구조 분석 결과:', JSON.stringify(debugInfo, null, 2));

    } catch (e) {
        console.error('에러 발생:', e);
    } finally {
        await browser.close();
    }
})();
