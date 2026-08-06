# watchdog.ps1 - 子 agent 运行监控（事实账 + 判卡死 + 预算校验）
# 用法:
#   取证(单次): ./watchdog.ps1 -ProjectPath <项目> -Run run-N -Once [-TempPrefix <前缀>] [-ProcessMatch <串>]
#   后台监控:  Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','<scripts/watchdog.ps1>','-ProjectPath','<项目>','-Run','run-N','-BudgetMin','<M>','-TempPrefix','<前缀>'
# 行为: 每个 tick 追加一行事实到 docs/process/logs/runs/run-N.facts.jsonl；
#       心跳阈值 3/8/15 分钟与 check-flow 一致；超阈值/超预算自动写 orchestration 事件；
#       critical/budget 时落证据快照 run-N.evidence-<HHmmss>.json（含 .heartbeat/全仓变更/临时目录/进程）；
#       首心跳基线=本轮启动时间（不继承上一轮旧 .heartbeat）；检测到本 Run 的 interrupt 事件后自动退出。
# 事件: agent_stale_warning / agent_stale_critical / agent_budget_exceeded

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [Parameter(Mandatory = $true)][string]$Run,
    [int]$BudgetMin = 60,
    [int]$IntervalSec = 60,
    [string]$TempPrefix = "",
    [string]$ProcessMatch = "",
    [int]$MaxMinutes = 0,
    [switch]$Once
)

$ErrorActionPreference = "Stop"
$WarnMin = 3
$KillMin = 8
$LongMin = 15

$script:Started = Get-Date
if ($MaxMinutes -le 0) { $MaxMinutes = $BudgetMin + 20 }
$RunsDir = Join-Path $ProjectPath 'docs\process\logs\runs'
$HbFile = Join-Path $ProjectPath 'docs\process\tasks\.heartbeat'
$FactsFile = Join-Path $RunsDir ($Run + '.facts.jsonl')
New-Item -ItemType Directory -Path $RunsDir -Force | Out-Null
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$script:Tick = 0
$script:State = @{ warn = 'off'; critical = 'off'; budget = 'off' }
$script:HbStartMtime = $null
if (Test-Path -LiteralPath $HbFile -PathType Leaf) {
    $script:HbStartMtime = (Get-Item -LiteralPath $HbFile).LastWriteTime
}

function Get-HbFact {
    $age = -1
    $isLong = $false
    $note = ""
    $fresh = $false
    if (Test-Path -LiteralPath $HbFile -PathType Leaf) {
        try {
            $hb = Get-Content -LiteralPath $HbFile -Raw | ConvertFrom-Json
            $age = ((Get-Date) - ([datetime]$hb.timestamp)).TotalMinutes
            $note = [string]$hb.note
            $isLong = ($note.StartsWith("LONG:", [System.StringComparison]::OrdinalIgnoreCase))
            $mtime = (Get-Item -LiteralPath $HbFile).LastWriteTime
            $fresh = ($null -ne $script:HbStartMtime -and $mtime -gt $script:HbStartMtime)
            if ($null -eq $script:HbStartMtime) { $fresh = $true }
        } catch { $note = "<unparseable>" }
    }
    return @{ age_min = [Math]::Round($age, 1); long = $isLong; note = $note; fresh = $fresh }
}

function Get-RepoChanges {
    $out = New-Object System.Collections.Generic.List[string]
    if (-not (Test-Path -LiteralPath $ProjectPath -PathType Container)) { return @($out) }
    $cutoff = (Get-Date).AddMinutes(-[Math]::Max(1, ($IntervalSec / 60.0) * 2))
    Get-ChildItem -LiteralPath $ProjectPath -Recurse -File -Force -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -notlike '*\.git\*' -and
            $_.FullName -notlike '*\docs\process\logs\*' -and
            $_.LastWriteTime -gt $cutoff
        } |
        Select-Object -First 50 |
        ForEach-Object { $out.Add($_.FullName.Substring($ProjectPath.Length).TrimStart('\')) }
    return @($out)
}

function Get-TempActivity {
    if ($TempPrefix -eq "") { return @{ count = 0; latest = $null } }
    $dirs = @(Get-ChildItem -LiteralPath $env:TEMP -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like ($TempPrefix + '*') })
    $recent = $dirs | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-2) } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return @{ count = $dirs.Count; latest = $(if ($recent) { $recent.LastWriteTime.ToString('o') } else { $null }) }
}

function Get-Procs {
    if ($ProcessMatch -eq "") { return @() }
    try {
        $ids = @(Get-CimInstance Win32_Process -ErrorAction Stop |
            Where-Object { $_.CommandLine -and $_.CommandLine -like ('*' + $ProcessMatch + '*') } |
            Select-Object -ExpandProperty ProcessId)
        return $ids
    } catch { return @() }
}

function Write-Fact($f) {
    $line = $f | ConvertTo-Json -Compress -Depth 5
    [System.IO.File]::AppendAllText($FactsFile, $line + [Environment]::NewLine, $Utf8)
}

function Write-Evidence($f) {
    $ev = @{
        ts = (Get-Date).ToString('o')
        run = $Run
        heartbeat = $f.heartbeat
        repo_changes = $f.repo_changes
        temp_count = $f.temp.count
        temp_latest = $f.temp.latest
        processes = $f.processes
    }
    $evFile = Join-Path $RunsDir ($Run + '.evidence-' + (Get-Date).ToString('HHmmss') + '.json')
    [System.IO.File]::WriteAllText($evFile, ($ev | ConvertTo-Json -Depth 6), $Utf8)
    Write-Host "evidence saved: $evFile" -ForegroundColor Yellow
}

function Record-Event($Event, $Detail) {
    $rec = Join-Path $PSScriptRoot 'record-event.ps1'
    & $rec -ProjectPath $ProjectPath -Event $Event -Run $Run -Detail $Detail
}

function Test-Interrupted {
    $orch = Join-Path $ProjectPath 'docs\process\logs\orchestration.jsonl'
    if (-not (Test-Path -LiteralPath $orch -PathType Leaf)) { return $false }
    $esc = [regex]::Escape($Run)
    foreach ($line in (Get-Content -LiteralPath $orch -Tail 60)) {
        if ($line -match '"event"\s*:\s*"interrupt"' -and $line -match ('"run"\s*:\s*"' + $esc + '"')) {
            return $true
        }
    }
    return $false
}

function Check-States($f) {
    $elapsed = ((Get-Date) - $script:Started).TotalMinutes
    $age = if ($f.heartbeat.fresh) { $f.heartbeat.age_min } else { $elapsed }
    $isLong = ($f.heartbeat.fresh -and $f.heartbeat.long)
    $limit = if ($isLong) { $LongMin } else { $KillMin }
    $warn = if ($isLong) { $LongMin } else { $WarnMin }
    $hasFacts = ($f.repo_changes.Count -gt 0 -or $f.temp.latest -ne $null -or $f.processes.Count -gt 0)

    if ($elapsed -gt $BudgetMin -and $script:State.budget -ne 'exceeded') {
        $script:State.budget = 'exceeded'
        Record-Event 'agent_budget_exceeded' ("预算超时：已运行 {0} 分钟（上限 {1}），最后心跳 {2} 分钟前" -f [Math]::Round($elapsed,1), $BudgetMin, $age)
        Write-Evidence $f
    }
    if ($age -gt $warn -and $script:State.warn -ne 'on') {
        $script:State.warn = 'on'
        Record-Event 'agent_stale_warning' ("心跳 {0} 分钟未更新（LONG={1}，fresh={2}），阈值预警" -f [Math]::Round($age,1), $isLong, $f.heartbeat.fresh)
    } elseif ($age -le $warn) { $script:State.warn = 'off' }
    if ($age -gt $limit -and -not $hasFacts -and $script:State.critical -ne 'on') {
        $script:State.critical = 'on'
        Record-Event 'agent_stale_critical' ("心跳 {0} 分钟未更新且无产出（LONG={1}，fresh={2}），判定卡死候选" -f [Math]::Round($age,1), $isLong, $f.heartbeat.fresh)
        Write-Evidence $f
    } elseif ($age -le $limit -or $hasFacts) { $script:State.critical = 'off' }
}

while ($true) {
    $script:Tick++
    $fact = @{
        ts = (Get-Date).ToString('o')
        tick = $script:Tick
        run = $Run
        heartbeat = Get-HbFact
        repo_changes = Get-RepoChanges
        temp = Get-TempActivity
        processes = Get-Procs
    }
    Write-Fact $fact
    Check-States $fact
    if ($Once) { break }
    if (Test-Interrupted) {
        Write-Host "watchdog 检测到本轮 interrupt，退出" -ForegroundColor Green
        break
    }
    if (((Get-Date) - $script:Started).TotalMinutes -gt $MaxMinutes) {
        Write-Host "watchdog 到期（$MaxMinutes 分钟），退出" -ForegroundColor Yellow
        break
    }
    Start-Sleep -Seconds $IntervalSec
}
exit 0
