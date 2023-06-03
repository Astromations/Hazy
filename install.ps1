# Edited from the Comfy spicetify theme script (https://github.com/Comfy-Themes/Spicetify/blob/main/install.ps1)
param (
  [string] $version
)

$PSMinVersion = 3

if ($v) {
  $version = $v
}

# Helper functions for pretty terminal output.
function Write-Part ([string] $Text) {
  Write-Host $Text -NoNewline
}

function Write-Emphasized ([string] $Text) {
  Write-Host $Text -NoNewLine -ForegroundColor "Cyan"
}

function Write-Done {
  Write-Host " > " -NoNewline
  Write-Host "OK" -ForegroundColor "Green"
}

if ($PSVersionTable.PSVersion.Major -gt $PSMinVersion) {
  $ErrorActionPreference = "Stop"

  # Enable TLS 1.2 since it is required for connections to GitHub.
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  $checkSpice = Get-Command spicetify -ErrorAction Silent
  if ($null -eq $checkSpice) {
    Write-Host -ForegroundColor Red "Spicetify not found"
    Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/khanhas/spicetify-cli/master/install.ps1" | Invoke-Expression
  }

  # Check ~\.spicetify\Themes directory already exists
  $spicePath = spicetify -c | Split-Path
  $sp_dot_dir = "$spicePath\Themes"
  Write-Part "MAKING FOLDER  "; Write-Emphasized "$sp_dot_dir\Hazy"
  Remove-Item -Recurse -Force "$sp_dot_dir\Hazy" -ErrorAction Ignore
  New-Item -Path "$sp_dot_dir\Hazy" -ItemType Directory | Out-Null
  Write-Done

  # Clone to .spicetify.
  Write-Part "DOWNLOADING    "; Write-Emphasized $sp_dot_dir
  Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Astromations/Hazy/main/color.ini" -UseBasicParsing -OutFile "$sp_dot_dir\Hazy\color.ini"
  Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Astromations/Hazy/main/user.css" -UseBasicParsing -OutFile "$sp_dot_dir\Hazy\user.css"
  Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Astromations/Hazy/main/theme.js" -UseBasicParsing -OutFile "$sp_dot_dir\Hazy\theme.js"
  Write-Done

  # Installing.
  Write-Part "INSTALLING `r`n"
  spicetify config inject_css 1 replace_colors 1 overwrite_assets 1 inject_theme_js 1
  spicetify config current_theme Hazy
  Write-Done	
  
  # applying.
  Write-Part "APPLYING";
  spicetify backup
  spicetify apply
  Write-Done
}
else {
  Write-Part "`nYour Powershell version is less than "; Write-Emphasized "$PSMinVersion";
  Write-Part "`nPlease, update your Powershell downloading the "; Write-Emphasized "'Windows Management Framework'"; Write-Part " greater than "; Write-Emphasized "$PSMinVersion"
}
