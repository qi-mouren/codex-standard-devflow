# acquire-launch-lock.ps1 - 全局启动锁（跨项目互斥）
# 用法: ./acquire-launch-lock.ps1 -ProjectPath <项目路径> -TaskName <task_name> -ActiveAgentCount <N> [-MaxConcurrentThreads <M>] [-TimeoutSeconds 30]
# 退出码: 0=抢锁成功 | 2=锁被占用超时 | 3=槽位不足（不持锁）
# 说明: 锁的持有者是"项目+任务"而非进程；stale 只按 TTL 判定（进程退出不影响锁），释放走 release 脚本。

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [Parameter(Mandatory = $true)][string]$TaskName,
    [Parameter(Mandatory = $true)][int]$ActiveAgentCount,
    [int]$MaxConcurrentThreads = 7,
    [int]$TimeoutSeconds = 30,
    [int]$LockTtlMinutes = 10
)

$ErrorActionPreference = "Stop"

if ($TaskName -notmatch '^[a-z0-9_]+$') {
    Write-Host "invalid task_name: '$TaskName' (only lowercase letters, digits, underscores allowed)" -ForegroundColor Red
    exit 4
}

$lockRoot = $null
foreach ($candidate in @((Join-Path 'C:\tmp' 'standard-devflow-locks'), (Join-Path $env:TEMP 'standard-devflow-locks'))) {
    try { New-Item -ItemType Directory -Path $candidate -Force -ErrorAction Stop | Out-Null; $lockRoot = $candidate; break } catch {}
}
if (-not $lockRoot) { throw 'no writable lock directory' }
$lockFile = Join-Path $lockRoot 'launch.lock'
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

function Test-Stale($content) {
    if ([string]::IsNullOrWhiteSpace($content)) { return $true }
    try {
        $j = $content | ConvertFrom-Json
        $age = (Get-Date) - ([datetime]$j.timestamp)
        return $age.TotalMinutes -gt $LockTtlMinutes
    } catch { return $true }
}

$lock = @{
    project   = $ProjectPath
    task      = $TaskName
    pid       = $PID
    timestamp = (Get-Date).ToString('o')
    host      = $env:COMPUTERNAME
} | ConvertTo-Json

while ($true) {
    try {
        $fs = [System.IO.File]::Open($lockFile, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($lock)
            $fs.Write($bytes, 0, $bytes.Length)
        } finally { $fs.Close() }
        if ($ActiveAgentCount -ge $MaxConcurrentThreads) {
            Remove-Item -LiteralPath $lockFile -Force
            Write-Host "slot insufficient: active=$ActiveAgentCount max=$MaxConcurrentThreads (含主控)" -ForegroundColor Yellow
            exit 3
        }
        Write-Host "acquired: $lockFile (active=$ActiveAgentCount max=$MaxConcurrentThreads)"
        exit 0
    } catch [System.IO.IOException] {
        $existing = if (Test-Path $lockFile) { Get-Content $lockFile -Raw -ErrorAction SilentlyContinue } else { $null }
        if (Test-Stale $existing) {
            Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue
            continue
        }
        if ((Get-Date) -gt $deadline) {
            Write-Host "lock timeout: $lockFile" -ForegroundColor Yellow
            if ($existing) { Write-Host "current owner: $existing" }
            exit 2
        }
        Start-Sleep -Milliseconds 2000
    }
}