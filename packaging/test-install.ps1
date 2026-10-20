# End-to-end smoke test for the installer / uninstaller.
#
# Runs the built executables in --silent mode against throwaway profile
# directories, then checks the files, the plugin link and the profile
# package.json. Nothing touches your real Harness profile.
#
# usage: powershell -ExecutionPolicy Bypass -File packaging/test-install.ps1
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$setup = Join-Path $root 'dist\DSH-ThemeSkins-Setup.exe'
$uninstall = Join-Path $root 'dist\DSH-ThemeSkins-Uninstall.exe'
if (-not (Test-Path $setup)) { throw 'Build the executables first: powershell -File packaging/build.ps1' }
if (-not (Test-Path $uninstall)) { throw 'Uninstaller missing: run packaging/build.ps1' }

$failures = New-Object System.Collections.Generic.List[string]
function Assert([bool]$condition, [string]$message) {
    if ($condition) { Write-Host ('  PASS  ' + $message) }
    else { Write-Host ('  FAIL  ' + $message); $script:failures.Add($message) }
}
function New-Fixture([string]$dir) {
    $profile = Join-Path $dir 'profile'
    New-Item -ItemType Directory -Force -Path $profile | Out-Null
    @'
{
  "name": "dsh-profile-desktop",
  "private": true,
  "dependencies": {},
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base"
      ]
    }
  }
}
'@ | Set-Content -Path (Join-Path $profile 'package.json') -Encoding UTF8
    return $profile
}
function Read-Profile([string]$profile) {
    return Get-Content (Join-Path $profile 'package.json') -Raw
}

$base = Join-Path $root 'dist\.test-tmp'
if (Test-Path $base) { Remove-Item $base -Recurse -Force }
New-Item -ItemType Directory -Force -Path $base | Out-Null
Write-Host ('test root: ' + $base)

try {
    # --- official path: Harness runtime pnpm is available -------------------
    Write-Host 'case 1: install via the Harness runtime pnpm'
    $profile = New-Fixture (Join-Path $base 'case1')
    $target = Join-Path $base 'case1\target'
    $env:DSH_PROFILE_DIR = $profile
    $env:DSH_THEME_SKINS_DIR = $target
    & $setup --silent | Out-Null
    Assert ($LASTEXITCODE -eq 0) 'installer exits 0'
    Assert (Test-Path (Join-Path $target 'client.js')) 'payload extracted'
    Assert (Test-Path (Join-Path $target 'locale\zh.json')) 'locale files extracted'
    $pkg = Read-Profile $profile
    Assert ($pkg.Contains('"@local/dsh-theme-skins": "link:')) 'profile dependency registered'
    Assert ($pkg.Contains('"@local/dsh-theme-skins"' + [char]10) -or $pkg.Contains('"@local/dsh-theme-skins",') -or $pkg.Contains('"@local/dsh-theme-skins"' + "`r`n")) 'bundle enabled in dsh.profile.bundles'
    Assert (Test-Path (Join-Path $profile 'node_modules\@local\dsh-theme-skins')) 'plugin linked into profile node_modules'
    Assert ((Get-Content (Join-Path $profile 'package.json') -Raw) -ne '') 'package.json still readable'

    Write-Host 'case 2: re-run is idempotent'
    & $setup --silent | Out-Null
    Assert ($LASTEXITCODE -eq 0) 'second install exits 0'
    $pkg = Read-Profile $profile
    $bundleHits = ([regex]::Matches($pkg, '"@local/dsh-theme-skins"')).Count
    Assert ($bundleHits -eq 2) 'no duplicate dependency/bundle entries'

    Write-Host 'case 3: uninstall removes everything'
    & $uninstall --silent | Out-Null
    Assert ($LASTEXITCODE -eq 0) 'uninstaller exits 0'
    Assert (-not (Test-Path $target)) 'install directory removed'
    Assert (-not (Test-Path (Join-Path $profile 'node_modules\@local\dsh-theme-skins'))) 'plugin link removed'
    $pkg = Read-Profile $profile
    Assert (-not $pkg.Contains('@local/dsh-theme-skins')) 'profile entries removed'
    Assert ($pkg.Contains('"@deepseek-ai/dsh-base"')) 'other bundles preserved'

    # --- fallback path: no Harness runtime available ------------------------
    Write-Host 'case 4: fallback install without the Harness runtime (junction)'
    $fakeHome = Join-Path $base 'case4\home'
    New-Item -ItemType Directory -Force -Path (Join-Path $fakeHome 'profiles') | Out-Null
    $profile = New-Fixture (Join-Path $base 'case4')
    # The fake home has no dsh-runtimes directory, so pnpm discovery fails.
    Move-Item $profile (Join-Path $fakeHome 'profiles\desktop')
    $profile = Join-Path $fakeHome 'profiles\desktop'
    $target = Join-Path $base 'case4\target'
    $env:DSH_HOME = $fakeHome
    $env:DSH_PROFILE_DIR = $profile
    $env:DSH_THEME_SKINS_DIR = $target
    & $setup --silent | Out-Null
    Assert ($LASTEXITCODE -eq 0) 'fallback installer exits 0'
    $pkg = Read-Profile $profile
    Assert ($pkg.Contains('"@local/dsh-theme-skins": "link:')) 'fallback registers the dependency'
    Assert ($pkg.Contains('"@local/dsh-theme-skins"')) 'fallback enables the bundle'
    Assert (Test-Path (Join-Path $profile 'node_modules\@local\dsh-theme-skins')) 'fallback junction created'
    & $uninstall --silent | Out-Null
    Assert ($LASTEXITCODE -eq 0) 'fallback uninstall exits 0'
    Assert ((Read-Profile $profile) -notmatch '@local/dsh-theme-skins') 'fallback uninstall cleans profile'
}
finally {
    Remove-Item Env:DSH_PROFILE_DIR -ErrorAction SilentlyContinue
    Remove-Item Env:DSH_THEME_SKINS_DIR -ErrorAction SilentlyContinue
    Remove-Item Env:DSH_HOME -ErrorAction SilentlyContinue
    Remove-Item $base -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host 'all installer tests passed'
    exit 0
}
Write-Host ($failures.Count.ToString() + ' assertion(s) failed')
exit 1
