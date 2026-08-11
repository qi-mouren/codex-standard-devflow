param(
    [string]$UiPath,
    [int]$MinDurationMs = 120,
    [int]$MaxDurationMs = 300,
    [string]$AllowedProps = 'transform,opacity',
    [switch]$Strict
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $UiPath)) {
    Write-Error "file not found: $UiPath"
    exit 1
}

$content = Get-Content -Raw -Encoding UTF8 -LiteralPath $UiPath
$warnings = [System.Collections.Generic.List[string]]::new()

function Add-Warn([string]$msg) {
    $warnings.Add($msg)
    Write-Host "[WARN] $msg"
}

$allowed = @($AllowedProps.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })

# 1. motion presence
$hasTransition = $content -match '(?i)transition\s*:'
$hasAnimation = $content -match '(?i)@keyframes|animation\s*:'
if (-not $hasTransition -and -not $hasAnimation) {
    Add-Warn 'no transition/animation found - motion may be missing (check genome phases)'
}

# 2. transition property lists: flag props outside allowed set and transition:all
if ($hasTransition) {
    $decls = [regex]::Matches($content, '(?i)transition\s*:\s*([^;}]+)')
    foreach ($m in $decls) {
        $decl = $m.Groups[1].Value
        if ($decl -match '(?i)\ball\b') {
            Add-Warn 'transition: all found - prefer explicit transform/opacity props'
            continue
        }
        $tokens = [regex]::Matches($decl, '[a-zA-Z-]+')
        foreach ($tok in $tokens) {
            $t = $tok.Value
            if ($t -match '(?i)^(ms|s|ease|ease-in|ease-out|ease-in-out|linear|steps|cubic-bezier)$') { continue }
            if ($allowed -contains $t) { continue }
            if ($t -eq '') { continue }
            Add-Warn "transition animates non-allowed prop: $t"
        }
    }
}

# 3. duration range
$durs = [regex]::Matches($content, '(?i)(\d+(?:\.\d+)?)\s*(ms|s)\b')
foreach ($m in $durs) {
    $val = [double]$m.Groups[1].Value
    $unit = $m.Groups[2].Value.ToLower()
    if ($unit -eq 's') { $val = $val * 1000 }
    if ($val -eq 0) { continue }
    if ($val -lt $MinDurationMs -or $val -gt $MaxDurationMs) {
        Add-Warn "duration ${val}ms outside range ${MinDurationMs}-${MaxDurationMs}ms"
    }
}

# 4. easing: ease-in should be exit-only
if ($content -match '(?i)\bease-in\b(?!-out)') {
    Add-Warn 'ease-in found - confirm it is exit/dismiss only, entrance should use ease-out'
}

# 5. infinite animations
if ($content -match '(?i)(animation[^;}]*infinite|infinite\s+(alternate)?)') {
    Add-Warn 'infinite animation found - decorative animation risk, verify against genome'
}

# 6. reduced motion
if ($content -notmatch '(?i)prefers-reduced-motion') {
    Add-Warn 'no prefers-reduced-motion found - add reduced-motion fallback'
}

if ($warnings.Count -eq 0) {
    Write-Host '[PASS] motion check clean'
    exit 0
}

Write-Host "[SUMMARY] $($warnings.Count) warning(s)"
if ($Strict) {
    Write-Host '[FAIL] strict mode: warnings treated as failures'
    exit 1
}
exit 0
