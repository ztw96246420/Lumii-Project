#!/usr/bin/env python3
"""Generate Lumii's original 26-second warm electronic BGM.

The piece is synthesized entirely from deterministic oscillators and noise, so it
does not depend on or sample any third-party recording. Output is 48 kHz, stereo,
16-bit PCM WAV.
"""

from __future__ import annotations

import argparse
import math
import sys
import wave
from array import array
from pathlib import Path


SAMPLE_RATE = 48_000
DURATION_SECONDS = 26.0
TEMPO_BPM = 120.0
BEAT_SECONDS = 60.0 / TEMPO_BPM
BAR_SECONDS = BEAT_SECONDS * 4.0

# Thirteen two-second bars. The final tonic bar gives the CTA a resolved ending.
CHORDS = (
    (60, 64, 67, 71, 74),  # Cmaj9
    (57, 60, 64, 67, 71),  # Am9
    (53, 57, 60, 64, 67),  # Fmaj9
    (55, 59, 62, 64, 69),  # G6/9
    (60, 64, 67, 71, 74),
    (57, 60, 64, 67, 71),
    (50, 53, 57, 60, 64),  # Dm9
    (55, 59, 62, 64, 69),
    (52, 55, 59, 62, 66),  # Em9
    (57, 60, 64, 67, 71),
    (53, 57, 60, 64, 67),
    (55, 59, 62, 64, 69),
    (60, 64, 67, 71, 74),
)

ARPEGGIO = (0, 2, 1, 3, 2, 4, 3, 1)
TAU = math.tau


def midi_frequency(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def smoothstep(edge0: float, edge1: float, value: float) -> float:
    if edge0 == edge1:
        return 1.0 if value >= edge1 else 0.0
    x = min(1.0, max(0.0, (value - edge0) / (edge1 - edge0)))
    return x * x * (3.0 - 2.0 * x)


def synthesize() -> tuple[array, array, float]:
    total_frames = round(SAMPLE_RATE * DURATION_SECONDS)
    left = array("f")
    right = array("f")
    append_left = left.append
    append_right = right.append

    # Deterministic LCG noise: reproducible on every Python installation.
    noise_state = 0x4C554D49  # ASCII-ish seed: LUMI
    previous_noise = 0.0
    peak = 0.0

    chord_frequencies = [tuple(midi_frequency(note) for note in chord) for chord in CHORDS]
    bass_frequencies = [midi_frequency(chord[0] - 24) for chord in CHORDS]

    for sample_index in range(total_frames):
        t = sample_index / SAMPLE_RATE
        bar_index = min(len(CHORDS) - 1, int(t / BAR_SECONDS))
        bar_time = t - bar_index * BAR_SECONDS
        chord = chord_frequencies[bar_index]

        # The master contour leaves room for the opening question and softens the CTA tail.
        master = smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(24.9, 26.0, t))
        if bar_index == 0:
            arrangement = 0.72 + 0.28 * smoothstep(0.0, 1.4, t)
        elif bar_index == len(CHORDS) - 1:
            arrangement = 1.0 - 0.22 * smoothstep(24.0, 25.7, t)
        else:
            arrangement = 1.0

        # Warm detuned pad. A short bar-edge fade prevents clicks while preserving momentum.
        pad_envelope = smoothstep(0.0, 0.16, bar_time) * (
            1.0 - smoothstep(BAR_SECONDS - 0.20, BAR_SECONDS, bar_time)
        )
        pad_left = 0.0
        pad_right = 0.0
        for voice_index, frequency in enumerate(chord[:4]):
            phase_offset = voice_index * 0.71
            left_tone = math.sin(TAU * frequency * 0.997 * t + phase_offset)
            right_tone = math.sin(TAU * frequency * 1.003 * t + phase_offset + 0.14)
            # A quiet octave harmonic adds a soft, glassy warmth without masking speech.
            left_tone += 0.16 * math.sin(TAU * frequency * 1.994 * t + phase_offset * 1.7)
            right_tone += 0.16 * math.sin(TAU * frequency * 2.006 * t + phase_offset * 1.7)
            pan = (voice_index - 1.5) / 4.5
            pad_left += left_tone * (1.0 - pan)
            pad_right += right_tone * (1.0 + pan)
        pad_left *= 0.020 * pad_envelope
        pad_right *= 0.020 * pad_envelope

        # Rounded sub-bass pulse on each quarter note.
        beat_index = int(t / BEAT_SECONDS)
        beat_age = t - beat_index * BEAT_SECONDS
        bass_envelope = (1.0 - math.exp(-beat_age / 0.012)) * math.exp(-beat_age / 0.28)
        bass_frequency = bass_frequencies[bar_index]
        bass = 0.105 * bass_envelope * (
            math.sin(TAU * bass_frequency * t)
            + 0.18 * math.sin(TAU * bass_frequency * 2.0 * t)
        )

        # Gentle eighth-note pluck for clear, edit-friendly Douyin cut points.
        eighth_seconds = BEAT_SECONDS / 2.0
        eighth_index = int(t / eighth_seconds)
        eighth_age = t - eighth_index * eighth_seconds
        note_index = ARPEGGIO[eighth_index % len(ARPEGGIO)]
        pluck_frequency = chord[note_index] * 2.0
        pluck_envelope = (1.0 - math.exp(-eighth_age / 0.004)) * math.exp(-eighth_age / 0.12)
        pluck = 0.047 * pluck_envelope * (
            math.sin(TAU * pluck_frequency * t)
            + 0.24 * math.sin(TAU * pluck_frequency * 2.0 * t + 0.3)
        )
        pluck_pan = -0.34 if eighth_index % 2 == 0 else 0.34

        # Soft electronic kick: pitched sine sweep, strongest at each two-second downbeat.
        kick_age = beat_age
        kick_phase_cycles = 48.0 * kick_age + 5.2 * (1.0 - math.exp(-kick_age / 0.052))
        kick_strength = 1.0 if beat_index % 4 == 0 else 0.72
        kick = (
            0.19
            * kick_strength
            * math.exp(-kick_age / 0.115)
            * math.sin(TAU * kick_phase_cycles)
        )

        # Deterministic, high-passed noise powers quiet hats and a restrained backbeat.
        noise_state = (1664525 * noise_state + 1013904223) & 0xFFFFFFFF
        noise = ((noise_state >> 8) / 8_388_607.5) - 1.0
        high_noise = noise - previous_noise
        previous_noise = noise

        hat_age = eighth_age
        hat_strength = 1.0 if eighth_index % 2 else 0.62
        hat = 0.015 * hat_strength * math.exp(-hat_age / 0.026) * high_noise

        # Beats two and four, deliberately low in the mix to stay beneath narration.
        backbeat_age = (bar_time - BEAT_SECONDS) % (BEAT_SECONDS * 2.0)
        if backbeat_age < 0.16:
            snare_envelope = math.exp(-backbeat_age / 0.058)
            snare = 0.038 * snare_envelope * high_noise
            snare += 0.018 * math.exp(-backbeat_age / 0.10) * math.sin(
                TAU * 176.0 * backbeat_age
            )
        else:
            snare = 0.0

        # A tiny high chime marks each scene-friendly two-second downbeat.
        sparkle_envelope = math.exp(-bar_time / 0.27)
        sparkle_frequency = chord[2] * 3.0
        sparkle = 0.018 * sparkle_envelope * math.sin(
            TAU * sparkle_frequency * t + 0.18 * math.sin(TAU * 4.0 * t)
        )

        centered = bass + kick + snare
        l_value = master * arrangement * (
            pad_left
            + centered
            + pluck * (1.0 - pluck_pan)
            + hat * 0.88
            + sparkle * 0.78
        )
        r_value = master * arrangement * (
            pad_right
            + centered
            + pluck * (1.0 + pluck_pan)
            + hat * 1.12
            + sparkle * 1.22
        )

        append_left(l_value)
        append_right(r_value)
        peak = max(peak, abs(l_value), abs(r_value))

    return left, right, peak


def write_wave(
    output: Path,
    left: array,
    right: array,
    source_peak: float,
    target_peak_db: float = -7.5,
) -> float:
    output.parent.mkdir(parents=True, exist_ok=True)
    # The BGM default is deliberately conservative, preserving room for voiceover.
    target_peak = 10.0 ** (target_peak_db / 20.0)
    gain = target_peak / source_peak if source_peak > 0 else 1.0
    pcm = array("h")
    append_pcm = pcm.append
    for l_value, r_value in zip(left, right):
        append_pcm(round(max(-1.0, min(1.0, l_value * gain)) * 32767.0))
        append_pcm(round(max(-1.0, min(1.0, r_value * gain)) * 32767.0))
    if sys.byteorder != "little":
        pcm.byteswap()

    with wave.open(str(output), "wb") as wav_file:
        wav_file.setnchannels(2)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(pcm.tobytes())
    return target_peak


def synthesize_whoosh() -> tuple[array, array, float]:
    """Create a short left-to-right rising transition whoosh."""
    duration = 0.82
    total_frames = round(SAMPLE_RATE * duration)
    left = array("f")
    right = array("f")
    noise_state = 0x57484F4F
    fast_lowpass = 0.0
    slow_lowpass = 0.0
    peak = 0.0

    for sample_index in range(total_frames):
        t = sample_index / SAMPLE_RATE
        progress = t / duration
        noise_state = (1664525 * noise_state + 1013904223) & 0xFFFFFFFF
        noise = ((noise_state >> 8) / 8_388_607.5) - 1.0

        # Open the synthetic filter during the sweep to create an upward sense of motion.
        fast_alpha = 0.018 + 0.30 * progress * progress
        slow_alpha = 0.004 + 0.035 * progress
        fast_lowpass += fast_alpha * (noise - fast_lowpass)
        slow_lowpass += slow_alpha * (noise - slow_lowpass)
        band_noise = fast_lowpass - slow_lowpass

        envelope = math.sin(math.pi * progress) ** 1.25
        chirp_cycles = 150.0 * t + (940.0 - 150.0) * (t * t) / (2.0 * duration)
        chirp = math.sin(TAU * chirp_cycles)
        value = envelope * (0.82 * band_noise + 0.055 * chirp)
        pan = -0.72 + 1.44 * smoothstep(0.0, 1.0, progress)
        l_value = value * (1.0 - pan * 0.55)
        r_value = value * (1.0 + pan * 0.55)
        left.append(l_value)
        right.append(r_value)
        peak = max(peak, abs(l_value), abs(r_value))

    return left, right, peak


def synthesize_chime() -> tuple[array, array, float]:
    """Create a warm three-note CTA chime with a subtle stereo shimmer."""
    duration = 1.36
    total_frames = round(SAMPLE_RATE * duration)
    left = array("f")
    right = array("f")
    peak = 0.0
    notes = (midi_frequency(72), midi_frequency(76), midi_frequency(79))
    onsets = (0.0, 0.085, 0.17)

    for sample_index in range(total_frames):
        t = sample_index / SAMPLE_RATE
        l_value = 0.0
        r_value = 0.0
        for note_index, (frequency, onset) in enumerate(zip(notes, onsets)):
            age = t - onset
            if age < 0.0:
                continue
            envelope = (1.0 - math.exp(-age / 0.0035)) * math.exp(-age / 0.43)
            partial = (
                math.sin(TAU * frequency * age)
                + 0.32 * math.sin(TAU * frequency * 2.01 * age + 0.25)
                + 0.11 * math.sin(TAU * frequency * 3.98 * age + 0.6)
            )
            pan = (-0.34, 0.18, 0.40)[note_index]
            l_value += 0.18 * envelope * partial * (1.0 - pan)
            r_value += 0.18 * envelope * partial * (1.0 + pan)

            # A quiet 190ms echo lengthens the glow without making the CTA harsh.
            echo_age = age - 0.19
            if echo_age >= 0.0:
                echo = 0.13 * math.exp(-echo_age / 0.34) * math.sin(
                    TAU * frequency * 1.002 * echo_age + 0.4
                )
                l_value += echo * (1.0 + pan * 0.35)
                r_value += echo * (1.0 - pan * 0.35)

        master = 1.0 - smoothstep(1.08, duration, t)
        l_value *= master
        r_value *= master
        left.append(l_value)
        right.append(r_value)
        peak = max(peak, abs(l_value), abs(r_value))

    return left, right, peak


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--whoosh", type=Path)
    parser.add_argument("--chime", type=Path)
    args = parser.parse_args()

    left, right, source_peak = synthesize()
    written_peak = write_wave(args.output, left, right, source_peak)
    frames = len(left)
    print(
        f"Generated {args.output} | {frames} frames | "
        f"{frames / SAMPLE_RATE:.6f}s | {SAMPLE_RATE} Hz stereo PCM16 | "
        f"peak {20.0 * math.log10(written_peak):.1f} dBFS"
    )

    if args.whoosh is not None:
        sfx_left, sfx_right, sfx_peak = synthesize_whoosh()
        written_peak = write_wave(
            args.whoosh, sfx_left, sfx_right, sfx_peak, target_peak_db=-5.0
        )
        print(
            f"Generated {args.whoosh} | {len(sfx_left)} frames | "
            f"{len(sfx_left) / SAMPLE_RATE:.6f}s | {SAMPLE_RATE} Hz stereo PCM16 | "
            f"peak {20.0 * math.log10(written_peak):.1f} dBFS"
        )

    if args.chime is not None:
        sfx_left, sfx_right, sfx_peak = synthesize_chime()
        written_peak = write_wave(
            args.chime, sfx_left, sfx_right, sfx_peak, target_peak_db=-4.5
        )
        print(
            f"Generated {args.chime} | {len(sfx_left)} frames | "
            f"{len(sfx_left) / SAMPLE_RATE:.6f}s | {SAMPLE_RATE} Hz stereo PCM16 | "
            f"peak {20.0 * math.log10(written_peak):.1f} dBFS"
        )


if __name__ == "__main__":
    main()
