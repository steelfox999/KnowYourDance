# 2026-07-08 Printing Deep Clean

## Status

Completed

This log tracks the multi-agent deep-clean around the KnowYourDance / Story Machine Electron kiosk printing failure. The user reported that the Windows Electron app reaches the print step, does not print, and then remains on a loading state forever.

The working copy was cloned from `https://github.com/TvaritaCollective/KnowYourDance` into `/Users/thirun/Documents/Codex/2026-07-08/https-github-com-tvaritacollective-knowyourdance-clone`. The active host for this logging pass reports `Thirus-Mac-mini.local`, so the AI Context Journal device tag should be `device/thirus-mac-mini-local` unless the project owner normalizes this machine back to the known Mac Mini tag.

## Current Understanding

The printing path currently flows from the React print screen into the Electron bridge and then into the Electron main process. `src/modules/PrintScreen.jsx` composes and saves the print PNG, then awaits `printHtml`. `src/core/platform.js` routes that call through `window.platform.printSheet`. `electron/preload.js` exposes the IPC bridge. `electron/main.js` creates or reuses a hidden print window, loads the print HTML, and calls `webContents.print()`.

The leading suspect is the recent commit `855f3fa Enable silent Electron printing`. That change moved printing away from the visible print dialog (`silent: false`) into silent printing with a custom page size and no timeout. In the reported Windows failure mode, that means the renderer can wait indefinitely if the main-process print promise never settles, if the hidden print window never finishes loading, if Electron's print callback is not reached, or if Windows printer configuration rejects the silent job in a way the app does not surface.

The current behavior is user-visible because the print screen appears to treat the platform print call as a blocking operation. When the Electron side never resolves or rejects promptly, the UI remains in its loading state instead of returning control to the kiosk flow with a retryable error.

## Work Completed In This Pass

The main agent added a TDD track around Electron printing behavior. `tests/electron-print.test.js` now covers the native print helper contract: unresolved Electron print callbacks time out, failed silent printing can open a visible print dialog fallback, disabled fallback stays disabled, and custom page sizes are normalized before reaching Electron. `tests/renderer-print-flow.test.mjs` covers the renderer timeout helper and the one-shot auto-print gate.

The Electron main process now routes print work through `electron/print.js`. After pulling upstream commit `2aa14bd`, the print HTML is loaded from a temporary file instead of a huge `data:` URL, then the hidden print window load, asset readiness wait, and `webContents.print()` call are bounded by `SM_PRINT_TIMEOUT_MS` (default 30 seconds). Silent printing remains the default kiosk behavior, but if it fails or stalls, the app reveals the print window and retries with the system print dialog unless `SM_PRINT_DIALOG_FALLBACK=0` is set. `SM_PRINT_SILENT=0` is available for setup and debugging, and `SM_PRINTER` can still target a specific printer in silent mode.

The React print screen now has renderer-side timeouts around sheet composition, PNG saving, and the platform print call. A new `hasAttemptedPrint` state prevents the failure path from re-arming auto-print before QR navigation. If sheet composition fails or times out, the screen now advances to the digital-copy/QR step instead of staying on the print screen indefinitely. A final review caught that the renderer print timeout had to exceed the main-process silent-print-plus-dialog-fallback budget; `src/modules/print-timeouts.mjs` now gives the renderer a 125-second budget over the 30-second Electron stage timeout.

Dependency audit findings were addressed by upgrading Electron to `^43.1.0` and electron-builder to `^26.15.3`. This means the practical setup floor is now Node.js 22.12 or newer, and README setup instructions were updated accordingly. The stale print JSON schema was also aligned with the current KnowYourDance print config (`maskVar1`, `maskVar2`, optional frame/logos/footer styling).

Verification completed in this pass:

- `npm test` passed 8/8 tests.
- `npm run check` reported the theme config valid with 0 errors and 0 warnings.
- `npm audit` reported 0 vulnerabilities.
- `npm run assets` confirmed checked-in assets and made no generated changes.
- `cmp -s src/core/platform.js public/core/platform.js` exited 0.
- `npm run build` passed.
- `git diff --check` passed.
- `npm run pack:win` passed after allowing electron-builder network access. On this Apple Silicon Mac it produced a Windows ARM64 package, so the result validates the packaging path but should not be treated as a Windows x64 smoke test.
- After pulling `origin/main`, `npm run pack:mac` initially stalled in `codesign`; rerunning with `CSC_IDENTITY_AUTO_DISCOVERY=false` passed and produced unsigned x64 and arm64 DMG/ZIP artifacts in `dist/`.

## Journal Context Draft

Project file target: `~/Library/Mobile Documents/com~apple~CloudDocs/obsidiandb/11-ai-context/know-your-dance.md`.

Suggested front matter for a new project journal file:

```yaml
---
title: "AI Context - Know Your Dance"
date: 2026-07-08
tags:
  - log
  - topic/tech
  - device/thirus-mac-mini-local
status: active
---
```

The project is an Electron kiosk-style Story Machine / KnowYourDance app. The frontend is a Vite/React application with Electron shell code under `electron/`, core platform abstractions under `src/core/`, app modules under `src/modules/`, and tests under `tests/`. The current deep-clean focus was Windows printing reliability: the React print screen creates print artwork and calls the platform print bridge, while Electron main owns hidden-window loading and `webContents.print()`.

The key lesson from this pass is that kiosk printing must never leave renderer state waiting on an unbounded platform promise. Silent printing is operationally useful for a kiosk, but it needs explicit timeout, error propagation, a visible setup fallback, and enough diagnostics to distinguish printer configuration failures from hidden-window rendering failures.

## Next Steps

Before deployment, run a real Windows x64 smoke test with the physical kiosk printer:

- `$env:SM_KIOSK=0; $env:SM_PRINT_SILENT=0; npm start`
- `$env:SM_KIOSK=0; $env:SM_PRINT_TIMEOUT_MS=5000; npm start`

Confirm the dialog path prints, then confirm silent/default-printer mode prints. Mirror this log into the AI Context Journal if write access to the iCloud vault is available.
