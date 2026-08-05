# check-flow.ps1 - 标准开发流程健康检查
# 用法: ./check-flow.ps1 -ProjectPath <项目路径>
# 检查: 目录结构、门禁产物、tag 状态、追踪矩阵完整性

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath
)

$ErrorActionPreference = "Stop"
$issues = @()
$okCount = 0

function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green; $script:okCount++ }
function Write-Issue($msg) { Write-Host "[!!] $msg" -ForegroundColor Yellow; $script:issues += $msg }

if (!(Test-Path $ProjectPath)) {
    Write-Host "[FATAL] 项目路径不存在: $ProjectPath" -ForegroundColor Red
    exit 1
}

$docsDir = Join-Path $ProjectPath "docs"
$reqDir = Join-Path $docsDir "00-requirements"
$prdDir = Join-Path $docsDir "01-prd"
$hldDir = Join-Path $docsDir "02-hld"
$scopeDir = Join-Path $docsDir "03-scope"
$lldDir = Join-Path $docsDir "04-lld"
$procDir = Join-Path $docsDir "process"
$contractsDir = Join-Path $ProjectPath "contracts"
$stateFile = Join-Path $procDir "STATE.md"
$traceFile = Join-Path $procDir "traceability.md"

# 1. 目录结构
foreach ($d in @($reqDir, $prdDir, $hldDir, $scopeDir, $lldDir, $procDir, $contractsDir)) {
    if (Test-Path $d) { Write-Ok "目录存在: $d" } else { Write-Issue "目录缺失: $d" }
}

# 2. 状态与追踪
if (Test-Path $stateFile) { Write-Ok "STATE.md 存在" } else { Write-Issue "STATE.md 缺失: $stateFile" }
if (Test-Path $traceFile) { Write-Ok "traceability.md 存在" } else { Write-Issue "traceability.md 缺失: $traceFile" }

# 3. 门禁产物（按 STATE 中阶段动态判断前序产物）
$stage = "UNKNOWN"
if (Test-Path $stateFile) {
    $stageLine = Select-String -Path $stateFile -Pattern '^-\s*阶段：' | Select-Object -First 1
    if ($stageLine) { $stage = ($stageLine.Line -replace '^-\s*阶段：', '').Trim() }
}
Write-Host "`n当前阶段: $stage" -ForegroundColor Cyan

$requiredByStage = @{
    "需求锚定"     = @()
    "产品需求"     = @("requirements-anchor.md")
    "架构设计"     = @("PRD.md")
    "模块拆解"     = @("HLD.md")
    "详细设计"     = @("scope.md")
    "开发实现"     = @("lld", "contracts-registry.md")
    "集成交付"   = @("lld", "contracts-registry.md")
}
if ($requiredByStage.ContainsKey($stage)) {
    foreach ($name in $requiredByStage[$stage]) {
        if ($name -eq "lld") {
            $lldFiles = Get-ChildItem $lldDir -Filter "*LLD*.md" -ErrorAction SilentlyContinue
            if ($lldFiles) { Write-Ok "LLD 文件存在: $($lldFiles.Count) 个" } else { Write-Issue "LLD 文件缺失" }
        } else {
            $found = Get-ChildItem $reqDir, $prdDir, $hldDir, $scopeDir, $contractsDir -Filter "*$name*" -Recurse -ErrorAction SilentlyContinue
            if ($found) { Write-Ok "产物存在: $name" } else { Write-Issue "产物缺失: $name" }
        }
    }
}

# 4. 契约注册表基本校验
$regFile = Join-Path $contractsDir "contracts-registry.md"
if (Test-Path $regFile) {
    $content = Get-Content $regFile -Encoding UTF8 -Raw
    if ($content -match "冻结版本") { Write-Ok "契约注册表含冻结版本标记" } else { Write-Issue "契约注册表缺冻结版本标记" }
}

# 5. Git tag 检查（如仓库存在）
$gitDir = Join-Path $ProjectPath ".git"
if (Test-Path $gitDir) {
    try {
        $tags = git -C $ProjectPath tag 2>$null
        if ($tags -match "contracts-frozen") { Write-Ok "契约冻结 tag 存在: $($tags | Where-Object { $_ -match 'contracts-frozen' })" }
        else { Write-Issue "契约冻结 tag 缺失 (vX-contracts-frozen)" }
    } catch {
        Write-Issue "无法读取 git tags: $_"
    }
} else {
    Write-Host "[..] 未检测到 .git，跳过 tag 检查" -ForegroundColor DarkGray
}

# 6. 心跳检查
$tasksDir = Join-Path $procDir "tasks"
$hbFile = Join-Path $tasksDir ".heartbeat"
if (Test-Path $hbFile) {
    try {
        $hb = Get-Content $hbFile -Raw | ConvertFrom-Json
        $ageMin = ((Get-Date) - ([datetime]$hb.timestamp)).TotalMinutes
        if ($ageMin -gt 3) { Write-Issue "心跳过期: $([math]::Round($ageMin,1)) 分钟前更新 ($($hb.task))" }
        else { $note = if ($hb.note) { " - $($hb.note)" } else { "" }; Write-Ok "心跳正常: $([math]::Round($ageMin,1)) 分钟前更新 ($($hb.task)$note)" }
    } catch { Write-Issue "心跳文件无法解析: $hbFile" }
} else {
    Write-Host "[..] 无心跳文件（尚未启动子 agent 或已清理）" -ForegroundColor DarkGray
}

# 7. 追踪矩阵完整性
if (Test-Path $traceFile) {
    $trace = Get-Content $traceFile -Encoding UTF8 -Raw
    if ($trace -match "\| REQ-\d+") { Write-Ok "追踪矩阵含 REQ 条目" } else { Write-Issue "追踪矩阵无 REQ 条目" }
}

Write-Host "`n==============================" -ForegroundColor Cyan
if ($issues.Count -eq 0) {
    Write-Host "流程健康检查通过 ($okCount 项 OK)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "发现 $($issues.Count) 个问题:" -ForegroundColor Yellow
    $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    exit 1
}