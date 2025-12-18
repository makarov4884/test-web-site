import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('🔥 Firebase Admin Initialized');
        } catch (error) {
            console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
        }
    } else {
        console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not found. Firestore features will be disabled.');
    }
}

export const db = admin.apps.length ? admin.firestore() : null;
