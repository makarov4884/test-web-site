# 실시간 별풍선 집계 시스템

## 프로젝트 개요
SOOP(구 아프리카TV) 별풍선 데이터를 실시간으로 수집하고 통계를 집계하는 웹 애플리케이션입니다.

## 주요 기능
- ✅ 실시간 데이터 수집 (30초 자동 새로고침)
- ✅ BJ별 별풍선 순위 및 통계
- ✅ 후원자별 별풍선 순위 및 통계
- ✅ 실시간 전체 통계 대시보드
- ✅ 최근 후원 내역 표시
- ✅ 반응형 디자인 (모바일/데스크톱)
- ✅ 다크 테마 & 애니메이션 그라데이션 배경

## 기술 스택
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Parsing**: Cheerio (현재는 샘플 데이터 사용)
- **Date Formatting**: date-fns

## 프로젝트 구조
```
e:\excel\
├── app/
│   ├── api/
│   │   ├── crawl/
│   │   │   └── route.ts      # 데이터 크롤링 API
│   │   └── stats/
│   │       └── route.ts      # 통계 계산 API
│   ├── globals.css           # 전역 스타일
│   ├── layout.tsx            # 레이아웃
│   └── page.tsx              # 메인 페이지
├── types/
│   └── index.ts              # TypeScript 타입 정의
└── package.json
```

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 브라우저에서 접속
```
http://localhost:3000
```

## 현재 상태

### ✅ 완료된 기능
1. **UI/UX**
   - 프리미엄 다크 테마 디자인
   - Glassmorphism 효과
   - 애니메이션 그라데이션 배경
   - 반응형 레이아웃

2. **통계 기능**
   - BJ별 집계 (총 별풍선, 후원 건수, 최고 후원자)
   - 후원자별 집계 (총 별풍선, 후원 건수, 후원한 BJ 목록)
   - 실시간 전체 통계

3. **자동 새로고침**
   - 30초마다 자동 데이터 갱신
   - 수동 새로고침 버튼
   - 자동 새로고침 ON/OFF 토글

### ⚠️ 개선 필요 사항

#### 실제 크롤링 구현
현재는 샘플 데이터를 사용하고 있습니다. 실제 데이터를 수집하려면 다음 방법 중 하나를 선택해야 합니다:

**방법 1: Playwright 사용 (권장)**
```bash
npm install playwright
npx playwright install chromium
```

`app/api/crawl/route.ts` 수정:
```typescript
import { chromium } from 'playwright';

export async function GET() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://bcraping.kr/monitor/pyh3646/289919534');
  await page.waitForSelector('.tui-grid-row-odd, .tui-grid-row-even');
  
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
      targetBjGroup: row.querySelector('[data-column-name="TARGET_BJ_GROUP"]')?.textContent?.trim() || '',
    }));
  });
  
  await browser.close();
  
  return NextResponse.json({
    success: true,
    data: donations,
    count: donations.length,
    timestamp: new Date().toISOString()
  });
}
```

**방법 2: API 엔드포인트 사용**
만약 bcraping.kr에서 JSON API를 제공한다면, 직접 API를 호출하는 것이 더 효율적입니다.

**방법 3: 데이터베이스 연동**
- Prisma + PostgreSQL/MySQL
- 크롤링한 데이터를 DB에 저장
- 히스토리 관리 및 통계 분석

## 추가 개선 아이디어

### 1. 차트 추가
```bash
npm install recharts
```
- 시간대별 별풍선 추이 그래프
- BJ별 비교 차트
- 후원자별 기여도 파이 차트

### 2. 필터링 기능
- 날짜 범위 선택
- BJ별 필터
- 별풍선 금액 범위 필터

### 3. 알림 기능
- 특정 금액 이상 후원 시 알림
- 신규 BJ 등록 알림

### 4. 엑셀 내보내기
```bash
npm install xlsx
```
- 통계 데이터 Excel 다운로드
- CSV 형식 지원

### 5. 인증 시스템
- 관리자 로그인
- 데이터 접근 권한 관리

## 문제 해결

### 크롤링이 작동하지 않는 경우
1. 네트워크 연결 확인
2. 대상 웹사이트의 HTML 구조 변경 여부 확인
3. CORS 정책 확인
4. Rate Limiting 확인

### 성능 최적화
1. 데이터 캐싱 (Redis)
2. API 응답 압축
3. 이미지 최적화
4. 코드 스플리팅

## 라이선스
MIT

## 문의
프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.
