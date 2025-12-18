# Playwright가 포함된 공식 이미지 사용 (브라우저 설치 번거로움 해결)
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm ci

# 소스 코드 복사
COPY . .

# 프로덕션 환경 변수 설정
ENV NODE_ENV=production

# 크롤러 실행 (웹 서버가 아닌 크롤러만 실행)
CMD ["node", "scripts/festival-crawler.js"]
