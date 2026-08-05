# update-heartbeat.ps1 - 子 agent 心跳（证明仍在工作并报告当前进度）
# 用法: ./update-heartbeat.ps1 -ProjectPath <项目路径> -TaskName <task_name> [-Note "<正在做什么>"]
# 子 agent 每完成一个工具步骤或最多每 60 秒调用一次；总控据此区分"长任务"与"卡死"。

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [Parameter(Mandatory = $true)][string]$TaskName,
    [string]$Note = ""
)

$ErrorActionPreference = "Stop"

if ($TaskName -notmatch '^[a-z0-9_]+$') {
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
exit 0