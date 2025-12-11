# Railway Migration Fix Script for PowerShell
# This script resolves failed migrations and deploys them to Railway

Write-Host "🔧 Railway Migration Fix Script`n" -ForegroundColor Cyan

# Get DATABASE_PUBLIC_URL from Railway
Write-Host "📡 Getting Railway DATABASE_URL..." -ForegroundColor Yellow
$railwayOutput = railway variables --service daily-cook 2>&1 | Out-String

# Extract DATABASE_PUBLIC_URL
$dbUrl = $null
if ($railwayOutput -match 'DATABASE_PUBLIC_URL.*?postgresql://([^\s]+)') {
    $dbUrl = "postgresql://$($matches[1])"
    # Clean up any line breaks or extra characters
    $dbUrl = $dbUrl -replace "`n|`r|\s", ""
    $dbUrl = $dbUrl -replace "│", ""
    $dbUrl = $dbUrl.Trim()
}

if (-not $dbUrl -or -not $dbUrl.StartsWith("postgresql://")) {
    Write-Host "❌ Could not extract DATABASE_PUBLIC_URL from Railway" -ForegroundColor Red
    Write-Host "`nTrying alternative method..." -ForegroundColor Yellow
    
    # Try to get it line by line
    $lines = $railwayOutput -split "`n"
    $collecting = $false
    $urlParts = @()
    
    foreach ($line in $lines) {
        if ($line -match "DATABASE_PUBLIC_URL") {
            $collecting = $true
            continue
        }
        if ($collecting) {
            if ($line -match "postgresql://") {
                $urlParts += $line
            }
            if ($line -match "──") {
                break
            }
        }
    }
    
    if ($urlParts.Count -gt 0) {
        $dbUrl = ($urlParts -join "").Trim() -replace "[│\s]", ""
    }
}

if (-not $dbUrl -or -not $dbUrl.StartsWith("postgresql://")) {
    Write-Host "❌ Could not get Railway DATABASE_URL automatically" -ForegroundColor Red
    Write-Host "`n💡 Please run:" -ForegroundColor Yellow
    Write-Host "   railway variables --service daily-cook" -ForegroundColor White
    Write-Host "   Then manually set: `$env:DATABASE_URL='your-connection-string'" -ForegroundColor White
    exit 1
}

Write-Host "✅ Got DATABASE_URL from Railway`n" -ForegroundColor Green

# Set environment variable
$env:DATABASE_URL = $dbUrl

# Resolve failed migrations
Write-Host "🔧 Resolving failed migrations..." -ForegroundColor Yellow

# Try to resolve common failed migrations
$failedMigrations = @("20240101000000_init", "20250120000000_add_comprehensive_indexes")

foreach ($migration in $failedMigrations) {
    Write-Host "  Attempting to resolve $migration..." -ForegroundColor Cyan
    try {
        npx prisma migrate resolve --rolled-back $migration 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Resolved: $migration" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Could not resolve $migration (might already be resolved)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not resolve $migration" -ForegroundColor Yellow
    }
}

# Deploy migrations
Write-Host "`n🚀 Deploying migrations..." -ForegroundColor Yellow
try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migrations deployed successfully!`n" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n❌ Migration deployment failed`n" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Migration deployment failed: $_`n" -ForegroundColor Red
    exit 1
}



