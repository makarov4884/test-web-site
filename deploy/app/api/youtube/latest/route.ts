import { NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

// Cache for 1 hour
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    let channelId = searchParams.get('channelId');

    if (!channelId) {
        return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    if (!YOUTUBE_API_KEY) {
        console.warn('YouTube API Key is missing');
        return NextResponse.json({ error: 'YouTube API key not configured', videoId: null }, { status: 200 }); // Return 200 to prevent client error
    }

    // Check cache first
    const cacheKey = `channel_${channelId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Returning cached data for:', channelId);
        return NextResponse.json(cached.data);
    }

    try {
        // If channelId starts with @, search by custom URL
        if (channelId.startsWith('@')) {
            const handle = channelId.substring(1); // Remove @

            // Try to search for channel by handle
            const searchResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${handle}&type=channel&part=snippet&maxResults=5`
            );

            if (!searchResponse.ok) {
                throw new Error('Failed to search for channel');
            }

            const searchData = await searchResponse.json();

            // Find exact match by checking custom URL
            let foundChannelId = null;
            if (searchData.items && searchData.items.length > 0) {
                for (const item of searchData.items) {
                    const cid = item.snippet.channelId;
                    const detailResponse = await fetch(
                        `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&id=${cid}&part=snippet`
                    );
                    if (detailResponse.ok) {
                        const detailData = await detailResponse.json();
                        if (detailData.items && detailData.items.length > 0) {
                            const customUrl = detailData.items[0].snippet.customUrl;
                            if (customUrl === channelId || customUrl === `@${handle}`) {
                                foundChannelId = cid;
                                break;
                            }
                        }
                    }
                }
            }

            if (!foundChannelId) {
                return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
            }

            channelId = foundChannelId;
        }

        // Get latest video from channel
        const videoUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet&order=date&maxResults=1&type=video`;
        console.log('Fetching videos from:', videoUrl.replace(YOUTUBE_API_KEY, 'API_KEY'));

        const response = await fetch(videoUrl);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('YouTube API Error Response:', response.status, errorText);

            // If Quota Exceeded (403), return stale cache if available or empty
            if (response.status === 403) {
                if (cached) {
                    console.log('Returning stale cached data due to API quota limit:', channelId);
                    return NextResponse.json(cached.data);
                }
                // Return empty object gracefully instead of failure
                return NextResponse.json({ error: 'YouTube API Quota Exceeded', videoId: null });
            }

            throw new Error(`Failed to fetch from YouTube API: ${response.status}`);
        }

        const data = await response.json();
        // console.log('YouTube API Response:', JSON.stringify(data, null, 2));

        if (!data.items || data.items.length === 0) {
            return NextResponse.json({ error: 'No videos found' }, { status: 404 });
        }

        const latestVideo = data.items[0];
        const videoId = latestVideo.id.videoId;
        const thumbnail = latestVideo.snippet.thumbnails.high.url;
        const title = latestVideo.snippet.title;

        // Get channel profile image (Only if quota permits, otherwise skip or handle error)
        let channelProfileImage = '';
        try {
            const channelInfoResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&id=${channelId}&part=snippet`
            );

            if (channelInfoResponse.ok) {
                const channelInfo = await channelInfoResponse.json();
                if (channelInfo.items && channelInfo.items.length > 0) {
                    channelProfileImage = channelInfo.items[0].snippet.thumbnails.default.url;
                }
            }
        } catch (e) {
            console.log('Failed to fetch channel icon, ignoring:', e);
        }

        const responseData = {
            videoId,
            thumbnail,
            title,
            channelProfileImage,
            url: `https://www.youtube.com/watch?v=${videoId}`
        };

        // Cache the response
        cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('YouTube API Error:', error);

        // Fallback: if cached exists, return it even if expired during error
        const cached = cache.get(`channel_${channelId}`);
        if (cached) {
            return NextResponse.json(cached.data);
        }

        return NextResponse.json({ error: error.message, videoId: null }, { status: 200 }); // Return 200 with null valid to avoid UI crash
    }
}
