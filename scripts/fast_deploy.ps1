$source = "e:\test1"
$dest = "e:\test1\deploy"

# Clean
if (Test-Path $dest) { 
    Write-Host "Cleaning deploy folder..."
    Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue 
}
New-Item -ItemType Directory -Path $dest | Out-Null

$dirs = @("app", "components", "lib", "public", "scripts", "data", "excel")
foreach ($dir in $dirs) {
    if (Test-Path "$source\$dir") {
        Write-Host "Copying $dir..."
        robocopy "$source\$dir" "$dest\$dir" /E /NFL /NDL /NJH /NJS /R:0 /W:0
    }
}

$files = @("Dockerfile", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "tailwind.config.ts", "postcss.config.mjs", "eslint.config.mjs", "notelink.json", "notices-cache.json", "next-env.d.ts", ".dockerignore")
foreach ($file in $files) {
    if (Test-Path "$source\$file") {
        robocopy "$source" "$dest" $file /NFL /NDL /NJH /NJS /R:0 /W:0
    }
}

Write-Host "Deployment files prepared in $dest"
