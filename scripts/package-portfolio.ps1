$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'index.html'))) { throw '请先运行 npm run build。' }
$deliveryRoot = Join-Path $projectRoot 'delivery'
New-Item -ItemType Directory -Path $deliveryRoot -Force | Out-Null
$archivePath = Join-Path $deliveryRoot '瓦力机器人-课程作品集.zip'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
$prefix = '瓦力机器人-课程作品集/'
try {
  foreach ($file in Get-ChildItem -LiteralPath $distRoot -Recurse -File) {
    $relative = $file.FullName.Substring($distRoot.Length + 1).Replace('\', '/')
    $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, ($prefix + 'dist/' + $relative), [System.IO.Compression.CompressionLevel]::Optimal)
  }
  $files = @(
    @('scripts\serve.mjs', 'scripts/serve.mjs'),
    @('Start-Show.ps1', 'Start-Show.ps1'),
    @('启动作品集.cmd', '启动作品集.cmd'),
    @('docs\使用说明.txt', '使用说明.txt'),
    @('docs\MODEL.md', 'docs/MODEL.md'),
    @('scripts\build-virtual-model.py', 'scripts/build-virtual-model.py'),
    @('src\content\catalog.json', 'src/content/catalog.json'),
    @('src\content\model-inventory.json', 'src/content/model-inventory.json'),
    @('src\content\robot-rig.json', 'src/content/robot-rig.json'),
    @('models\virtual\walle-assembled.blend', 'models/virtual/walle-assembled.blend')
  )
  foreach ($file in $files) {
    $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $projectRoot $file[0]), ($prefix + $file[1]), [System.IO.Compression.CompressionLevel]::Optimal)
  }
} finally {
  $archive.Dispose()
  $stream.Dispose()
}
Write-Output $archivePath
