<#
.SYNOPSIS
  Installs the Ganit Offer Letter Generator on this machine and puts a
  clickable shortcut on the Desktop and in the Start menu.

.DESCRIPTION
  The app is a single self-contained .html file. There is nothing to compile,
  no Node, no server and no admin rights needed - everything installs under
  the current user's AppData.

  The shortcut launches the page in Edge's app mode (--app), which opens a
  plain window with no address bar and no tabs, so it reads as an application
  rather than a web page.

  Run once per machine:
      Right-click Setup.ps1  ->  Run with PowerShell

  To remove it again:
      powershell -ExecutionPolicy Bypass -File Setup.ps1 -Uninstall
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
  [string] $AppName = 'Ganit Offer Letter',
  [switch] $Uninstall
)

$ErrorActionPreference = 'Stop'

$InstallDir   = Join-Path $env:LOCALAPPDATA 'Ganit\Offer Letter Generator'
$HtmlName     = "$AppName.html"
$IconPath     = Join-Path $InstallDir 'app.ico'
$DesktopLnk   = Join-Path ([Environment]::GetFolderPath('Desktop')) "$AppName.lnk"
$StartMenuLnk = Join-Path ([Environment]::GetFolderPath('StartMenu')) "Programs\$AppName.lnk"

function Write-Step($msg) { Write-Host "  $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------- uninstall
if ($Uninstall) {
  Write-Host "`nRemoving $AppName...`n" -ForegroundColor White
  foreach ($lnk in @($DesktopLnk, $StartMenuLnk)) {
    if (Test-Path $lnk) { Remove-Item $lnk -Force; Write-Ok "Removed shortcut: $lnk" }
  }
  if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force; Write-Ok "Removed $InstallDir" }
  Write-Host "`nDone. $AppName has been removed.`n" -ForegroundColor Green
  return
}

Write-Host "`nInstalling $AppName...`n" -ForegroundColor White

# ------------------------------------------------------- locate the app file
# The .html sits next to this script in the folder that was handed over.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$source    = Get-ChildItem -Path $scriptDir -Filter '*.html' -File | Select-Object -First 1
if (-not $source) {
  throw "No .html file found next to Setup.ps1 (looked in $scriptDir). Copy the whole folder, not just the script."
}
Write-Step "Found app: $($source.Name)  ($([math]::Round($source.Length / 1KB)) KB)"

# ------------------------------------------------------------------- install
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$target = Join-Path $InstallDir $HtmlName
Copy-Item $source.FullName $target -Force
Write-Ok "Installed to $InstallDir"

# ---------------------------------------------------------------- build icon
# The Ganit logo is already inlined in the page as a data: URI, so the icon is
# rebuilt from the app itself rather than shipping a second image alongside it.
$iconBuilt = $false
try {
  Add-Type -AssemblyName System.Drawing
  $html  = Get-Content $target -Raw
  $match = [regex]::Match($html, 'data:image/png;base64,([A-Za-z0-9+/=]{500,})')
  if ($match.Success) {
    $png = [Convert]::FromBase64String($match.Groups[1].Value)
    $ms  = New-Object System.IO.MemoryStream(,$png)
    $img = [System.Drawing.Image]::FromStream($ms)

    # Centre the logo on a 256x256 transparent square, keeping its aspect
    # ratio - the logo is landscape and would otherwise be stretched.
    $canvas = New-Object System.Drawing.Bitmap 256, 256
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.Clear([System.Drawing.Color]::Transparent)
    $scale = [Math]::Min(256 / $img.Width, 256 / $img.Height)
    $w = [int]($img.Width * $scale)
    $h = [int]($img.Height * $scale)
    $g.DrawImage($img, [int]((256 - $w) / 2), [int]((256 - $h) / 2), $w, $h)
    $g.Dispose()

    $pngMs = New-Object System.IO.MemoryStream
    $canvas.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $pngMs.ToArray()

    # Minimal ICO wrapper around a single PNG frame (supported since Vista):
    # 6-byte header, one 16-byte directory entry, then the PNG payload.
    $icoMs = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($icoMs)
    $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
    $bw.Write([Byte]0)    # width  0 means 256
    $bw.Write([Byte]0)    # height 0 means 256
    $bw.Write([Byte]0); $bw.Write([Byte]0)
    $bw.Write([UInt16]1); $bw.Write([UInt16]32)
    $bw.Write([UInt32]$pngBytes.Length)
    $bw.Write([UInt32]22)
    $bw.Write($pngBytes)
    $bw.Flush()
    [System.IO.File]::WriteAllBytes($IconPath, $icoMs.ToArray())

    $img.Dispose(); $canvas.Dispose(); $ms.Dispose(); $pngMs.Dispose(); $icoMs.Dispose()
    $iconBuilt = $true
    Write-Ok "Created Ganit icon"
  }
} catch {
  Write-Warn "Could not build the logo icon ($($_.Exception.Message)) - using the browser's default."
}

# -------------------------------------------------------------- find browser
# Edge first: it is present on every Windows 11 machine, so this works even
# where Chrome is not installed.
$browser = $null
foreach ($exe in @('msedge.exe', 'chrome.exe')) {
  foreach ($root in @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths',
                      'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths')) {
    $key = Join-Path $root $exe
    if (Test-Path $key) {
      $candidate = (Get-ItemProperty $key).'(default)'
      if ($candidate -and (Test-Path $candidate)) { $browser = $candidate; break }
    }
  }
  if ($browser) { break }
}

# --------------------------------------------------------------- shortcuts
$fileUrl = ([uri] $target).AbsoluteUri
$shell   = New-Object -ComObject WScript.Shell

foreach ($lnkPath in @($DesktopLnk, $StartMenuLnk)) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $lnkPath) | Out-Null
  $lnk = $shell.CreateShortcut($lnkPath)

  if ($browser) {
    # --app strips the address bar and tabs, giving a standalone window.
    $lnk.TargetPath = $browser
    $lnk.Arguments  = "--app=`"$fileUrl`""
  } else {
    # No Edge or Chrome found - fall back to whatever opens .html files.
    # The page still works, just inside a normal browser tab.
    $lnk.TargetPath = $target
  }

  $lnk.WorkingDirectory = $InstallDir
  $lnk.Description      = 'Create a Ganit offer letter'
  if ($iconBuilt) { $lnk.IconLocation = "$IconPath,0" }
  $lnk.Save()
}

if ($browser) {
  Write-Ok "Shortcut opens in: $(Split-Path -Leaf $browser) (app window, no address bar)"
} else {
  Write-Warn "Neither Edge nor Chrome was found - the shortcut opens in the default browser."
}
Write-Ok "Desktop shortcut:    $DesktopLnk"
Write-Ok "Start menu shortcut: $StartMenuLnk"

Write-Host "`nDone. Double-click '$AppName' on the Desktop to start.`n" -ForegroundColor Green
Write-Host "Tip: to be asked where to save each letter, turn on" -ForegroundColor DarkGray
Write-Host "     edge://settings/downloads -> 'Ask me what to do with each download'`n" -ForegroundColor DarkGray
