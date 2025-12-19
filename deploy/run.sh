#!/bin/bash

# 1. Start Next.js server in the background
npm run build
npm start &

# 2. Wait for server to be ready (optional but good practice)
sleep 10

# 3. Start Crawler in the background
node scripts/festival-crawler.js
