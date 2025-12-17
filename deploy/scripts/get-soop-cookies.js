/**
 * SOOP 로그인 후 쿠키를 추출하는 스크립트
 * 
 * 사용법:
 * 1. npm run get-soop-cookies
 * 2. 브라우저가 열리면 SOOP에 로그인
 * 3. 로그인 완료 후 엔터 키 입력
 * 4. 쿠키가 .env.local에 자동 저장됨
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function getSoopCookies() {
    console.log('🚀 SOOP 쿠키 추출 시작...\n');

    const browser = await chromium.launch({
        headless: false // 브라우저를 보이게 함
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // SOOP 로그인 페이지로 이동
    console.log('📱 SOOP 로그인 페이지로 이동 중...');
    await page.goto('https://login.sooplive.co.kr/app/LoginHome');

    console.log('\n✋ 브라우저에서 SOOP에 로그인해주세요.');
    console.log('로그인 완료 후 이 터미널에서 엔터 키를 눌러주세요...\n');

    // 사용자 입력 대기
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    await new Promise(resolve => {
        rl.question('', () => {
            rl.close();
            resolve();
        });
    });

    // 쿠키 가져오기
    console.log('\n🍪 쿠키 추출 중...');
    const cookies = await context.cookies();

    if (cookies.length === 0) {
        console.log('❌ 쿠키를 찾을 수 없습니다. 로그인이 제대로 되었는지 확인해주세요.');
        await browser.close();
        return;
    }

    // 쿠키를 JSON 파일로 저장
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    const cookiePath = path.join(dataDir, 'soop-cookies.json');
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));

    console.log(`✅ 쿠키가 ${cookiePath}에 저장되었습니다!`);

    console.log('✅ 쿠키가 .env.local에 저장되었습니다!');
    console.log(`📝 총 ${cookies.length}개의 쿠키가 저장되었습니다.\n`);

    await browser.close();

    console.log('🎉 완료! 이제 공지사항 크롤러가 로그인된 상태로 작동합니다.');
}

getSoopCookies().catch(console.error);
