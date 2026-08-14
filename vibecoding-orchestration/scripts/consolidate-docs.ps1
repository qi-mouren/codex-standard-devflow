# consolidate-docs.ps1 - 存量历史项目首次文档整合（V2 文档治理）
# 用法: ./consolidate-docs.ps1 -ProjectPath <项目> [-Force]
# 行为: 若项目已有历史产物（STATE/PRD/HLD/LLD/契约）且尚无 docs/agent/INDEX.md，
#       触发一次性整合：生成 INDEX.md（全局文档地图）+ 摘要骨架 + 归档计划 consolidation-plan.md。
#       本脚本不做任何文件移动/删除，归档与摘要填写由总控/用户审核后执行。
#       记录 external_change 事件（若项目有 record-event.ps1）。

param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
# 布局探测：V3（docs/agent）优先；旧布局（docs/process）兼容
$isV3 = (Test-Path -LiteralPath (Join-Path $ProjectPath 'docs\agent') -PathType Container) -or -not (Test-Path -LiteralPath (Join-Path $ProjectPath 'docs\process') -PathType Container)
$procDir = if ($isV3) { Join-Path $ProjectPath 'docs\agent' } else { Join-Path $ProjectPath 'docs\process' }
$indexFile = Join-Path $procDir 'INDEX.md'
$planFile = Join-Path $procDir 'consolidation-plan.md'
$stateFile = Join-Path $procDir 'STATE.md'
$archiveRoot = if ($isV3) { Join-Path $ProjectPath 'docs\user\archive' } else { Join-Path $ProjectPath 'docs\archive' }
$productRoot = if ($isV3) { Join-Path $ProjectPath 'docs\user\product' } else { Join-Path $ProjectPath 'docs\product' }
$archiveRel = if ($isV3) { 'docs/user/archive' } else { 'docs/archive' }
$productRel = if ($isV3) { 'docs/user/product' } else { 'docs/product' }

if (-not (Test-Path -LiteralPath $procDir -PathType Container)) {
    Write-Host "项目无 docs/agent 或 docs/process 目录，未按标准流程组织，跳过整合" -ForegroundColor Yellow
    exit 2
}

$hasHistory = (Test-Path -LiteralPath $stateFile -PathType Leaf)
if (-not $hasHistory -and -not $Force) {
    Write-Host "无 STATE.md（无历史产物），新项目请走增量维护，不需要一次性整合" -ForegroundColor Yellow
    exit 2
}

if ((Test-Path -LiteralPath $indexFile -PathType Leaf) -and -not $Force) {
    Write-Host "INDEX.md 已存在（非首次接入），如需重建请加 -Force" -ForegroundColor Yellow
    exit 0
}

Write-Host "触发：存量历史项目首次文档整合 $(if ($isV3) { '(V3 布局)' } else { '(旧布局，建议迁移)' })" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $procDir -Force | Out-Null
New-Item -ItemType Directory -Path $archiveRoot -Force | Out-Null
New-Item -ItemType Directory -Path $productRoot -Force | Out-Null

# 1. 扫描产物
function Add-Row($stage, $pattern, $dir) {
    $d = Join-Path $ProjectPath $dir
    if (Test-Path -LiteralPath $d) {
        Get-ChildItem -LiteralPath $d -File -Filter $pattern -ErrorAction SilentlyContinue |
            Sort-Object Name | ForEach-Object {
                [pscustomobject]@{ Stage = $stage; File = $_.Name; Path = (($dir -replace '\\', '/') + '/' + $_.Name) }
            }
    }
}
$rows = @()
if ($isV3) {
    $rows += Add-Row '需求' '*.md' 'docs\user\00-requirements'
    $rows += Add-Row 'PRD' '*.md' 'docs\user\01-prd'
    $rows += Add-Row 'HLD' '*.md' 'docs\user\02-hld'
    $rows += Add-Row '范围' '*.md' 'docs\user\03-scope'
    $rows += Add-Row 'LLD' '*.md' 'docs\user\04-lld'
} else {
    $rows += Add-Row '需求' '*.md' 'docs\00-requirements'
    $rows += Add-Row 'PRD' '*.md' 'docs\01-prd'
    $rows += Add-Row 'HLD' '*.md' 'docs\02-hld'
    $rows += Add-Row '范围' '*.md' 'docs\03-scope'
    $rows += Add-Row 'LLD' '*.md' 'docs\04-lld'
}
if (Test-Path -LiteralPath (Join-Path $ProjectPath 'contracts\contracts-registry.md')) {
    $rows += [pscustomobject]@{ Stage = '契约'; File = 'contracts-registry.md'; Path = 'contracts/contracts-registry.md' }
}

# 2. 从 STATE 门禁记录探测史诗
$epics = @()
if (Test-Path -LiteralPath $stateFile -PathType Leaf) {
    $state = Get-Content -LiteralPath $stateFile -Raw
    foreach ($m in [regex]::Matches($state, 'g0[-_](epic[0-9]+)')) {
        $e = $m.Groups[1].Value
        if ($epics -notcontains $e) { $epics += $e }
    }
    foreach ($m in [regex]::Matches($state, 'g5[-_](epic[0-9]+)')) {
        $e = $m.Groups[1].Value
        if ($epics -notcontains $e) { $epics += $e }
    }
}

# 3. 生成 INDEX.md
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('# 项目文档地图（INDEX.md）')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('> 由 scripts/consolidate-docs.ps1 首次生成（' + (Get-Date).ToString('yyyy-MM-dd') + '）；新会话第一件事 = 读本文件 + STATE.md。')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## 当前状态')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('- 当前史诗/阶段：见 docs/agent/STATE.md（本索引只给地图）')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## 问题账')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('- docs/agent/issues.md：流程运行层问题唯一登记处（评审驳回 / 延期缺陷 / 环境缺陷 / 流程偏差）；门禁通过前核对无未分诊 open 或 Blocking 未决项。')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## 产物清单')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('| 阶段 | 文件 | 路径 |')
[void]$sb.AppendLine('|---|---|---|')
foreach ($r in ($rows | Sort-Object Stage, File)) {
    [void]$sb.AppendLine(('| {0} | {1} | {2} |' -f $r.Stage, $r.File, $r.Path))
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## 历史史诗（归档）')
[void]$sb.AppendLine('')
if ($epics.Count -eq 0) {
    [void]$sb.AppendLine('（未从 STATE 探测到史诗标记，或全部为当前史诗）')
} else {
    foreach ($e in ($epics | Sort-Object)) {
        [void]$sb.AppendLine(('- {0}：{1}/{0}/（summary.md 待整合轮填写）' -f $e, $archiveRel))
    }
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## 产品级汇总（用户视角，待整合轮生成）')
[void]$sb.AppendLine('')
[void]$sb.AppendLine(('- 产品需求总览：{0}/PRODUCT-PRD.md（待生成）' -f $productRel))
[void]$sb.AppendLine(('- 产品架构总览：{0}/PRODUCT-HLD.md（待生成）' -f $productRel))
[void]$sb.AppendLine(('- 里程碑与发布：{0}/ROADMAP.md（待生成）' -f $productRel))
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## 检索建议')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('- 找接口：rg "CON-" contracts/contracts-registry.md')
if ($isV3) {
    [void]$sb.AppendLine('- 找验收口径：rg "验收" docs/user/01-prd/')
} else {
    [void]$sb.AppendLine('- 找验收口径：rg "验收" docs/01-prd/')
}
[void]$sb.AppendLine(('- 找历史决策：rg "<关键词>" {0}/ docs/agent/' -f $archiveRel))
[System.IO.File]::WriteAllText($indexFile, $sb.ToString(), $utf8)
Write-Host "已生成: $indexFile"

# 4. 摘要骨架 + 归档计划
$plan = New-Object System.Text.StringBuilder
[void]$plan.AppendLine('# 文档整合计划（consolidation-plan.md）')
[void]$plan.AppendLine('')
[void]$plan.AppendLine('> 本计划由 consolidate-docs.ps1 生成，需总控/用户审核后执行；脚本不移动任何文件。')
[void]$plan.AppendLine('')
if ($epics.Count -eq 0) {
    [void]$plan.AppendLine('未探测到已完成史诗，无需归档。')
} else {
    foreach ($e in ($epics | Sort-Object)) {
        $target = Join-Path $archiveRoot $e
        $skeleton = Join-Path $target 'summary.md'
        New-Item -ItemType Directory -Path $target -Force | Out-Null
        if (-not (Test-Path -LiteralPath $skeleton -PathType Leaf)) {
            $sum = @(
                ('# {0} 一页总结' -f $e),
                '',
                '- 状态：待整合轮填写',
                '- 交付版本：<tag>',
                '- 范围：<一句话>',
                '- 关键决策：<3 条>',
                '- 遗留/延期：<列表或链接>',
                '- 契约影响：<新增/零升级>'
            ) -join [Environment]::NewLine
            [System.IO.File]::WriteAllText($skeleton, $sum, $utf8)
            [void]$plan.AppendLine(('- [{0}] 已生成摘要骨架 {1}；请整合轮填写并确认是否归档（移动 {0} 相关产物到 {2}/{0}/）' -f $e, $skeleton, $archiveRel))
        } else {
            [void]$plan.AppendLine(('- [{0}] 摘要已存在：{1}' -f $e, $skeleton))
        }
    }
}
[void]$plan.AppendLine('- [ ] 生成 PRODUCT-PRD / PRODUCT-HLD / ROADMAP 初稿（整合轮）')
[void]$plan.AppendLine('- [ ] 更新 INDEX.md 状态与链接')
[System.IO.File]::WriteAllText($planFile, $plan.ToString(), $utf8)
Write-Host "已生成: $planFile"

# 5. 登记 external_change
$rec = Join-Path $ProjectPath 'scripts\record-event.ps1'
if (Test-Path -LiteralPath $rec -PathType Leaf) {
    & $rec -ProjectPath $ProjectPath -Event external_change -Detail '首次文档整合：生成 INDEX.md / consolidation-plan.md / 史诗摘要骨架'
}
exit 0
