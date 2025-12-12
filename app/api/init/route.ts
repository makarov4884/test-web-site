import { startAutoUpdate } from '@/lib/notice-cache';

// Start notice cache auto-update on server start
if (typeof window === 'undefined') {
    startAutoUpdate();
    console.log('[Server] Notice cache auto-update initialized');
}

export { };
