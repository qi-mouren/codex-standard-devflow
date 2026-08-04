# release-launch-lock.ps1 - 释放全局启动锁（仅释放自己持有的锁）
# 用法: ./release-launch-lock.ps1 -ProjectPath <项目路径> -TaskName <task_name>
# 退出码: 0=已释放/无需释放 | 1=锁由其他进程持有（不释放）

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [Parameter(Mandatory = $true)][string]$TaskName
)

$ErrorActionPreference = "Stop"

$lockRoot = $null
foreach ($candidate in @((Join-Path 'C:\tmp' 'standard-devflow-locks'), (Join-Path $env:TEMP 'standard-devflow-locks'))) {
    try { New-Item -ItemType Directory -Path $candidate -Force -ErrorAction Stop | Out-Null; $lockRoot = $candidate; break } catch {}
}
if (-not $lockRoot) { throw 'no writable lock directory' }
$lockFile = Join-Path $lockRoot 'launch.lock'

if (-not (Test-Path $lockFile)) {
    Write-Host "no lock to release"
    exit 0
}

$existing = Get-Content $lockFile -Raw
try {
    $j = $existing | ConvertFrom-Json
    if (($j.pid -eq $PID) -and ($j.task -eq $TaskName)) {
        Remove-Item -LiteralPath $lockFile -Force
        Write-Host "released: $lockFile"
        exit 0
    } else {
        Write-Host "lock owned by pid=$($j.pid) task=$($j.task), not releasing" -ForegroundColor Yellow
        exit 1
    }
} catch {
    # 锁内容损坏视为残留，清理
    Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue
    Write-Host "cleaned corrupt lock: $lockFile"
    exit 0
}