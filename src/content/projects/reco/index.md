---
title: 'Reco (2026)'
description: 'Local voice-to-text for microphone and system audio'
createdAt: 2026-07-10
draft: false
githubUrl: https://github.com/danielcorin/Reco
---

[Reco](https://github.com/danielcorin/Reco) is an open source macOS menu bar transcription app.
I can hold a global hotkey to record, then release it to transcribe the audio and paste the result into the active app.
Double-tapping the hotkey latches recording on until I press it again.

Reco records both the default microphone and all audio channels on the machine, mixes them, and transcribes the result.
This means it can capture more than only what I say into the microphone: it can also transcribe the audio playing through the computer.

Transcription runs locally using the open weights [NVIDIA Parakeet TDT 0.6B v3 model](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3) through [FluidAudio](https://github.com/FluidInference/FluidAudio) and Core ML.
After the initial model download, recorded audio is processed on-device and temporary recordings are deleted after transcription.

I built Reco because I wanted a minimal, hotkey-based transcription tool that I could understand and control.
Reco is part of a broader effort to take more control over the day-to-day tools I rely on: if it breaks or I want it to work differently, I can change it myself.

Tech: [Swift](https://www.swift.org/), [SwiftUI](https://developer.apple.com/xcode/swiftui/), [ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit), [FluidAudio](https://github.com/FluidInference/FluidAudio), [Core ML](https://developer.apple.com/machine-learning/core-ml/)
