const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugStats() {
    console.log('Starting stats debug...');
    const browser = await puppeteer.launch({
        headless: true, // UI 확인을 위해 헤드리스 끔
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1200 });

    try {
        await page.goto('https://bcraping.kr/monitor/pyh3646', { waitUntil: 'domcontentloaded' });
        console.log('Page loaded');

        // 통계 탭 클릭
        await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, a, li, span'));
            const target = elements.find(el => el.textContent.trim() === '통계');
            if (target) target.click();
        });

        console.log('Clicked Stats tab, waiting...');
        await new Promise(r => setTimeout(r, 4000));

        // 전체 컨텐츠 캡처
        const content = await page.content();
        fs.writeFileSync('stats-content.html', content);
        console.log('Saved stats-content.html');

        // 스크린샷 캡처
        await page.screenshot({ path: 'stats-tab.png', fullPage: true });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

debugStats();
