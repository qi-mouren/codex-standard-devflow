# long-cmd.ps1 - 长命令包装器（自动 LONG 心跳 + 可选超时）
# 用法: ./long-cmd.ps1 -ProjectPath <项目> -LogFile <docs/process/logs/runs/run-N.jsonl> -Command "<命令>" [-TimeoutSec <秒>] [-IntervalSec <60>]
# 行为: 启动前写 LONG 心跳；运行中每 IntervalSec 续发带耗时的 LONG 心跳；命令输出结束后透传；
#       超时则 Stop-Job 并以 exit 3 结束；正常完成按 Job 状态返回 0/1。
# 说明: 任何预计超过 60 秒的命令都必须用它包装，避免总控把合法长任务误判为卡死。

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [Parameter(Mandatory = $true)][string]$LogFile,
    [Parameter(Mandatory = $true)][string]$Command,
    [int]$TimeoutSec = 0,
    [int]$IntervalSec = 60,
    [string]$TaskName = "child"
)

$ErrorActionPreference = "Stop"
$hb = Join-Path $PSScriptRoot 'update-heartbeat.ps1'
$started = Get-Date
$summary = if ($Command.Length -gt 60) { $Command.Substring(0, 60) + '...' } else { $Command }

& $hb -ProjectPath $ProjectPath -TaskName $TaskName -LogFile $LogFile -Note ("LONG: 开始 " + $summary)
$job = Start-Job -ScriptBlock { param($c) Invoke-Expression $c; exit $LASTEXITCODE } -ArgumentList $Command

$timedOut = $false
while ($true) {
    Start-Sleep -Seconds $IntervalSec
    if ($job.State -ne 'Running') { break }
    $elapsed = [int]((Get-Date) - $started).TotalSeconds
    if ($TimeoutSec -gt 0 -and $elapsed -gt $TimeoutSec) {
        $timedOut = $true
        break
    }
    & $hb -ProjectPath $ProjectPath -TaskName $TaskName -LogFile $LogFile -Note ("LONG: 进行中 {0}s ({1})" -f $elapsed, $summary)
}

if ($timedOut) {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    & $hb -ProjectPath $ProjectPath -TaskName $TaskName -LogFile $LogFile -Note ("LONG: 超时 {0}s，已停止 ({1})" -f $TimeoutSec, $summary)
    Write-Host "LONG-CMD TIMEOUT after $TimeoutSec s" -ForegroundColor Yellow
    exit 3
}

$out = Receive-Job $job 2>&1
if ($out) { Write-Output $out }
& $hb -ProjectPath $ProjectPath -TaskName $TaskName -LogFile $LogFile -Note ("LONG: 完成 {0}s ({1})" -f [int]((Get-Date) - $started).TotalSeconds, $summary)
Remove-Job $job -Force -ErrorAction SilentlyContinue
if ($job.State -eq 'Completed') { exit 0 } else { exit 1 }
