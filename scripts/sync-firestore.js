const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 환경 변수나 파일에서 키 로드 (사용자가 설정 필요)
// 실행 전: export FIREBASE_SERVICE_ACCOUNT_KEY='{...}'
// 또는 직접 파일 경로 지정

async function syncToFirestore() {
    const keyPath = path.join(process.cwd(), 'service-account.json');
    const dataPath = path.join(process.cwd(), 'data', 'crawl_data.json');

    if (!fs.existsSync(dataPath)) {
        console.error('❌ Data file not found:', dataPath);
        return;
    }

    let serviceAccount;
    // 1. 환경 변수 확인
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        } catch (e) {
            console.error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY');
        }
    }

    // 2. 파일 확인 (service-account.json)
    if (!serviceAccount && fs.existsSync(keyPath)) {
        serviceAccount = require(keyPath);
    }

    if (!serviceAccount) {
        console.error('❌ No Firebase Credentials found. Set FIREBASE_SERVICE_ACCOUNT_KEY or place service-account.json');
        return;
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();

    try {
        console.log('📦 Reading local data...');
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const json = JSON.parse(fileContent);
        const donations = json.data || [];

        console.log(`🔥 Uploading ${donations.length} items to Firestore (Single Document)...`);

        // Single Document Upload
        await db.collection('festival_data').doc('main_data').set({
            donations: donations,
            lastUpdated: new Date().toISOString()
        });

        console.log('✅ Upload Complete!');
    } catch (e) {
        console.error('Error uploading:', e);
    }
}

// 직접 실행 시
if (require.main === module) {
    syncToFirestore().then(() => process.exit());
}

module.exports = { syncToFirestore };
