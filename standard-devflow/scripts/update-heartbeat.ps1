# update-heartbeat.ps1 - 子 agent 心跳（证明仍在工作并报告当前进度）
# 用法: ./update-heartbeat.ps1 -ProjectPath <项目路径> [-TaskName <task_name>] -LogFile <docs/process/logs/runs/run-N.jsonl> [-Note "<正在做什么>"]
# 子 agent 每完成一个工具步骤或最多每 60 秒调用一次；总控据此区分"长任务"与"卡死"。
# 写两份记录：.heartbeat 快照（check-flow 实时判定）+ LogFile 追加行（执行账，供 analyze-flow 复盘）。

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [string]$TaskName = "child",
    [string]$LogFile = "",
    [string]$Note = ""
)

$ErrorActionPreference = "Stop"

if ($TaskName -and $TaskName -notmatch '^[a-z0-9_]+$') {
    Write-Host "invalid task_name: '$TaskName' (only lowercase letters, digits, underscores allowed)" -ForegroundColor Red
    exit 4
}

$tasksDir = Join-Path $ProjectPath 'docs\process\tasks'
New-Item -ItemType Directory -Path $tasksDir -Force | Out-Null
$hbFile = Join-Path $tasksDir '.heartbeat'

$payload = @{
    project   = $ProjectPath
    task      = $TaskName
    timestamp = (Get-Date).ToString('o')
    note      = $Note
    host      = $env:COMPUTERNAME
} | ConvertTo-Json

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($hbFile, $payload, $utf8NoBom)
Write-Host "heartbeat updated: $hbFile"

if ($LogFile -ne "") {
    if ([System.IO.Path]::IsPathRooted($LogFile)) {
        $runPath = $LogFile
    } else {
        $runPath = Join-Path $ProjectPath $LogFile
    }
    $runDir = Split-Path -Parent $runPath
    New-Item -ItemType Directory -Path $runDir -Force | Out-Null
    $runPayload = @{
        ts   = (Get-Date).ToString('o')
        task = $TaskName
        note = $Note
        host = $env:COMPUTERNAME
    } | ConvertTo-Json -Compress
    [System.IO.File]::AppendAllText($runPath, $runPayload + [Environment]::NewLine, $utf8NoBom)
    Write-Host "run log appended: $runPath"
}
exit 0
