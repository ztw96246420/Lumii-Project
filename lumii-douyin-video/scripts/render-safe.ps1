param(
  [string]$Output = "out\lumii-douyin-recruitment-v2.mp4",
  [int]$AffinityMask = 3
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

$outDir = Join-Path $projectRoot "out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$stdout = Join-Path $outDir "safe-render.stdout.log"
$stderr = Join-Path $outDir "safe-render.stderr.log"
$npx = (Get-Command npx.cmd -ErrorAction Stop).Source

$arguments = @(
  "remotion", "render", "LumiiRecruitment", $Output,
  "--codec=h264",
  "--crf=20",
  "--x264-preset=superfast",
  "--concurrency=1",
  "--gl=swangle",
  "--hardware-acceleration=disable",
  "--disallow-parallel-encoding",
  "--bundle-cache=false",
  "--log=info"
)

$process = Start-Process `
  -FilePath $npx `
  -ArgumentList $arguments `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

$process.PriorityClass = "BelowNormal"
$process.ProcessorAffinity = [IntPtr]$AffinityMask

function Set-RenderTreeLimits {
  param(
    [Parameter(Mandatory = $true)][int]$RootProcessId,
    [Parameter(Mandatory = $true)][int]$Mask
  )

  $rows = @(Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId -ErrorAction SilentlyContinue)
  $ids = New-Object 'System.Collections.Generic.HashSet[int]'
  [void]$ids.Add($RootProcessId)
  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($row in $rows) {
      if ($ids.Contains([int]$row.ParentProcessId) -and $ids.Add([int]$row.ProcessId)) {
        $changed = $true
      }
    }
  }

  foreach ($id in $ids) {
    try {
      $child = Get-Process -Id $id -ErrorAction Stop
      $child.PriorityClass = "BelowNormal"
      $child.ProcessorAffinity = [IntPtr]$Mask
    } catch {
      # Short-lived helpers may exit between discovery and assignment.
    }
  }
}

while (-not $process.WaitForExit(1000)) {
  Set-RenderTreeLimits -RootProcessId $process.Id -Mask $AffinityMask
}
Set-RenderTreeLimits -RootProcessId $process.Id -Mask $AffinityMask
$process.WaitForExit()
$process.Refresh()

Get-Content -LiteralPath $stdout -ErrorAction SilentlyContinue
Get-Content -LiteralPath $stderr -ErrorAction SilentlyContinue

$exitCode = $process.ExitCode
if ($null -eq $exitCode) {
  $successMarker = Select-String -LiteralPath $stdout -Pattern '^\+\s+.+\.mp4\s+' -ErrorAction SilentlyContinue
  $exitCode = if ((Test-Path -LiteralPath $Output) -and $successMarker) { 0 } else { 1 }
}

if ($exitCode -ne 0) {
  throw "Remotion safe render failed with exit code $exitCode."
}

Write-Host "Safe render completed: $Output"
