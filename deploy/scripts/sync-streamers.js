const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function syncStreamersToKeywords() {
    try {
        console.log('🔄 Syncing streamers from database to keywords.json...');

        const streamers = await prisma.streamer.findMany({
            select: {
                name: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        const keywords = streamers.map(streamer => ({
            bjName: streamer.name,
            keywords: [streamer.name]
        }));

        const keywordsPath = path.join(process.cwd(), 'data', 'keywords.json');
        fs.writeFileSync(keywordsPath, JSON.stringify(keywords, null, 2));

        console.log(`✅ Synced ${keywords.length} streamers to keywords.json`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

syncStreamersToKeywords();
