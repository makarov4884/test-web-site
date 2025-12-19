const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 설정
const TARGET_URL = 'https://bcraping.kr/monitor/pyh3646/289919534';
const RELOAD_INTERVAL = 2000; // 2초 (더 빠른 실시간 반영)

// 자동 스크롤 함수
async function autoScroll(page: any) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 100; // 한 번에 스크롤할 거리
            const timer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // 페이지 끝에 도달하면 종료
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100); // 100ms마다 스크롤
        });
    });
    console.log('✅ Scrolling completed');
}

async function startCrawler() {
    const flagPath = path.join(process.cwd(), 'data', 'crawler_on.flag');

    console.log('🚀 Crawler process started. Waiting for ON signal...');

    while (true) {
        if (!fs.existsSync(flagPath)) {
            // OFF 상태일 때: 3초마다 체크하며 대기
            // console.log('zzz... (Crawler OFF)');
            await new Promise(r => setTimeout(r, 3000));
            continue;
        }

        console.log('🟢 Crawler is ON! Starting collection...');
        // ON 상태일 때: 기존 루프 진입 (아래 로직 실행)
        break;
    }

    const dataPath = path.join(process.cwd(), 'data', 'crawl_data.json');
    const dataDir = path.dirname(dataPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();
    let dataQueue: any[] = [];

    // 1. 네트워크 패킷 감청 (가장 정확함)
    page.on('response', async (response: any) => {
        const type = response.request().resourceType();
        if (['image', 'stylesheet', 'font', 'script'].includes(type)) return;

        try {
            const text = await response.text();
            // JSON 형태의 응답만 타겟팅 (조건 완화)
            if ((text.startsWith('{') || text.startsWith('[')) && text.length > 10) {
                const json = JSON.parse(text);
                let items: any[] = [];

                // 다양한 JSON 구조 대응
                if (Array.isArray(json)) items = json;
                else if (json.data && Array.isArray(json.data)) items = json.data;
                else if (json.rows && Array.isArray(json.rows)) items = json.rows;
                else if (json.list && Array.isArray(json.list)) items = json.list;

                // bcraping 특유의 전역 데이터 구조일 경우 처리
                if (items.length === 0 && json.gridData) items = json.gridData;

                if (items.length > 0) {
                    console.log(`📡 Packet Captured: ${items.length} items from ${response.url().substring(0, 30)}...`);
                    // 원본 데이터를 내부 포맷으로 변환하여 큐에 적재
                    items.forEach((item: any) => {
                        const parsed = parseItem(item);
                        if (parsed) dataQueue.push(parsed);
                    });
                }
            }
        } catch (e) {
            // JSON 파싱 실패 등은 무시 (HTML 응답일 수 있음)
        }
    });

    // 스마트 폴링 설정
    let pollInterval = 2000; // 초기: 2초 (활성 모드)
    let lastDataTime = Date.now();
    const IDLE_THRESHOLD = 5 * 60 * 1000; // 5분간 데이터 없으면 대기 모드
    const IDLE_INTERVAL = 60 * 1000; // 대기 모드일 땐 1분마다 확인
    const ACTIVE_INTERVAL = 2000; // 활성 모드일 땐 2초마다 확인

    console.log('✨ Smart Crawler V4 Started: Auto-detecting activity...');

    // 메인 루프
    while (true) {
        try {
            const isIdle = (Date.now() - lastDataTime) > IDLE_THRESHOLD;
            pollInterval = isIdle ? IDLE_INTERVAL : ACTIVE_INTERVAL;

            if (isIdle) {
                console.log(`💤 Idle Mode... Checking every ${IDLE_INTERVAL / 1000}s`);
            }

            // 페이지 로딩 (Network Idle 상태까지 대기하여 모든 패킷 수신)
            // 대기 모드일 땐 리소스 절약을 위해 timeout 짧게
            try {
                await page.goto(TARGET_URL, {
                    waitUntil: 'domcontentloaded',
                    timeout: isIdle ? 10000 : 30000
                });
            } catch (e) { } // 타임아웃 무시

            // 추가 데이터 로딩 대기
            await new Promise(r => setTimeout(r, 2000));

            // 자동 스크롤 (활성 모드일 때만 적극적으로 수행)
            if (!isIdle) {
                // console.log('📜 Auto-scrolling...');
                await autoScroll(page);
            }

            // DOM 스크래핑
            const domItems = await page.evaluate(() => {
                const results: any[] = [];
                const rows = document.querySelectorAll('.tui-grid-rside-area .tui-grid-body-area .tui-grid-table tr');
                rows.forEach(row => {
                    const getText = (idx: number) => row.querySelector(`td:nth-child(${idx}) .tui-grid-cell-content`)?.textContent?.trim() || '';
                    const date = getText(2);
                    const user = getText(3);
                    const count = getText(4);

                    if (date && user && count) {
                        results.push({ date, user, count }); // 식별용 최소 데이터
                    }
                });
                return results;
            });

            // 데이터 변화 감지
            if (domItems.length > 0) {
                // 실제 저장 로직은 기존대로 수행 (패킷 또는 DOM)
                // 여기선 "새로운 데이터가 있는가?"만 판단하여 lastDataTime 갱신
                // (간단히: 목록 맨 위 시간이 최근 시간이면 활성 상태로 간주)
                lastDataTime = Date.now(); // 데이터가 보이면 무조건 활성 연장 (단순화)
            }

            // ... 기존 저장 로직은 위쪽 listener와 아래쪽에 통합 ...
            // (DOM 데이터 저장은 dataQueue를 통해 처리됨)

            // DOM 데이터를 큐에 넣기 (기존 로직 복원)
            const scrapedItems = await page.evaluate(() => {
                const results: any[] = [];
                const rows = document.querySelectorAll('.tui-grid-rside-area .tui-grid-body-area .tui-grid-table tr');
                rows.forEach(row => {
                    const getText = (idx: number) => row.querySelector(`td:nth-child(${idx}) .tui-grid-cell-content`)?.textContent?.trim() || '';
                    const date = getText(2);
                    const user = getText(3);
                    const count = getText(4);
                    const target = getText(5);
                    let msg = getText(6);

                    msg = msg.replace(/\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g, '').trim();
                    msg = msg.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g, '').trim();

                    if (date && user && count) {
                        results.push({
                            messageId: `${date}-${user}-${count}`,
                            createDate: date,
                            ballonUserName: user,
                            ballonCount: parseInt(count.replace(/,/g, ''), 10),
                            targetBjName: target,
                            message: msg,
                            isCancel: row.classList.contains('cancel') || count.includes('-')
                        });
                    }
                });
                return results;
            });

            if (scrapedItems.length > 0) {
                dataQueue.push(...scrapedItems);
            }

            if (dataQueue.length > 0) {
                // 새 데이터가 실질적으로 들어오면 활성 시간 갱신
                lastDataTime = Date.now();
                saveData(dataPath, dataQueue);
                dataQueue = [];
            }

        } catch (error: any) {
            console.error(`❌ Crawl Error: ${error.message}`);
            await new Promise(r => setTimeout(r, 5000));
        }

        // 가변 딜레이 적용
        await new Promise(r => setTimeout(r, pollInterval));
    }
}

// 헬퍼: 원본 JSON 아이템 -> 내부 포맷 변환
function parseItem(item: any): any | null {
    // 키 이름 불확실성을 다루기 위한 유연한 매핑
    const keys = Object.keys(item);
    const findKey = (candidates: string[]) => keys.find(k => candidates.some(c => k.toLowerCase().includes(c)));

    const kDate = findKey(['date', 'time', 'created']);
    const kUser = findKey(['user', 'nick', 'name', 'sender']);
    const kCount = findKey(['count', 'balloon', 'coin', 'amount', 'cnt']);
    const kBj = findKey(['bj', 'target', 'receiver']);
    const kMsg = findKey(['msg', 'message', 'chat', 'content']);

    // 필수 필드 없으면 무효 데이터
    if (!kUser || !kCount) return null;

    const createDate = kDate ? item[kDate] : new Date().toISOString();
    const ballonUserName = item[kUser];
    const ballonCountRaw = item[kCount];
    const ballonCount = typeof ballonCountRaw === 'string' ? parseInt(ballonCountRaw.replace(/,/g, ''), 10) : ballonCountRaw;

    // ID 생성 (유니크해야 함)
    const messageId = `${createDate}-${ballonUserName}-${ballonCount}`;

    return {
        messageId,
        createDate,
        ballonUserName,
        ballonCount,
        targetBjName: kBj ? item[kBj] : '',
        message: kMsg ? item[kMsg] : '',
        isCancel: false
    };
}

// 헬퍼: 날짜 형식 통일 (MM-DD HH:MM:SS -> YYYY-MM-DD HH:MM:SS)
function normalizeDateFormat(dateStr: string): string {
    // 이미 YYYY-MM-DD 형식이면 그대로 반환
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr;
    }

    // MM-DD HH:MM:SS 형식을 YYYY-MM-DD HH:MM:SS로 변환
    const match = dateStr.match(/^(\d{2})-(\d{2})\s+(.+)$/);
    if (match) {
        const [_, month, day, time] = match;
        const year = new Date().getFullYear();
        return `${year}-${month}-${day} ${time}`;
    }

    return dateStr;
}

// 헬퍼: 파일 저장 (병합)
function saveData(filePath: string, newItems: any[]) {
    let existingItems: any[] = [];
    if (fs.existsSync(filePath)) {
        try {
            existingItems = JSON.parse(fs.readFileSync(filePath, 'utf-8')).data || [];
        } catch (e) { }
    }

    // 날짜 형식 통일 적용
    const normalizedNewItems = newItems.map(item => ({
        ...item,
        createDate: normalizeDateFormat(item.createDate),
        messageId: `${normalizeDateFormat(item.createDate)}-${item.ballonUserName}-${item.ballonCount}`
    }));

    // Map을 이용한 중복 제거 (messageId 기준)
    const itemMap = new Map();
    existingItems.forEach(i => itemMap.set(i.messageId, i));
    normalizedNewItems.forEach(i => itemMap.set(i.messageId, i)); // 신규 데이터가 덮어씀 (업데이트 효과)

    // 날짜 내림차순 정렬
    const merged = Array.from(itemMap.values()).sort((a: any, b: any) => {
        return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
    });

    fs.writeFileSync(filePath, JSON.stringify({
        success: true,
        data: merged,
        lastUpdate: new Date().toISOString(),
        source: 'hybrid_v3_deep'
    }, null, 2));

    console.log(`💾 Data Saved. Total: ${merged.length} (Latest: ${merged[0]?.createDate || 'N/A'})`);
}

startCrawler();
