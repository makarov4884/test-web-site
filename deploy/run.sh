#!/bin/bash

# 1. 크롤러 백그라운드 실행
echo "🕷️ Starting Crawler..."
node scripts/festival-crawler.js &

# 2. Next.js 웹 서버 실행 (포트 7860)
echo "🌐 Starting Web Server..."
npm start -- -p 7860 -H 0.0.0.0
