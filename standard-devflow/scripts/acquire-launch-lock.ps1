# acquire-launch-lock.ps1 - 全局启动锁（跨项目互斥）
# 用法: ./acquire-launch-lock.ps1 -ProjectPath <项目路径> -TaskName <task_name> [-TimeoutSeconds 30]
# 锁目录: C:\tmp\standard-devflow-locks（本环境共享），不可用时回退 %TEMP%\standard-devflow-locks
# 退出码: 0=抢锁成功 | 2=超时/被占用

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [Parameter(Mandatory = $true)][string]$TaskName,
    [int]$TimeoutSeconds = 30,
    [int]$LockTtlMinutes = 10
)

$ErrorActionPreference = "Stop"

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
        if ($age.TotalMinutes -gt $LockTtlMinutes) { return $true }
        if ($j.pid -and -not (Get-Process -Id ([int]$j.pid) -ErrorAction SilentlyContinue)) { return $true }
    } catch { return $true }
    return $false
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
        Write-Host "acquired: $lockFile"
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