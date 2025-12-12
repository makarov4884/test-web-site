"use server";

export interface StreamerInfo {
    id: string; // AfreecaTV ID
    nickname: string;
    isLive: boolean;
    viewers: number;
    thumbnail: string;
    title: string;
    url: string;
}

export async function getLiveStatus(streamerIds: string[]): Promise<StreamerInfo[]> {
    const results = await Promise.all(
        streamerIds.map(async (id) => {
            try {
                // Fetch from AfreecaTV Mobile API (More reliable for viewer count)
                const res = await fetch(`https://api.m.afreecatv.com/broad/a/watch?bj_id=${id}`, {
                    method: 'POST',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    body: `bj_id=${id}`
                });

                const json = await res.json();
                const data = json.data;

                if (data && data.broad_no) {
                    // is Live
                    return {
                        id,
                        nickname: data.user_nick || id,
                        isLive: true,
                        viewers: parseInt(data.view_cnt || '0'),
                        thumbnail: data.thumbnail || `https://liveimg.afreecatv.com/m/${data.broad_no}?t=${Date.now()}`,
                        title: decodeURIComponent(data.broad_title || ''),
                        url: `https://play.afreecatv.com/${id}/${data.broad_no}`
                    };
                }

                return {
                    id,
                    nickname: id,
                    isLive: false,
                    viewers: 0,
                    thumbnail: '',
                    title: '',
                    url: `https://example.com` // Placeholder
                };

            } catch (error) {
                console.error(`Failed to fetch for ${id}:`, error);
                return {
                    id,
                    nickname: id,
                    isLive: false,
                    viewers: 0,
                    thumbnail: '',
                    title: '',
                    url: `https://example.com`
                };
            }
        })
    );

    // Return sorted by viewers descending
    return results.filter(s => s.isLive).sort((a, b) => b.viewers - a.viewers);
}
