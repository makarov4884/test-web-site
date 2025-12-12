@echo off
echo [INFO] Killing existing Node.js and Chrome processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM chrome.exe >nul 2>&1

echo [INFO] Setting memory limit to 4GB...
set NODE_OPTIONS=--max-old-space-size=4096

echo [INFO] Starting Next.js development server...
npm run dev
