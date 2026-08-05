# update-heartbeat.ps1 - 子 agent 心跳（证明仍在工作，防误判卡死）
# 用法: ./update-heartbeat.ps1 -ProjectPath <项目路径> -TaskName <task_name>
# 每次子 agent 完成一个工具步骤或最多每 5 分钟调用一次；总控据此区分"长任务"与"卡死"。

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [Parameter(Mandatory = $true)][string]$TaskName
)

$ErrorActionPreference = "Stop"
$tasksDir = Join-Path $ProjectPath 'docs\process\tasks'
New-Item -ItemType Directory -Path $tasksDir -Force | Out-Null
$hbFile = Join-Path $tasksDir '.heartbeat'

$payload = @{
    project   = $ProjectPath
    task      = $TaskName
    timestamp = (Get-Date).ToString('o')
    host      = $env:COMPUTERNAME
} | ConvertTo-Json

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($hbFile, $payload, $utf8NoBom)
Write-Host "heartbeat updated: $hbFile"
exit 0