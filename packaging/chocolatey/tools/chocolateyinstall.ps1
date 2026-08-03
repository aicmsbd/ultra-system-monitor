$ErrorActionPreference = 'Stop'

$packageArgs = @{
  packageName    = 'ultra-system-monitor'
  fileType       = 'exe'
  url64bit       = 'https://github.com/aicmsbd/ultra-system-monitor/releases/download/v1.0.0/UltraSystemMonitor-Setup-1.0.0.exe'
  checksum64     = '71F377D3A5B6E08D35893498B23CC9094250D0CE7B1853FECEB083D5B8ED314A'
  checksumType64 = 'sha256'
  silentArgs     = '/S'
  validExitCodes = @(0)
  softwareName   = 'Ultra System Monitor*'
}

Install-ChocolateyPackage @packageArgs
