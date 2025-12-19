# Playwright가 포함된 공식 이미지 사용 (설정 간소화)
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm ci

# 소스 코드 복사
COPY . .

# Next.js 빌드
RUN npm run build

# 포트 노출
EXPOSE 3000

# 서버 실행
CMD ["npm", "start"]
