import { crawlNotices } from '../deploy/lib/notice-crawler';

async function main() {
    console.log('🔄 공지사항 크롤러 시작...');
    try {
        const results = await crawlNotices();
        console.log(`✅ 크롤링 완료! 총 ${results.length}개의 최신 공지사항을 확인했습니다.`);
    } catch (error) {
        console.error('❌ 크롤러 실행 중 오류 발생:', error);
    }
}

main();
