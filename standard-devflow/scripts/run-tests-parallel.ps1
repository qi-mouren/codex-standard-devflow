# run-tests-parallel.ps1 - 全量 unittest 分片并行（回归提速）
# 用法: ./run-tests-parallel.ps1 -ProjectPath <项目> [-Shards 3] [-TestDir tests] [-Python python] [-TimeoutSec 900]
# 行为: 扫描 <TestDir>/test_*.py 按轮询分成 N 片，每片一个独立 python -m unittest 进程，
#       输出各自日志到 %TEMP%\rtp-<run>；全部结束后汇总 PASS/FAIL，任一失败 exit 1。
# 依赖: 测试模块可用点号路径导入（tests.test_mod01），项目 tests/ 需可 import。

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [int]$Shards = 3,
    [string]$TestDir = "tests",
    [string]$Python = "python",
    [int]$TimeoutSec = 900,
    [int]$Retries = 1
)

$ErrorActionPreference = "Stop"
if ($Shards -lt 1) { $Shards = 1 }

$testDir = Join-Path $ProjectPath $TestDir
if (-not (Test-Path -LiteralPath $testDir -PathType Container)) {
    Write-Host "测试目录不存在: $testDir" -ForegroundColor Red
    exit 2
}

$files = @(Get-ChildItem -LiteralPath $testDir -Filter 'test_*.py' -File -ErrorAction SilentlyContinue | Sort-Object Name)
if ($files.Count -eq 0) {
    Write-Host "未发现测试文件" -ForegroundColor Red
    exit 2
}

# 轮询分组
$groups = @()
for ($i = 0; $i -lt $Shards; $i++) { $groups += ,@() }
for ($i = 0; $i -lt $files.Count; $i++) {
    $g = $i % $Shards
    $groups[$g] += $files[$i]
}

$runId = "rtp-" + (Get-Date).ToString('HHmmss')
$logDir = Join-Path $env:TEMP $runId
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Invoke-Shard {
    param($i, $mods, $tag)
    $outLog = Join-Path $logDir ($tag + ".out.log")
    $errLog = Join-Path $logDir ($tag + ".err.log")
    $args = @('-m', 'unittest') + $mods
    Write-Host ("SHARD {0} ({1}): python -m unittest {2}" -f ($i + 1), $tag, ($mods -join ' '))
    $p = Start-Process -FilePath $Python -ArgumentList $args -WorkingDirectory $ProjectPath `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while (-not $p.HasExited) {
        if ((Get-Date) -gt $deadline) { break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $p.HasExited) {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        Write-Host ("SHARD {0}: 超时（>{1}s），已终止" -f ($i + 1), $TimeoutSec) -ForegroundColor Red
        return @{ shard = $i + 1; ok = $false; out = $outLog }
    }
    $tail = ""
    if (Test-Path -LiteralPath $outLog) {
        $tail = (Get-Content -LiteralPath $outLog -Tail 3 -ErrorAction SilentlyContinue) -join ' | '
    }
    $ok = ($p.ExitCode -eq 0)
    $color = if ($ok) { 'Green' } else { 'Red' }
    Write-Host ("SHARD {0}: exit={1} {2} {3}" -f ($i + 1), $p.ExitCode, $(if ($ok) { 'OK' } else { 'FAIL' }), $tail) -ForegroundColor $color
    return @{ shard = $i + 1; ok = $ok; out = $outLog }
}

$results = @()
for ($i = 0; $i -lt $Shards; $i++) {
    $mods = @()
    foreach ($f in $groups[$i]) {
        $rel = $f.FullName.Substring($ProjectPath.Length).TrimStart('\')
        $mods += ($rel -replace '\\', '.' -replace '\.py$', '')
    }
    if ($mods.Count -eq 0) { continue }
    $results += (Invoke-Shard $i $mods ("shard" + ($i + 1)))
    Start-Sleep -Milliseconds 800
}

# 失败分片串行重跑（消除并行 pyc 冲突类 flaky）
$finalFail = 0
foreach ($r in $results) {
    if ($r.ok) { continue }
    $recovered = $false
    for ($r2 = 1; $r2 -le $Retries; $r2++) {
        $mods = @()
        foreach ($f in $groups[$r.shard - 1]) {
            $rel = $f.FullName.Substring($ProjectPath.Length).TrimStart('\')
            $mods += ($rel -replace '\\', '.' -replace '\.py$', '')
        }
        Write-Host ("SHARD {0}: 重跑 {1}/{2} ..." -f $r.shard, $r2, $Retries) -ForegroundColor Yellow
        $retry = Invoke-Shard ($r.shard - 1) $mods ("shard" + $r.shard + "-retry" + $r2)
        if ($retry.ok) { $recovered = $true; break }
    }
    if (-not $recovered) { $finalFail = 1 }
}

Write-Host ("分片汇总: {0} 片, 测试文件 {1} 个, 日志 {2}, 重试上限 {3}" -f $results.Count, $files.Count, $logDir, $Retries)
if ($finalFail -ne 0) { exit 1 }
exit 0
