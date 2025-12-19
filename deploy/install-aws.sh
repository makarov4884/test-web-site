#!/bin/bash

# 에러 발생 시 중단
set -e

echo "🚀 AWS EC2 배포 및 실행 스크립트 시작..."

# 1. 시스템 업데이트
echo "📦 시스템 패키지 업데이트 중..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. Swap 메모리 설정 (무료 티어 메모리 부족 방지)
if [ $(sudo swapon --show | wc -l) -eq 0 ]; then
    echo "💾 Swap(2GB) 메모리 생성 중..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 3. 필수 패키지 설치
echo "🛠️ 필수 도구 설치 중..."
sudo apt-get install -y git curl unzip build-essential

# 4. Node.js v20 설치
if ! command -v node &> /dev/null; then
    echo "🟢 Node.js v20 설치 중..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 5. PM2 설치 (무중단 실행)
if ! command -v pm2 &> /dev/null; then
    echo "🔄 PM2 설치 중..."
    sudo npm install -g pm2
fi

# 6. 프로젝트 압축 해제
PROJECT_DIR="/home/ubuntu/festival-app"
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p $PROJECT_DIR
fi

if [ -f "project-bundle.zip" ]; then
    echo "📂 프로젝트 압축 해제 중..."
    unzip -o project-bundle.zip -d $PROJECT_DIR
else
    echo "⚠️ project-bundle.zip 파일이 없습니다. 파일 전송 후 다시 실행해주세요."
    exit 1
fi

cd $PROJECT_DIR

# 7. 의존성 설치 및 빌드
echo "📦 npm 패키지 설치 중..."
npm ci

echo "🎭 Playwright 브라우저 설치 중..."
npx playwright install-deps
npx playwright install chromium

echo "🏗️ Next.js 앱 빌드 중..."
npm run build

# 8. PM2로 서버 실행
echo "🚀 서버 실행 중..."
pm2 delete festival || true
pm2 start npm --name "festival" -- start

# 9. 부팅 시 자동 실행 설정
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "---------------------------------------------------------"
echo "🎉 배포 완료! http://$(curl -s ifconfig.me):3000 로 접속해보세요."
echo "---------------------------------------------------------"
