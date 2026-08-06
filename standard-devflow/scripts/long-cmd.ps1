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
$job = Start-Job -ScriptBlock {
    param($p, $c)
    # 1) Start-Job 新进程继承的是进程级 cwd（PowerShell Location 之外的
    #    [Environment]::CurrentDirectory），先钉到项目根，避免相对路径命令
    #    （如 unittest discover -s tests）跑错目录。
    # 2) 在 Job 内合并 2>&1 并转文本：父进程 $ErrorActionPreference=Stop 时，
    #    Receive-Job 2>&1 遇错误记录会直接抛错（实测），且 PS 5.1 Job 不传递
    #    原生命令退出码；因此统一在 Job 内收尾并追加哨兵行回传退出码。
    Set-Location -LiteralPath $p
    [Environment]::CurrentDirectory = (Get-Location).Path
    $code = 0
    try {
        Invoke-Expression $c 2>&1 | Out-String -Width 400 | Write-Output
        $code = $LASTEXITCODE
    } catch {
        $code = 1
    }
    Write-Output ("__LONGCMD_EXIT__" + $code)
} -ArgumentList $ProjectPath, $Command

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

$out = Receive-Job $job
$code = 1
if ($out -is [array]) {
    $tail = $out[$out.Count - 1]
    if ($tail -is [string] -and $tail.StartsWith("__LONGCMD_EXIT__")) {
        $code = [int]$tail.Substring("__LONGCMD_EXIT__".Length)
        if ($out.Count -gt 1) { $out = $out[0..($out.Count - 2)] } else { $out = $null }
    }
} elseif ($out -is [string] -and $out.StartsWith("__LONGCMD_EXIT__")) {
    $code = [int]$out.Substring("__LONGCMD_EXIT__".Length)
    $out = $null
}
if ($out) { Write-Output $out }
& $hb -ProjectPath $ProjectPath -TaskName $TaskName -LogFile $LogFile -Note ("LONG: 完成 {0}s ({1})" -f [int]((Get-Date) - $started).TotalSeconds, $summary)
$state = $job.State
Remove-Job $job -Force -ErrorAction SilentlyContinue
if ($state -eq 'Completed') { exit $code } else { exit 1 }
