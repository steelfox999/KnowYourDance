# Story Machine — Product Requirements Document

**Version 1.0 · Schema v1 · Status: Buildable reference implementation shipped**

This PRD expands the 54-chapter blueprint into concrete requirements matched to the shipped
codebase. It describes what Story Machine is, how it behaves, and the contracts that let a
non-developer operate and re-theme it. Where the reference build makes a phased choice
(notably the transform pipeline), that is called out honestly rather than promised as done.

---

## Chapter 1 — Executive Summary
Story Machine is an offline-first interactive kiosk that matches a visitor with a dance mask
through a short story, a quiz, a personalized reveal, one photo, and a mask-overlay
transformation printed as a keepsake. It is **config-driven**: the engine has no theme
knowledge, so new experiences ship as data, not code. The shipped theme, "Know Your Dance",
features Somana Kunitha, Chau, Bardo Chham, and Gomira.

## Chapter 2 — Product Vision
A single reusable platform that any venue — museum, aquarium, theme park, seasonal popup —
can brand into its own story-driven photo experience within days, running reliably offline on
fixed hardware for years. The moat is the authoring system and the emotional "a character
chose *you*" beat, not any one theme.

## Chapter 3 — Success Metrics
- **Completion rate:** ≥ 80% of started sessions reach the print step.
- **Throughput:** ≤ 90 seconds median from idle-exit to printed sheet.
- **Reliability:** zero network dependency in the core path; ≥ 99% session success offline.
- **Authoring speed:** a new theme authored and validated by a non-developer in < 1 day.
- **Delight proxy:** QR/opt-in redemption rate where online delivery is enabled.

## Chapter 4 — Target Markets
Museums and science centers, zoos/aquariums, theme parks and attractions, brand activations
and trade shows, seasonal/holiday popups, and family entertainment centers. Common needs:
unattended reliability, on-brand theming, physical takeaway, and minimal IT.

## Chapter 5 — User Personas
- **The Visitor** — wants a fun, fast, shareable moment; may be a child; expects no
  instructions.
- **The Operator** — front-of-house staff, non-technical; needs to launch, refill paper, and
  swap artwork.
- **The Author/Marketer** — builds and tweaks the experience via the admin panel without code.
- **The Integrator** — installs, packages, and deploys to kiosk hardware.

## Chapter 6 — Visitor Journey
`idle → story → quiz → reveal → camera → transform → results → print → qr → reset`. Each step
is a self-contained screen. An inactivity timer always returns to idle, and every session
resets its state so no visitor sees another's photo.

## Chapter 7 — Storytelling Philosophy
Short, sensory, second-person. The visitor is the protagonist. The reveal is the emotional
payoff and must feel *earned* by their answers — never generic. Copy is authored per theme;
the engine only guarantees the mechanic.

## Chapter 8 — Story Engine
Renders ordered narrative **beats** from `story.json`. Beats advance on tap (or optional
timing). Purely presentational; no branching in v1 (linear beats keep authoring simple and
throughput predictable).

## Chapter 9 — Question Engine
Renders questions from `quiz.json`. Each option carries **traits** (`{trait: number}`) that
accumulate into a visitor trait profile. Icons and labels are authored. Number and content of
questions are fully data-driven.

## Chapter 10 — Character Selection
`selection.js` computes each character's score as the dot product of visitor traits and the
character's `weights`; the highest wins. Deterministic, explainable, and unit-tested. Ties
break by author order. Works with any number of characters.

## Chapter 11 — Reveal System
The signature beat. The reveal template is filled with the visitor's **strongest trait that
the chosen character values**, mapped through that character's `reasons` (with a
`defaultReason` fallback), so the "why I chose you" is specific and never empty. Enforced by
schema (`reveal.template` required) and by the loader.

## Chapter 12 — Animation Engine
CSS-driven transitions (enter/pulse/spin/pop) defined in `main.css`, honoring
`prefers-reduced-motion`. No animation library; keeps the buildless renderer light and
predictable on kiosk GPUs.

## Chapter 13 — Music Engine
`music.js` plays a per-step ambient loop declared in `theme.json > music.steps`, cross-fading
on step change. Audio is optional: missing files are silently skipped, and playback begins on
first interaction (browser autoplay rules).

## Chapter 14 — Narration Engine
Optional spoken narration is supported as a per-step audio track through the same music
mechanism; v1 ships silent by default. Text-to-speech is a roadmap item (Chapter 46) and is
intentionally not in the offline critical path yet.

## Chapter 15 — Experience Packages
A "theme" is a complete experience package: `experience.json` + story/quiz/characters/prompts/
print/theme configs + an `assets/` folder. Packages are self-contained and portable; multiple
can live side by side and are listed in `themes/themes.json`.

## Chapter 16 — Asset Pipeline
The shipped artwork lives in `themes/know-your-dance/assets/` as authored SVGs: masks, idle
backgrounds, and the print frame. Authors replace files in `assets/` with their own PNG/SVG
of the same name — no code changes.

## Chapter 17 — Camera Pipeline
`camera.js` captures one frame via `getUserMedia` with a countdown and retake, and falls back
to a file picker when no camera is available (or in restricted browsers). The captured image
is held in session as a data URL for the transform step.

## Chapter 18 — Offline AI Pipeline *(phased — see ARCHITECTURE §5)*
Transformation is behind a swappable `TransformProvider`. **v1 ships an on-device
`CompositingProvider`** (MediaPipe face-landmark anchored SVG/PNG overlays; deterministic,
runs offline with vendored runtime/model files). A future **`GenerativeProvider`** (local diffusion/segmentation via ONNX/SD)
drops into the same interface using the `prompt` fields already present in `prompts.json`,
with **no** changes to flow, print, or admin. This is the product's main technical-risk track
and is treated as R&D with its own quality/performance gates, not a launch blocker.

## Chapter 19 — Mask System
Per-character face overlay defined in `prompts.json` (`mask.asset` + `anchor`/`scale`/
`offsetX`/`offsetY`/`rotation`/`opacity`). Anchored to detected facial landmarks, with
FaceDetector and proportional fallbacks.

## Chapter 20 — Optional Costume System
Optional per-character torso overlays remain supported for future themes, but Know Your Dance
is mask-only and prints the original photo plus the selected dance-mask portrait.

## Chapter 21 — Background System
v1 composites onto the original photo background. A background-replacement stage (segmentation
matte + themed backdrop) is a defined extension point in the provider interface and a roadmap
item; the print/results grid is driven by configured output keys.

## Chapter 22 — Print Engine
`print.js` composes an **A5 sheet** at 300 DPI from `print.json` (grid, margins,
gutter, labels, `frame` overlay), sends it to the system print dialog, and saves a PNG copy to
`Pictures/StoryMachine/`. Page size (A5/A6/4×6), orientation, and branding frame are authored.

## Chapter 23 — QR Workflow
Optional online bonus. `qr.js` (vendored, offline encoder) shows a QR to a
`deliveryBaseUrl`-derived link when `navigator.onLine` and a URL are configured; otherwise it
degrades gracefully to a "collect your printed sheet" message and auto-resets. Never blocks
the experience.

## Chapter 24 — Admin Dashboard
`src/admin/` provides a non-developer GUI: Story, Quiz, Characters/Reveal, Prompt, Print, and
Music builders, plus a raw-JSON editor, a **Validate** action, and **Launch**. Reached with
`Ctrl/Cmd+Shift+A`. Saves write to disk in the desktop app and download files in browser mode.

## Chapter 25 — Experience Builder
The Overview tab edits `experience.json`: the step **flow**, idle timeout, and QR settings.
Reordering or removing steps changes the visitor journey with no code.

## Chapter 26 — Story Builder
Add, edit, reorder, and delete narrative beats with live binding to `story.json`.

## Chapter 27 — Prompt Generator
The Prompt Builder edits each character's mask asset, landmark anchor, scale, offset,
rotation, and opacity, plus a text `prompt` field reserved for the generative provider. This
is the authoring surface that will feed generative transforms later.

## Chapter 28 — Theme System
`theme.json > tokens` (colors, fonts) are applied as CSS variables at boot, so one file
restyles the entire UI. Idle attract-loop content and music mappings also live here.

## Chapter 29 — JSON Schemas
`schemas/*.schema.json` (draft-07, versioned with `schemaVersion: 1`) formally define every
config file and can be enforced in CI. The runtime loader performs equivalent validation and
reports human-readable errors.

## Chapter 30 — Folder Structure
See ARCHITECTURE §2. Clear separation of shell (`electron/`), engine/screens (`src/`), content
(`themes/`), contracts (`schemas/`), and tooling (`scripts/`).

## Chapter 31 — Architecture
A theme-agnostic state machine renderer over a thin platform shim, served over loopback in both
desktop and browser modes. Full detail in ARCHITECTURE.md.

## Chapter 32 — Technology Stack
Electron (kiosk shell, printing, packaging) + buildless ES-module renderer + Canvas 2D
(transform/print) + a vendored QR encoder. No bundler, no framework, no CDN. Rationale in
ARCHITECTURE §1.

## Chapter 33 — Windows Packaging
`npm run pack:win` builds an NSIS installer via electron-builder into `dist/`. Camera and print
use OS defaults; kiosk runs full-screen with `Esc` to exit.

## Chapter 34 — macOS Packaging
`npm run pack:mac` builds a `.dmg`. Camera permission is requested on first run. Builds are
produced on the matching OS.

## Chapter 35 — Installer
Installers are double-click, non-developer friendly, and self-contained (Electron runtime
bundled). No separate Node install needed on target kiosks once packaged.

## Chapter 36 — Configuration
All behavior is JSON. `experience.json` selects which part-files load; each part validates
against its schema. `SM_KIOSK=0` runs windowed for setup. `?theme=<id>` selects a theme in
browser mode.

## Chapter 37 — Branding
Colors/fonts via theme tokens; print frame via a full-sheet transparent overlay; idle screen
imagery and copy via `theme.json`. A venue rebrands without touching code.

## Chapter 38 — Analytics
The engine exposes an `onStep` hook suitable for local, privacy-respecting counters (sessions,
completions, per-character distribution). v1 ships no network analytics to preserve
offline-first and visitor privacy; local logging is the intended default.

## Chapter 39 — Security & Privacy
No inbound network services beyond the loopback UI server. Photos stay on-device; the only
egress is the optional, opt-in QR delivery. Admin disk writes are path-sandboxed to the theme
folder. No visitor PII is collected in the core path.

## Chapter 40 — Performance
Buildless load, Canvas 2D compositing sized to a 900px working image, and CSS animation keep
the experience responsive on modest kiosk hardware. Target: transform completes in a couple of
seconds with the compositing provider.

## Chapter 41 — Accessibility
Large tap targets, high-contrast themeable tokens, visible focus states, and
`prefers-reduced-motion` support. Copy is authored, so reading level is in the operator's
control. Audio is optional and never required to progress.

## Chapter 42 — Testing
Pure selection logic is unit-tested (trait profiles → correct character and non-empty reveal,
including the zero-answer edge case). Config validation runs via `npm run check`. All modules
are syntax-checked and all assets are validated as well-formed. UI/canvas paths are verified by
running `npm run web`. See Chapter 53.

## Chapter 43 — Logging
Fatal config/boot errors surface on-screen with the offending file/field; console logging
covers step transitions and provider fallbacks. A structured local session log is the intended
extension of the `onStep` hook.

## Chapter 44 — Troubleshooting
Common issues and fixes (camera permissions, print scaling, config errors, offline QR) are
documented in README. Config problems name the file and field.

## Chapter 45 — README Specification
README.md targets a non-developer operator on both Windows and macOS: install Node, install,
run (desktop and browser), admin usage, artwork replacement, printing, offline behavior, a
troubleshooting table, and a command reference.

## Chapter 46 — Future Roadmap
Generative on-device transform provider; background replacement via segmentation; TTS
narration; branching stories; multi-language packs; remote fleet management and content push;
richer analytics.

## Chapter 47 — Marketplace
Because themes are portable, self-validating packages, a theme marketplace/exchange is a
natural future channel — venues buy or share experience packs that drop into `themes/`.

## Chapter 48 — Licensing
Commercial license (see LICENSE.txt). Themes and artwork are licensable independently of the
engine, enabling the marketplace model.

## Chapter 49 — Appendix A: Trait & Character Reference
See `themes/know-your-dance/quiz.json` and `characters.json` for the worked example: traits
such as guardian, martial, wisdom, harmony, fierce, devotion, and community mapped to four
dance masks.

## Chapter 50 — Appendix B: Config File Reference
See `schemas/` for the authoritative, versioned definitions of every config file.

## Chapter 51 — Appendix C: Keyboard & Operator Shortcuts
`Esc` exit kiosk · `Ctrl/Cmd+Shift+A` admin · `SM_KIOSK=0` windowed · `?theme=<id>` theme
select (web).

## Chapter 52 — Development Phases
1. **Engine + Know Your Dance theme + landmark compositing transform (this build).**
2. Hardening: fleet packaging, local analytics/logging, accessibility audit.
3. Generative transform provider (R&D-gated).
4. Marketplace + remote content management.

## Chapter 53 — Release Checklist
- [ ] `npm run check` passes for every theme.
- [ ] All assets present and well-formed.
- [ ] Camera capture and file-fallback verified on target hardware.
- [ ] Print output measured at 100% on A5 with the venue frame.
- [ ] Offline run verified with network disabled.
- [ ] Packaged installer launches on a clean Windows and macOS machine.

## Chapter 54 — Conclusion
Story Machine ships today as a reliable, offline, re-themeable experience with a first-class
authoring system and a clean seam for on-device generative AI. The reference build proves the
architecture end to end with the Caveman theme while keeping the highest-risk capability
isolated behind a swappable interface.
