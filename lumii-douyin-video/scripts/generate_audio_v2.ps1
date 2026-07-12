[CmdletBinding()]
param(
    [string]$PythonCommand = "python",
    [string]$NpxCommand = "npx.cmd"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$edgeTtsVersion = "7.2.7"
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $projectRoot "public\audio\v2"
$sampleDirectory = Join-Path $outputDirectory "samples"
$sfxDirectory = Join-Path $outputDirectory "sfx"

New-Item -ItemType Directory -Force -Path $outputDirectory, $sampleDirectory, $sfxDirectory | Out-Null

function ConvertFrom-Utf8Base64 {
    param([Parameter(Mandatory = $true)][string]$Value)
    return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Value))
}

function Invoke-EdgeTts {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][string]$Voice,
        [Parameter(Mandatory = $true)][string]$Rate,
        [Parameter(Mandatory = $true)][string]$Pitch,
        [Parameter(Mandatory = $true)][string]$OutputPath
    )

    $edgeArgs = @(
        "-m", "edge_tts",
        "--voice", $Voice,
        "--rate=$Rate",
        "--pitch=$Pitch",
        "--volume=+0%",
        "--text", $Text,
        "--write-media", $OutputPath
    )
    & $PythonCommand @edgeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "edge-tts failed while generating '$OutputPath' (exit code $LASTEXITCODE)."
    }
}

function Get-MediaInfo {
    param([Parameter(Mandatory = $true)][string]$Path)

    $probeOutput = & $NpxCommand remotion ffprobe `
        -v error `
        -show_entries "format=duration" `
        -show_entries "stream=codec_name,sample_rate,channels" `
        -of json `
        $Path
    if ($LASTEXITCODE -ne 0) {
        throw "ffprobe failed for '$Path' (exit code $LASTEXITCODE)."
    }

    $probe = $probeOutput | ConvertFrom-Json
    $stream = @($probe.streams)[0]
    return [pscustomobject]@{
        File = [IO.Path]::GetFileName($Path)
        DurationSeconds = [math]::Round([double]$probe.format.duration, 6)
        Codec = [string]$stream.codec_name
        SampleRate = [int]$stream.sample_rate
        Channels = [int]$stream.channels
    }
}

$installedVersion = (& $PythonCommand -m edge_tts --version 2>$null)
if ($LASTEXITCODE -ne 0 -or $installedVersion -notmatch [regex]::Escape($edgeTtsVersion)) {
    Write-Host "Installing pinned edge-tts $edgeTtsVersion..."
    & $PythonCommand -m pip install --user "edge-tts==$edgeTtsVersion"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not install edge-tts $edgeTtsVersion."
    }
}

# Base64 keeps this script compatible with Windows PowerShell 5.1, which reads
# UTF-8-without-BOM source files using the current ANSI code page.
$sampleText = ConvertFrom-Utf8Base64 "562J562J77yM54Wn54mH6YeM55qE5q+b5a2p5a2Q77yM6LeR5Ye65p2l5ZWm77yf6L+Z5bCx5piv54G15Ly044CC"
$samples = @(
    [pscustomobject]@{
        File = "sample-a-xiaoxiao.mp3"
        Voice = "zh-CN-XiaoxiaoNeural"
        Rate = "+22%"
        Pitch = "+4Hz"
    },
    [pscustomobject]@{
        File = "sample-b-xiaoyi.mp3"
        Voice = "zh-CN-XiaoyiNeural"
        Rate = "+22%"
        Pitch = "+3Hz"
    }
)

Write-Host "Generating two voice comparison samples..."
foreach ($sample in $samples) {
    Invoke-EdgeTts `
        -Text $sampleText `
        -Voice $sample.Voice `
        -Rate $sample.Rate `
        -Pitch $sample.Pitch `
        -OutputPath (Join-Path $sampleDirectory $sample.File)
}

$selectedVoice = "zh-CN-XiaoyiNeural"
$selectedRate = "+22%"
$selectedPitch = "+3Hz"
$scenes = @(
    [pscustomobject]@{ File = "voice-01.mp3"; Text = (ConvertFrom-Utf8Base64 "562J562J77yM54Wn54mH6YeM55qE5q+b5a2p5a2Q77yM6LeR5Ye65p2l5ZWm77yf") },
    [pscustomobject]@{ File = "voice-02.mp3"; Text = (ConvertFrom-Utf8Base64 "6L+Z5bCx5piv54G15Ly077ya5LiA5byg54Wn54mH77yM55Sf5oiQ5LiT5bGe55S15a2Q5YiG6Lqr44CC") },
    [pscustomobject]@{ File = "voice-03.mp3"; Text = (ConvertFrom-Utf8Base64 "5LiN5piv5pu/5Luj6Zmq5Ly077yM5Y+q5piv5aSa5LiA56eN5Y+v54ix5qih5qC344CC") },
    [pscustomobject]@{ File = "voice-04.mp3"; Text = (ConvertFrom-Utf8Base64 "5oCn5qC844CB5oiQ6ZW/44CB57qq5b+15pel77yM5a6D6YO95pu/5L2g6K6k55yf6K6w5L2P44CC") },
    [pscustomobject]@{ File = "voice-05.mp3"; Text = (ConvertFrom-Utf8Base64 "6L+Y6IO95YWI5omT5oub5ZG877yM6YGH6KeB6ZmE6L+R5ZCM6aKR55qE5paw5pyL5Y+L44CC") },
    [pscustomobject]@{ File = "voice-06.mp3"; Text = (ConvertFrom-Utf8Base64 "5q+P5Liq556s6Ze077yM6YO95YC85b6X54+N6JeP44CC") },
    [pscustomobject]@{ File = "voice-07.mp3"; Text = (ConvertFrom-Utf8Base64 "6aaW5om55oub5Yuf5Lit77yB6K+E6K664oCc54G15Ly04oCd77yM5bim5q+b5a2p5a2Q5p2l5YaF5rWL77yB") }
)

Write-Host "Generating the seven selected Xiaoyi voiceover clips..."
foreach ($scene in $scenes) {
    Invoke-EdgeTts `
        -Text $scene.Text `
        -Voice $selectedVoice `
        -Rate $selectedRate `
        -Pitch $selectedPitch `
        -OutputPath (Join-Path $outputDirectory $scene.File)
}

$sfxAssets = [ordered]@{
    "sfx-shutter-modern.wav" = "https://remotion.media/shutter-modern.wav"
    "sfx-whip.wav" = "https://remotion.media/whip.wav"
    "sfx-whoosh.wav" = "https://remotion.media/whoosh.wav"
    "sfx-ding.wav" = "https://remotion.media/ding.wav"
    "sfx-record-scratch.wav" = "https://remotion.media/record-scratch.wav"
}

Write-Host "Downloading the Remotion-provided sound effects..."
foreach ($fileName in $sfxAssets.Keys) {
    Invoke-WebRequest `
        -Uri $sfxAssets[$fileName] `
        -OutFile (Join-Path $sfxDirectory $fileName) `
        -UseBasicParsing
}

$allMedia = @(
    $samples | ForEach-Object { Join-Path $sampleDirectory $_.File }
) + @(
    $scenes | ForEach-Object { Join-Path $outputDirectory $_.File }
) + @(
    $sfxAssets.Keys | ForEach-Object { Join-Path $sfxDirectory $_ }
)

$mediaReport = @($allMedia | ForEach-Object { Get-MediaInfo -Path $_ })
$voiceReport = @($mediaReport | Where-Object { $_.File -like "voice-*.mp3" })
$voiceDuration = ($voiceReport | Measure-Object -Property DurationSeconds -Sum).Sum

$manifest = [ordered]@{
    generatedAtUtc = [DateTime]::UtcNow.ToString("o")
    generator = "edge-tts $edgeTtsVersion"
    sampleText = $sampleText
    samples = @($samples | ForEach-Object {
        [ordered]@{
            file = "samples/$($_.File)"
            voice = $_.Voice
            rate = $_.Rate
            pitch = $_.Pitch
        }
    })
    selected = [ordered]@{
        voice = $selectedVoice
        voiceDescription = "Microsoft Chinese neural voice; listed by edge-tts as Female / Cartoon, Novel / Lively"
        rate = $selectedRate
        pitch = $selectedPitch
        reason = "Compared with Xiaoxiao on identical copy; Xiaoyi is the explicitly lively voice and is 0.120 seconds shorter on the sample."
    }
    scenes = @($scenes | ForEach-Object {
        [ordered]@{
            file = $_.File
            text = $_.Text
        }
    })
    sfx = @($sfxAssets.Keys | ForEach-Object {
        [ordered]@{
            file = "sfx/$_"
            source = $sfxAssets[$_]
        }
    })
    totalVoiceDurationSeconds = [math]::Round([double]$voiceDuration, 6)
    media = $mediaReport
}

$manifestPath = Join-Path $outputDirectory "manifest.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Host "`nGenerated audio report:"
$mediaReport | Format-Table File, DurationSeconds, Codec, SampleRate, Channels -AutoSize
Write-Host ("Total selected voice duration: {0:N6}s" -f $voiceDuration)
Write-Host "Manifest: $manifestPath"
