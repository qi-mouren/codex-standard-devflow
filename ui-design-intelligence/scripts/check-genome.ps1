param(
    [string]$GenomePath = 'design-genome.md',
    [string]$DnaPath = 'design-dna.json'
)

$requiredSections = @(
    'Personality',
    'Visual Language',
    'Information Philosophy',
    'Spatial Model',
    'Interaction Philosophy',
    'Component Philosophy',
    'Anti-Patterns'
)

$exitCode = 0

if (-not (Test-Path -LiteralPath $GenomePath)) {
    Write-Error "genome 文件不存在: $GenomePath"
    exit 1
}

$content = Get-Content -Raw -Encoding UTF8 -LiteralPath $GenomePath

$missing = @()
foreach ($section in $requiredSections) {
    $pattern = '(?m)^#+\s*' + [regex]::Escape($section)
    if ($content -notmatch $pattern) {
        $missing += $section
    }
}

if ($missing.Count -gt 0) {
    Write-Host "[FAIL] 缺少必填章节: $($missing -join ', ')"
    $exitCode = 1
} else {
    Write-Host "[PASS] 必填章节齐全"
}

if ($content -match '(?i)#[0-9a-f]{3,8}\b') {
    Write-Host "[WARN] 原则层出现 hex 颜色，应移到 design-dna.json"
}
if ($content -match '\b\d+(\.\d+)?px\b') {
    Write-Host "[WARN] 原则层出现 px 数值，应移到 design-dna.json"
}
if ($content -match '<[^>]+>') {
    Write-Host "[WARN] 检测到模板占位符未填写"
}

if (-not (Test-Path -LiteralPath $DnaPath)) {
    Write-Host "[WARN] design-dna.json 不存在（无 token 层时允许，但实现约束会缺失）"
} else {
    try {
        $null = Get-Content -Raw -Encoding UTF8 -LiteralPath $DnaPath | ConvertFrom-Json
        Write-Host "[PASS] design-dna.json 可解析"
    } catch {
        Write-Host "[FAIL] design-dna.json 不是合法 JSON: $($_.Exception.Message)"
        $exitCode = 1
    }
}

exit $exitCode
