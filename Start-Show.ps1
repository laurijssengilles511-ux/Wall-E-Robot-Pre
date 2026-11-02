param(
  [switch]$NoBrowser,
  [ValidateRange(1024, 65535)][int]$Port = 4173
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw '请先安装 Node.js 22 或更新版本，然后重新双击启动作品集.cmd。' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
  throw '未找到 dist 文件夹。请完整解压作品集包；若使用源码，请先运行 npm install 和 npm run build。'
}

$showUrl = 'http://127.0.0.1:' + $Port
$runtimeRoot = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$stdoutLog = Join-Path $runtimeRoot ('server-' + $Port + '.out.log')
$stderrLog = Join-Path $runtimeRoot ('server-' + $Port + '.err.log')

function Test-PortfolioReady {
  try {
    $page = Invoke-WebRequest -Uri $showUrl -TimeoutSec 2 -UseBasicParsing
    return $page.Content.Contains('瓦力机器人')
  } catch {
    # An untyped catch is deliberate: the built-in Windows PowerShell 5.1
    # does not necessarily load System.Net.Http.HttpRequestException.
    return $false
  }
}

if (-not (Test-PortfolioReady)) {
  $serveScript = Join-Path $projectRoot 'scripts\serve.mjs'
  if (-not (Test-Path -LiteralPath $serveScript)) { throw '未找到 scripts\serve.mjs，请完整解压作品集包。' }
  $previousPort = $env:PORT
  try {
    $env:PORT = [string]$Port
    $serverProcess = Start-Process -FilePath $nodeCommand.Source -ArgumentList ('"' + $serveScript + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
  } finally {
    $env:PORT = $previousPort
  }
  $deadline = (Get-Date).AddSeconds(15)
  $serverReady = $false
  do {
    $serverProcess.Refresh()
    if ($serverProcess.HasExited) {
      $details = ''
      if (Test-Path -LiteralPath $stderrLog) { $details = Get-Content -LiteralPath $stderrLog -Raw -Encoding UTF8 }
      throw ('网页服务启动失败。可能是端口 ' + $Port + ' 已被占用。错误记录：' + $stderrLog + [Environment]::NewLine + $details)
    }
    if (Test-PortfolioReady) { $serverReady = $true; break }
    Start-Sleep -Milliseconds 200
  } while ((Get-Date) -lt $deadline)
  if (-not $serverReady) { throw ('网页服务未能就绪，请查看错误记录：' + $stderrLog) }
  Set-Content -LiteralPath (Join-Path $runtimeRoot ('server-' + $Port + '.pid')) -Value $serverProcess.Id -Encoding ASCII
}

Write-Output ('READY ' + $showUrl + '/#/')
if (-not $NoBrowser) { Start-Process ($showUrl + '/#/') }
