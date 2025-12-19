# 실시간 별풍선 집계 시스템 - 사용 가이드

## ⚠️ 중요: 데이터 수집 방법

현재 `bcraping.kr` 사이트는 JavaScript로 데이터를 동적으로 로드하므로, 다음 두 가지 방법 중 하나를 선택하세요:

### 방법 1: 브라우저 콘솔에서 직접 데이터 추출 (권장)

1. **bcraping.kr 사이트 접속**
   ```
   https://bcraping.kr/monitor/pyh3646/289919534
   ```

2. **개발자 도구 열기** (F12)

3. **Console 탭에서 다음 코드 실행**:
   ```javascript
   // TUI Grid에서 데이터 추출
   const rows = document.querySelectorAll('.tui-grid-row-odd, .tui-grid-row-even');
   const donations = Array.from(rows).map(row => ({
     messageId: row.querySelector('[data-column-name="MESSAGE_ID"]')?.textContent?.trim() || '',
     createDate: row.querySelector('[data-column-name="CREATE_DATE"]')?.textContent?.trim() || '',
     ballonUserName: row.querySelector('[data-column-name="BALLON_USER_NAME"]')?.textContent?.trim() || '',
     ballonCount: parseInt(row.querySelector('[data-column-name="BALLON_COUNT"]')?.textContent?.replace(/,/g, '') || '0'),
     message: row.querySelector('[data-column-name="MESSAGE"]')?.textContent?.trim() || '',
     messageDate: row.querySelector('[data-column-name="MESSAGE_DATE"]')?.textContent?.trim() || '',
     targetBjName: row.querySelector('[data-column-name="TARGET_BJ_NAME"]')?.textContent?.trim() || '',
     targetBjGroup: row.querySelector('[data-column-name="TARGET_BJ_GROUP"]')?.textContent?.trim() || ''
   }));
   
   // JSON 복사
   copy(JSON.stringify(donations));
   console.log(`${donations.length}개의 데이터가 클립보드에 복사되었습니다!`);
   ```

4. **localhost:3000 접속**

5. **개발자 도구 열기** (F12)

6. **Console 탭에서 다음 코드 실행** (복사한 JSON 붙여넣기):
   ```javascript
   // 클립보드에서 복사한 JSON을 여기에 붙여넣기
   const donations = [여기에 붙여넣기];
   
   // API로 전송
   fetch('/api/upload', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ donations })
   }).then(r => r.json()).then(data => {
     console.log('업로드 성공:', data);
     location.reload(); // 페이지 새로고침
   });
   ```

### 방법 2: Playwright 설치 (디스크 공간 필요)

1. **디스크 공간 확보** (최소 500MB 필요)

2. **Playwright 설치**:
   ```bash
   npm install playwright
   npx playwright install chromium
   ```

3. **`app/api/crawl/route.ts` 수정**:
   ```typescript
   import { chromium } from 'playwright';
   import { NextResponse } from 'next/server';
   import { DonationData } from '@/types';

   export async function GET() {
     const browser = await chromium.launch({ headless: true });
     const page = await browser.newPage();
     
     try {
       await page.goto('https://bcraping.kr/monitor/pyh3646/289919534');
       await page.waitForSelector('.tui-grid-row-odd, .tui-grid-row-even', { timeout: 10000 });
       
       const donations = await page.evaluate(() => {
         const rows = document.querySelectorAll('.tui-grid-row-odd, .tui-grid-row-even');
         return Array.from(rows).map(row => ({
           messageId: row.querySelector('[data-column-name="MESSAGE_ID"]')?.textContent?.trim() || '',
           createDate: row.querySelector('[data-column-name="CREATE_DATE"]')?.textContent?.trim() || '',
           ballonUserName: row.querySelector('[data-column-name="BALLON_USER_NAME"]')?.textContent?.trim() || '',
           ballonCount: parseInt(row.querySelector('[data-column-name="BALLON_COUNT"]')?.textContent?.replace(/,/g, '') || '0'),
           message: row.querySelector('[data-column-name="MESSAGE"]')?.textContent?.trim() || '',
           messageDate: row.querySelector('[data-column-name="MESSAGE_DATE"]')?.textContent?.trim() || '',
           targetBjName: row.querySelector('[data-column-name="TARGET_BJ_NAME"]')?.textContent?.trim() || '',
           targetBjGroup: row.querySelector('[data-column-name="TARGET_BJ_GROUP"]')?.textContent?.trim() || ''
         }));
       });
       
       await browser.close();
       
       return NextResponse.json({
         success: true,
         data: donations,
         count: donations.length,
         timestamp: new Date().toISOString()
       });
     } catch (error) {
       await browser.close();
       throw error;
     }
   }
   ```

## 현재 상태

- ✅ UI/UX 완성
- ✅ 통계 계산 로직 완성
- ⚠️ 크롤링: 샘플 데이터 사용 중 (위 방법으로 실제 데이터 수집 가능)

## 실행

```bash
npm run dev
```

브라우저: `http://localhost:3000`
