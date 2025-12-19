$ErrorActionPreference = "Stop"

Write-Host "📦 AWS 배포용 번들링 시작..." -ForegroundColor Cyan

# 제외할 폴더 및 파일 패턴
$excludes = @(
    "node_modules",
    ".next",
    ".git",
    ".env.local",
    "*.zip",
    "deploy/bundle.zip"
)

# 임시 폴더 생성
$tempDir = "deploy/temp_build"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# 파일 복사 (Robocopy 사용이 빠르지만 호환성을 위해 단순 Copy 사용하되 주요 폴더만)
Write-Host "📂 소스 코드 복사 중..." -ForegroundColor Gray
Copy-Item -Path "package*.json" -Destination $tempDir
Copy-Item -Path "next.config.*" -Destination $tempDir -ErrorAction SilentlyContinue
Copy-Item -Path "tsconfig.json" -Destination $tempDir
Copy-Item -Path "app" -Destination $tempDir -Recurse
Copy-Item -Path "components" -Destination $tempDir -Recurse
Copy-Item -Path "lib" -Destination $tempDir -Recurse
Copy-Item -Path "public" -Destination $tempDir -Recurse
Copy-Item -Path "scripts" -Destination $tempDir -Recurse
Copy-Item -Path "types" -Destination $tempDir -Recurse
Copy-Item -Path "data" -Destination $tempDir -Recurse
Copy-Item -Path "excel" -Destination $tempDir -Recurse

# 설치 스크립트도 포함
Copy-Item -Path "deploy/install-aws.sh" -Destination $tempDir

# 압축
$zipPath = "deploy/project-bundle.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

Write-Host "🗜️ 압축 중..." -ForegroundColor Gray
Compress-Archive -Path "$tempDir/*" -DestinationPath $zipPath

# 임시 폴더 삭제
Remove-Item $tempDir -Recurse -Force

Write-Host "✅ 번들링 완료: $zipPath" -ForegroundColor Green
Write-Host "이제 이 파일을 AWS 서버로 전송하면 됩니다." -ForegroundColor White
