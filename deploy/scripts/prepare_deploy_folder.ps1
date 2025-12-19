$source = "e:\test1"
$dest = "e:\test1\deploy"

# Ensure deploy directory exists
if (!(Test-Path -Path $dest)) {
    New-Item -ItemType Directory -Path $dest
}

# Clean deploy directory contents (files and subdirectories)
Get-ChildItem -Path $dest -Recurse | Remove-Item -Recurse -Force

# Define items to copy
$items = @(
    "app",
    "components",
    "lib",
    "public",
    "scripts",
    "data",
    "excel",
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "tailwind.config.ts",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "notelink.json",
    "notices-cache.json",
    "next-env.d.ts",
    "types",
    ".dockerignore"
)

foreach ($item in $items) {
    $srcPath = Join-Path $source $item
    $destPath = Join-Path $dest $item
    
    if (Test-Path $srcPath) {
        if ($item -ne "package.json") {
             Write-Host "Copying $item..."
        }
        
        if (Test-Path -Path $srcPath -PathType Container) {
             # Copy directory
             Copy-Item -Path $srcPath -Destination $dest -Recurse -Force
        } else {
             # Copy file
             Copy-Item -Path $srcPath -Destination $dest -Force
        }
    } else {
        Write-Host "Skipping $item (not found)"
    }
}

Write-Host "Deploy folder updated successfully."
