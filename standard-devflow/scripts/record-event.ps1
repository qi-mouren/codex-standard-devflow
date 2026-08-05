# record-event.ps1 - 总控调度事件记录（追加式，append-only）
# 用法: ./record-event.ps1 -ProjectPath <项目路径> -Event <事件> [-TaskName <task_name>] [-Run <run-N>] [-Detail "<一句话或 JSON>"]
# 事件: taskbook_write | lock_acquire | lock_release | spawn_start | spawn_success | spawn_fail | interrupt | gate | state_update | user_decision
# 说明: 总控每个编排动作必须追加一行到 docs/process/logs/orchestration.jsonl（调度账），供 analyze-flow.ps1 复盘。

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [Parameter(Mandatory = $true)][string]$Event,
    [string]$TaskName = "",
    [string]$Run = "",
    [string]$Detail = ""
)

$ErrorActionPreference = "Stop"

$validEvents = @("taskbook_write", "lock_acquire", "lock_release", "spawn_start", "spawn_success", "spawn_fail", "interrupt", "gate", "state_update", "user_decision", "agent_stale_warning", "agent_stale_critical", "agent_budget_exceeded", "external_change")
if ($validEvents -notcontains $Event) {
    Write-Host "invalid event: '$Event' (allowed: $($validEvents -join ', '))" -ForegroundColor Red
    exit 5
}

$logsDir = Join-Path $ProjectPath 'docs\process\logs'
New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
$logFile = Join-Path $logsDir 'orchestration.jsonl'

$payload = @{
    ts     = (Get-Date).ToString('o')
    event  = $Event
    task   = $TaskName
    run    = $Run
    detail = $Detail
    host   = $env:COMPUTERNAME
} | ConvertTo-Json -Compress

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::AppendAllText($logFile, $payload + [Environment]::NewLine, $utf8NoBom)
Write-Host "event recorded: $logFile ($Event $Run $TaskName)"
exit 0
