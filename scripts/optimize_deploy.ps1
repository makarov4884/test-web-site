$deployPath = "e:\test1\deploy"

# Remove unnecessary files to speed up upload
$excludeItems = @(
    "deploy\public\processed_signatures", # Large images
    "deploy\excel\*.xlsx",                # Large Excel files
    "deploy\excel\*.csv",
    "deploy\public\images\large_assets",  # Any other large assets
    "deploy\node_modules",                # Should not be there but check
    "deploy\**\*.map"                     # Source maps
)

Write-Host "Cleaning up deploy folder for faster upload..."

# Remove processed signatures directory if it exists
if (Test-Path "$deployPath\public\processed_signatures") {
    Remove-Item "$deployPath\public\processed_signatures" -Recurse -Force
    Write-Host "Removed processed_signatures"
}

# Remove Excel binaries, keep just current data
Get-ChildItem "$deployPath\excel" -Include *.xlsx, *.csv -Recurse | Where-Object { $_.Name -notmatch "crawl_data" } | Remove-Item -Force
Write-Host "Removed old Excel files"

# Remove any git folder if copied
if (Test-Path "$deployPath\.git") {
    Remove-Item "$deployPath\.git" -Recurse -Force
}

Write-Host "Cleanup complete."
