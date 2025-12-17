import { NextResponse } from 'next/server';
import { getCachedNotices } from '@/lib/notice-cache';
import { getPosts } from '@/app/actions';

export const dynamic = 'force-dynamic';

interface NotificationItem {
    id: string;
    type: 'notice' | 'post' | 'comment';
    title: string;
    content: string; // Preview content
    author: string;
    date: string;
    link: string;
    isNew?: boolean;
}

export async function GET() {
    try {
        const notifications: NotificationItem[] = [];
        const now = new Date();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        // 1. Get Notices
        const notices = await getCachedNotices();

        if (notices.length === 0) {
            console.log('[Notification API] Cache empty, triggering update...');
            // Fire and forget
            import('@/lib/notice-cache').then(mod => mod.updateNoticesCache().catch(e => console.error(e)));
        }

        notices.forEach(notice => {
            const noticeDate = new Date(notice.date);
            // Check if within 24 hours
            if (now.getTime() - noticeDate.getTime() < ONE_DAY * 3) { // Show notices from last 3 days
                notifications.push({
                    id: `notice-${notice.id}`,
                    type: 'notice',
                    title: `[공지] ${notice.streamerName}`,
                    content: notice.title,
                    author: notice.streamerName,
                    date: notice.date,
                    link: '/notice'
                });
            }
        });

        // 2. Get Posts and Comments
        const posts = await getPosts();
        posts.forEach(post => {
            const postDate = new Date(post.date.replace(/\./g, '-')); // Handle YYYY.MM.DD format if needed

            // New Post
            // Note: post.date might be just "YYYY.MM.DD", so it's not precise time. 
            // We'll treat today's posts as new.
            const todayStr = now.toISOString().split('T')[0].replace(/-/g, '.');
            if (post.date === todayStr || post.date.includes(todayStr) || (now.getTime() - postDate.getTime() < ONE_DAY)) {
                notifications.push({
                    id: `post-${post.id}`,
                    type: 'post',
                    title: `[새글] ${post.title}`,
                    content: post.content.substring(0, 30) + (post.content.length > 30 ? '...' : ''),
                    author: post.author,
                    date: postDate.toISOString(), // Approximation
                    link: `/board/free/${post.id}`
                });
            }

            // New Comments
            if (post.comments) {
                post.comments.forEach(comment => {
                    // Comment date format needs to be checked. Assuming similar YYYY.MM.DD or ISO
                    // If comment.date includes time, we can be precise.
                    // Assuming comment.date is a string.

                    // Simple check: if comment date string contains today's date
                    if (comment.date.includes(todayStr)) {
                        notifications.push({
                            id: `comment-${comment.id}-${post.id}`,
                            type: 'comment',
                            title: `[댓글] ${post.title}`,
                            content: `${comment.author}: ${comment.content}`,
                            author: comment.author,
                            date: comment.date, // Use raw date string for now
                            link: `/board/free/${post.id}`
                        });
                    }
                });
            }
        });

        // Sort by date descending
        // We might need to normalize dates for sorting
        notifications.sort((a, b) => {
            // Try to parse dates. If fails, put at bottom.
            const dateA = new Date(a.date).getTime() || 0;
            const dateB = new Date(b.date).getTime() || 0;
            return dateB - dateA;
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('[Notification API] Error:', error);
        return NextResponse.json([]);
    }
}
