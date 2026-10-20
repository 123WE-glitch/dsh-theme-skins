# Builds the Windows one-click installer, the uninstaller and the portable ZIP.
#
# usage:  powershell -ExecutionPolicy Bypass -File packaging/build.ps1
#
# Requirements: Windows with .NET Framework 4.x (csc.exe) and Node.js
# (the Harness runtime's node.exe is used automatically when node is not on PATH).
param(
    [switch]$SkipPortable
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
New-Item -ItemType Directory -Force -Path $dist | Out-Null

# --- tool resolution --------------------------------------------------------
function Resolve-Tool([string]$name, [string]$fallbackPattern) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    if ($fallbackPattern) {
        $hit = Get-ChildItem $fallbackPattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($hit) { return $hit.FullName }
    }
    return $null
}

$dshRuntime = Join-Path $env:DSH_HOME 'dsh-runtimes'
$node = Resolve-Tool 'node' (Join-Path $dshRuntime '*\dependencies\node\bin\node.exe')
if (-not $node) { throw 'Node.js not found: install Node.js or run from a machine with DeepSeek Harness.' }

$python = Resolve-Tool 'python' (Join-Path $dshRuntime '*\dependencies\python\python.exe')

$cscCandidates = @(
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
)
$csc = $cscCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $csc) { throw '.NET Framework csc.exe not found; install .NET Framework 4.x.' }

# --- assets ----------------------------------------------------------------
$icon = Join-Path $PSScriptRoot 'icon.ico'
if ($python) {
    & $python (Join-Path $PSScriptRoot 'make-icon.py') $icon
} elseif (-not (Test-Path $icon)) {
    throw 'icon.ico missing and Python/Pillow unavailable to generate it.'
}

$payload = Join-Path $PSScriptRoot 'Payload.g.cs'
& $node (Join-Path $PSScriptRoot 'generate-payload.mjs') $root $payload
if ($LASTEXITCODE -ne 0) { throw 'payload generation failed' }

# --- compile ---------------------------------------------------------------
$setup = Join-Path $dist 'DSH-ThemeSkins-Setup.exe'
$uninstall = Join-Path $dist 'DSH-ThemeSkins-Uninstall.exe'
& $csc /nologo /codepage:65001 /target:winexe /platform:anycpu /optimize+ "/win32icon:$icon" "/out:$setup" `
    /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll `
    (Join-Path $PSScriptRoot 'Installer.cs') $payload
if ($LASTEXITCODE -ne 0) { throw 'installer compilation failed' }
Copy-Item $setup $uninstall -Force

# --- portable zip ----------------------------------------------------------
if (-not $SkipPortable) {
    $stage = Join-Path $dist 'portable'
    if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $stage | Out-Null
    $runtimeFiles = @('package.json', 'cordis.patch.yml', 'index.js', 'client.js', 'icon.svg')
    foreach ($file in $runtimeFiles) { Copy-Item (Join-Path $root $file) $stage }
    New-Item -ItemType Directory -Force -Path (Join-Path $stage 'locale') | Out-Null
    Copy-Item (Join-Path $root 'locale\*.json') (Join-Path $stage 'locale')

    $template = Get-Content (Join-Path $PSScriptRoot 'portable-readme.txt') -Raw -Encoding UTF8
    $template = $template.Replace('{{VERSION}}', $version)
    $utf8 = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText((Join-Path $stage 'README.txt'), $template, $utf8)

    $zip = Join-Path $dist 'dsh-theme-skins-portable.zip'
    if (Test-Path $zip) { Remove-Item $zip -Force }
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
    Write-Host ('portable zip: ' + $zip)
}

Write-Host ''
Write-Host ('installer : ' + $setup)
Write-Host ('uninstall : ' + $uninstall)
Write-Host ('version   : ' + $version)
