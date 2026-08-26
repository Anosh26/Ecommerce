# PowerShell script to stop monolithic containers

Write-Host "Stopping and removing monolithic containers..." -ForegroundColor Yellow

docker stop paaptol-website paaptol-db 2>$null
docker rm paaptol-website paaptol-db 2>$null
docker network rm paaptol-monolith-net 2>$null

Write-Host "Cleanup completed successfully!" -ForegroundColor Green
