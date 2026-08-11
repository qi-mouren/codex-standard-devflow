# analyze-flow.ps1 - 运行复盘：调度账 + 执行账 -> 时间线与异常报告
# 用法: ./analyze-flow.ps1 -ProjectPath <项目路径> [-OutFile <报告路径>] [-AllHeartbeats]
# 输入: docs/process/logs/orchestration.jsonl（调度账）+ docs/process/logs/runs/*.jsonl（执行账）
# 输出: 概览统计、调度时间线、每轮明细、异常清单

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [string]$OutFile = "",
    [switch]$AllHeartbeats
)

$ErrorActionPreference = "Stop"

$logsDir = Join-Path $ProjectPath 'docs\process\logs'
$orchFile = Join-Path $logsDir 'orchestration.jsonl'
$runsDir = Join-Path $logsDir 'runs'

$sb = New-Object System.Text.StringBuilder
function Write-Line([string]$s) {
    Write-Host $s
    if ($OutFile -ne "") { [void]$script:sb.AppendLine($s) }
}

if (-not (Test-Path $logsDir)) {
    Write-Host "no logs directory: $logsDir" -ForegroundColor Yellow
    exit 0
}

# 1. 读调度账
$events = @()
if (Test-Path $orchFile) {
    foreach ($line in (Get-Content $orchFile -Encoding UTF8)) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        try { $events += ($line | ConvertFrom-Json) } catch { Write-Host "skip bad orchestration line: $line" -ForegroundColor DarkGray }
    }
}

# 2. 读执行账
$runs = @{}
if (Test-Path $runsDir) {
    Get-ChildItem $runsDir -Filter *.jsonl | Where-Object { $_.Name -notlike '*.facts.jsonl' } | Sort-Object Name | ForEach-Object {
        $hbs = @()
        foreach ($line in (Get-Content $_.FullName -Encoding UTF8)) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            try { $hbs += ($line | ConvertFrom-Json) } catch {}
        }
        $runs[$_.BaseName] = $hbs
    }
}

Write-Line "==== vibecoding-orchestration 运行复盘 ===="
Write-Line ("生成时间: " + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))
Write-Line ("日志目录: " + $logsDir)
Write-Line ""

# 3. 概览
$spawnStart = @($events | Where-Object { $_.event -eq 'spawn_start' })
$spawnOk = @($events | Where-Object { $_.event -eq 'spawn_success' })
$spawnFail = @($events | Where-Object { $_.event -eq 'spawn_fail' })
$interrupts = @($events | Where-Object { $_.event -eq 'interrupt' })
Write-Line "[概览]"
Write-Line ("  调度事件总数: " + $events.Count)
Write-Line ("    spawn_start: " + $spawnStart.Count)
Write-Line ("    spawn_success: " + $spawnOk.Count)
Write-Line ("    spawn_fail: " + $spawnFail.Count)
Write-Line ("    interrupt: " + $interrupts.Count)
Write-Line ("  执行账轮次: " + $runs.Count)
foreach ($runName in ($runs.Keys | Sort-Object)) {
    $hbs = $runs[$runName]
    $first = if ($hbs.Count -gt 0) { $hbs[0] } else { $null }
    $last = if ($hbs.Count -gt 0) { $hbs[$hbs.Count - 1] } else { $null }
    $info = "    " + $runName + ": 心跳 " + $hbs.Count + " 条"
    if ($first) { $info += ", 首条 " + ([datetime]$first.ts).ToString('HH:mm:ss') }
    if ($last) { $info += ", 末条 " + ([datetime]$last.ts).ToString('HH:mm:ss') }
    Write-Line $info
}
Write-Line ""

# 4. 调度时间线
Write-Line "[调度时间线]"
if ($events.Count -eq 0) {
    Write-Line "  （无调度事件）"
} else {
    foreach ($ev in ($events | Sort-Object { [datetime]$_.ts })) {
        $t = ([datetime]$ev.ts).ToString('HH:mm:ss')
        $line = "  " + $t + "  " + $ev.event.PadRight(16)
        if ($ev.run) { $line += " " + $ev.run }
        if ($ev.task) { $line += " task=" + $ev.task }
        if ($ev.detail) { $line += "  " + $ev.detail }
        Write-Line $line
    }
}
Write-Line ""

# 5. 每轮明细
Write-Line "[每轮明细]"
if ($runs.Count -eq 0) {
    Write-Line "  （无执行账记录）"
}
foreach ($runName in ($runs.Keys | Sort-Object)) {
    $hbs = $runs[$runName]
    Write-Line ("  == " + $runName + " ==")
    $spawnEv = $events | Where-Object { $_.run -eq $runName -and ($_.event -eq 'spawn_start' -or $_.event -eq 'spawn_success') } | Select-Object -First 1
    $intEv = $events | Where-Object { $_.run -eq $runName -and $_.event -eq 'interrupt' } | Select-Object -First 1
    $start = if ($spawnEv) { [datetime]$spawnEv.ts } else { $null }
    $end = if ($intEv) { [datetime]$intEv.ts } else { $null }
    if ($start) { Write-Line ("    spawn: " + $start.ToString('HH:mm:ss')) } else { Write-Line "    spawn: （无匹配调度记录）" }
    if ($end) {
        $dur = if ($start) { [math]::Round(($end - $start).TotalMinutes, 1) } else { 0 }
        Write-Line ("    interrupt: " + $end.ToString('HH:mm:ss') + " (耗时 " + $dur + " 分钟)")
    } else { Write-Line "    interrupt: （无，槽位未回收）" }
    if ($hbs.Count -gt 0) {
        $maxGap = 0.0
        for ($i = 1; $i -lt $hbs.Count; $i++) {
            $gap = (([datetime]$hbs[$i].ts) - ([datetime]$hbs[$i-1].ts)).TotalSeconds
            if ($gap -gt $maxGap) { $maxGap = $gap }
        }
        Write-Line ("    心跳: " + $hbs.Count + " 条, 最大间隔 " + [math]::Round($maxGap,0) + " 秒")
        $notes = $hbs | ForEach-Object { $_.note } | Where-Object { $_ }
        $shown = @($notes | Select-Object -Unique)
        if ($shown.Count -gt 12 -and -not $AllHeartbeats) {
            $shown = @($shown | Select-Object -First 6) + @("...") + @($shown | Select-Object -Last 4)
        }
        Write-Line ("    note: " + ($shown -join " -> "))
    } else {
        Write-Line "    心跳: 0 条"
    }
    Write-Line ""
}

# 6. 异常清单
Write-Line "[异常清单]"
$anomalies = @()
foreach ($runName in ($runs.Keys | Sort-Object)) {
    $hbs = $runs[$runName]
    $hasSpawn = @($events | Where-Object { $_.run -eq $runName -and ($_.event -eq 'spawn_start' -or $_.event -eq 'spawn_success') }).Count -gt 0
    if ($hbs.Count -eq 0 -and $hasSpawn) { $anomalies += "${runName}: spawn 后无心跳（疑似任务未送达/卡死）" }
    if (-not $hasSpawn) { $anomalies += "${runName}: 有心跳但无 spawn 调度记录（孤儿 run）" }
}
foreach ($ev in $events) {
    if (($ev.event -eq 'spawn_start' -or $ev.event -eq 'spawn_success') -and $ev.run) {
        $hasInt = @($events | Where-Object { $_.run -eq $ev.run -and $_.event -eq 'interrupt' }).Count -gt 0
        if (-not $hasInt) { $anomalies += "$($ev.run): spawn 后无 interrupt（槽位可能未回收）" }
        if (-not $runs.ContainsKey($ev.run)) { $anomalies += "$($ev.run): spawn 后无执行账（无心跳记录，疑似未送达/卡死）" }
    }
}
foreach ($runName in ($runs.Keys | Sort-Object)) {
    $hbs = $runs[$runName]
    for ($i = 1; $i -lt $hbs.Count; $i++) {
        $gap = (([datetime]$hbs[$i].ts) - ([datetime]$hbs[$i-1].ts)).TotalSeconds
        $prevNote = [string]$hbs[$i-1].note
        $prevLong = $prevNote.StartsWith("LONG:", [System.StringComparison]::OrdinalIgnoreCase)
        if ($gap -gt 120 -and -not $prevLong) {
            $anomalies += "${runName}: 心跳间隔过大 " + [math]::Round($gap,0) + " 秒 (" + ([datetime]$hbs[$i-1].ts).ToString('HH:mm:ss') + " -> " + ([datetime]$hbs[$i].ts).ToString('HH:mm:ss') + ")"
        }
    }
}
if ($anomalies.Count -eq 0) {
    Write-Line "  （无异常）"
} else {
    $anomalies | Sort-Object -Unique | ForEach-Object { Write-Line ("  [!!] " + $_) }
}
Write-Line ""
Write-Line "复盘完成。"
if ($OutFile -ne "") {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($OutFile, $sb.ToString(), $utf8NoBom)
    Write-Host "report written: $OutFile"
}
exit 0
