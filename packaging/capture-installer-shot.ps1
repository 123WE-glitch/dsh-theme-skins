# Captures a screenshot of the installer window (docs/installer.png).
#
# usage: powershell -ExecutionPolicy Bypass -File packaging/capture-installer-shot.ps1 <out.png>
#
# Launches the installer in windowed mode against a throwaway profile, waits for
# the run to finish, then saves the window bitmap with PrintWindow.
param([string]$OutFile)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $root 'dist\DSH-ThemeSkins-Setup.exe'
if (-not (Test-Path $exe)) { throw 'Build the executables first: powershell -File packaging/build.ps1' }
if (-not $OutFile) { $OutFile = Join-Path $root 'tmp\installer-window.png' }

$base = Join-Path $root 'dist\.shot-test'
if (Test-Path $base) { Remove-Item $base -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $base 'profile') | Out-Null
@'
{
  "name": "dsh-profile-desktop",
  "private": true,
  "dependencies": {},
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base"] } }
}
'@ | Set-Content -Path (Join-Path $base 'profile\package.json') -Encoding UTF8

$env:DSH_PROFILE_DIR = Join-Path $base 'profile'
$env:DSH_THEME_SKINS_DIR = Join-Path $base 'target'
$logPath = Join-Path $base 'target\install.log'

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WindowCapture {
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
    public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $exe
$startInfo.UseShellExecute = $false
$process = [System.Diagnostics.Process]::Start($startInfo)
try {
    $deadline = (Get-Date).AddSeconds(120)
    $done = $false
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
        if ($process.HasExited) { throw 'installer exited before the screenshot could be taken' }
        if (Test-Path $logPath) {
            $content = Get-Content $logPath -Raw
            if ($content -match 'install completed successfully') { $done = $true; break }
        }
    }
    if (-not $done) { throw 'install did not finish in time' }
    Start-Sleep -Milliseconds 900

    $process.Refresh()
    $handle = $process.MainWindowHandle
    if ($handle -eq [IntPtr]::Zero) { throw 'installer window handle not available' }
    [WindowCapture]::SetForegroundWindow($handle) | Out-Null
    Start-Sleep -Milliseconds 500

    $rect = New-Object WindowCapture+RECT
    [WindowCapture]::GetWindowRect($handle, [ref]$rect) | Out-Null
    $width = $rect.Right - $rect.Left
    $height = $rect.Bottom - $rect.Top
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $hdc = $graphics.GetHdc()
    [WindowCapture]::PrintWindow($handle, $hdc, 2) | Out-Null
    $graphics.ReleaseHdc($hdc)
    $graphics.Dispose()
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutFile) | Out-Null
    $bitmap.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Host ('saved ' + $OutFile)
}
finally {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
    Remove-Item Env:DSH_PROFILE_DIR -ErrorAction SilentlyContinue
    Remove-Item Env:DSH_THEME_SKINS_DIR -ErrorAction SilentlyContinue
    Remove-Item $base -Recurse -Force -ErrorAction SilentlyContinue
}
