[CmdletBinding()]
param(
    [string]$PythonCommand = "python"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$audioDirectory = Join-Path $projectRoot "public\audio"
$bgmPath = Join-Path $audioDirectory "lumii-original-bgm.wav"
$whooshPath = Join-Path $audioDirectory "whoosh.wav"
$chimePath = Join-Path $audioDirectory "chime.wav"
$bgmScript = Join-Path $PSScriptRoot "generate_bgm.py"

New-Item -ItemType Directory -Force -Path $audioDirectory | Out-Null

Write-Host "Generating original Lumii BGM..."
& $PythonCommand $bgmScript --output $bgmPath --whoosh $whooshPath --chime $chimePath
if ($LASTEXITCODE -ne 0) {
    throw "BGM generator exited with code $LASTEXITCODE"
}

Add-Type -AssemblyName System.Speech

$voiceName = "Microsoft Huihui Desktop"

# Keep the script Windows PowerShell 5.1 compatible: that host interprets UTF-8
# without a BOM as the current ANSI code page, so narration text is stored as
# explicit UTF-8 base64 and decoded at runtime.
function ConvertFrom-Utf8Base64 {
    param([Parameter(Mandatory = $true)][string]$Value)
    return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Value))
}

$scenes = @(
    [pscustomobject]@{ File = "voice-01.wav"; Text = (ConvertFrom-Utf8Base64 "5aaC5p6c77yM5a6D6IO95LuO54Wn54mH6YeM6LeR5Ye65p2l77yf") },
    [pscustomobject]@{ File = "voice-02.wav"; Text = (ConvertFrom-Utf8Base64 "6L+Z5piv54G15Ly044CC5oqK55yf5a6e55qE5a6D77yM5Y+Y5oiQ5LiT5bGe55S15a2Q5YiG6Lqr44CC") },
    [pscustomobject]@{ File = "voice-03.wav"; Text = (ConvertFrom-Utf8Base64 "5LiN5piv5pu/5Luj6Zmq5Ly077yM5piv6K6p6Zmq5Ly077yM5aSa5LiA56eN5qC35a2Q44CC") },
    [pscustomobject]@{ File = "voice-04.wav"; Text = (ConvertFrom-Utf8Base64 "5a6D55qE5oCn5qC844CB5oiQ6ZW/5ZKM6YeN6KaB5pel5a2Q77yM6YO96KKr6K6k55yf6K6w5L2P44CC") },
    [pscustomobject]@{ File = "voice-05.wav"; Text = (ConvertFrom-Utf8Base64 "6K6p5q+b5a2p5a2Q5YWI5omT5oub5ZG877yM6YGH6KeB6ZmE6L+R5ZCM6aKR55qE5LyZ5Ly044CC") },
    [pscustomobject]@{ File = "voice-06.wav"; Text = (ConvertFrom-Utf8Base64 "5Zug5Li65YW75a6g77yM5piv5LiA5q615YC85b6X6K6k55yf55WZ5LiL55qE5YWz57O744CC") },
    [pscustomobject]@{ File = "voice-07.wav"; Text = (ConvertFrom-Utf8Base64 "6aaW5om55L2T6aqM55So5oi35oub5Yuf5Lit44CC6K+E6K664oCc54G15Ly04oCd77yM5bim5LiK5q+b5a2p5a2Q77yM55Sz6K+35YaF5rWL44CC") }
)

$probe = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $availableVoiceNames = @($probe.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })
    if ($voiceName -notin $availableVoiceNames) {
        throw "Required Windows voice '$voiceName' is not installed. Installed voices: $($availableVoiceNames -join ', ')"
    }
}
finally {
    $probe.Dispose()
}

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
    48000,
    [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
    [System.Speech.AudioFormat.AudioChannel]::Mono
)

Write-Host "Generating scene voiceovers with $voiceName..."
foreach ($scene in $scenes) {
    $outputPath = Join-Path $audioDirectory $scene.File
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $synth.SelectVoice($voiceName)
        # Fast, conversational Douyin delivery; punctuation still supplies natural breaks.
        $synth.Rate = 6
        $synth.Volume = 100
        $synth.SetOutputToWaveFile($outputPath, $format)
        $synth.Speak($scene.Text)
        $synth.SetOutputToNull()
    }
    finally {
        $synth.Dispose()
    }
}

function Get-WavInfo {
    param([Parameter(Mandatory = $true)][string]$Path)

    $stream = [System.IO.File]::OpenRead($Path)
    $reader = New-Object System.IO.BinaryReader($stream)
    try {
        $riff = -join ($reader.ReadChars(4))
        [void]$reader.ReadUInt32()
        $wave = -join ($reader.ReadChars(4))
        if ($riff -ne "RIFF" -or $wave -ne "WAVE") {
            throw "Not a RIFF/WAVE file: $Path"
        }

        $sampleRate = 0
        $channels = 0
        $bitsPerSample = 0
        $blockAlign = 0
        [long]$dataBytes = 0

        while ($stream.Position -le $stream.Length - 8) {
            $chunkId = -join ($reader.ReadChars(4))
            [long]$chunkSize = $reader.ReadUInt32()
            $chunkStart = $stream.Position

            if ($chunkId -eq "fmt ") {
                [void]$reader.ReadUInt16()
                $channels = $reader.ReadUInt16()
                $sampleRate = $reader.ReadUInt32()
                [void]$reader.ReadUInt32()
                $blockAlign = $reader.ReadUInt16()
                $bitsPerSample = $reader.ReadUInt16()
            }
            elseif ($chunkId -eq "data") {
                $dataBytes = $chunkSize
            }

            $nextChunk = $chunkStart + $chunkSize + ($chunkSize % 2)
            if ($nextChunk -gt $stream.Length) {
                break
            }
            $stream.Position = $nextChunk
        }

        if ($sampleRate -le 0 -or $blockAlign -le 0 -or $dataBytes -le 0) {
            throw "Missing WAV format or data chunk: $Path"
        }

        [long]$frames = [math]::Floor($dataBytes / $blockAlign)
        [pscustomobject]@{
            File = Split-Path -Leaf $Path
            DurationSeconds = [math]::Round($frames / [double]$sampleRate, 6)
            Frames = $frames
            SampleRate = $sampleRate
            Channels = $channels
            BitsPerSample = $bitsPerSample
        }
    }
    finally {
        $reader.Dispose()
        $stream.Dispose()
    }
}

$generatedFiles = @($bgmPath, $whooshPath, $chimePath) + @($scenes | ForEach-Object { Join-Path $audioDirectory $_.File })
$report = @($generatedFiles | ForEach-Object { Get-WavInfo -Path $_ })

Write-Host "`nGenerated WAV report:"
$report | Format-Table File, DurationSeconds, Frames, SampleRate, Channels, BitsPerSample -AutoSize

$voiceDuration = ($report | Where-Object { $_.File -like "voice-*.wav" } | Measure-Object -Property DurationSeconds -Sum).Sum
Write-Host ("Total scene voice duration (without inter-scene gaps): {0:N6}s" -f $voiceDuration)
