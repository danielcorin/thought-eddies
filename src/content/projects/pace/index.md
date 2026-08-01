---
title: 'Pace (2026)'
description: 'A private, local-first clipboard manager for macOS'
createdAt: 2026-07-17
draft: false
githubUrl: https://github.com/danielcorin/Pace
---

[Pace](https://github.com/danielcorin/Pace) is an open source, local-first clipboard manager for macOS.
It lives in the menu bar and opens a compact, searchable clipboard history with a global hotkey.
Selecting an item pastes it directly into the app I was using.

Pace captures text, rich text, URLs, files, and images while preserving their native pasteboard representations.
Copied images are processed locally with OCR so their text is searchable and pasteable.
History items and the search catalog are encrypted at rest, and recognizable credentials and pasteboard content marked as sensitive are never stored.

A companion `pace` CLI exposes the same history to scripts and coding agents.
It can search, add, copy, and paste items without relying on UI automation.

I built Pace because I wanted a fast, minimal clipboard history that keeps everything on my Mac: no cloud sync, account, or subscription.
Signed and notarized builds are available from the [GitHub Releases page](https://github.com/danielcorin/Pace/releases).

Tech: [Swift](https://www.swift.org/), [SwiftUI](https://developer.apple.com/xcode/swiftui/), [AppKit](https://developer.apple.com/documentation/appkit), [Vision](https://developer.apple.com/documentation/vision), [CryptoKit](https://developer.apple.com/documentation/cryptokit)
