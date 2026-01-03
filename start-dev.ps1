# Warcraft 3 Reforged Website - Development Startup Script

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Warcraft 3 Reforged Website" -ForegroundColor Yellow
Write-Host "  Starting Development Environment" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "Checking MongoDB status..." -ForegroundColor Green
$mongoProcess = Get-Process mongod -ErrorAction SilentlyContinue

if ($mongoProcess) {
    Write-Host "✓ MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "⚠ MongoDB is NOT running!" -ForegroundColor Red
    Write-Host "  Please start MongoDB before running the app:" -ForegroundColor Yellow
    Write-Host "  - Run 'mongod' in another terminal" -ForegroundColor Yellow
    Write-Host "  - Or use MongoDB Atlas (cloud)" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit
    }
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Green
Write-Host "- Backend API will run on: http://localhost:5000" -ForegroundColor Cyan
Write-Host "- Frontend will run on: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""

# Start both servers concurrently
npm run dev
