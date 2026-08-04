# release-launch-lock.ps1 - 释放全局启动锁
# 用法: ./release-launch-lock.ps1 -ProjectPath <项目路径> -TaskName <task_name>
# 退出码: 0=已释放/无需释放 | 1=锁由其他项目+任务持有（不释放）
# 说明: 持有者是"项目+任务"，不做 PID 校验（每次脚本调用都是新进程，PID 不可跨调用比较）。

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
    if (($j.project -eq $ProjectPath) -and ($j.task -eq $TaskName)) {
        Remove-Item -LiteralPath $lockFile -Force
        Write-Host "released: $lockFile"
        exit 0
    } else {
        Write-Host "lock owned by project=$($j.project) task=$($j.task), not releasing" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue
    Write-Host "cleaned corrupt lock: $lockFile"
    exit 0
}