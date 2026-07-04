# Architecture

Story Machine is a **theme-agnostic experience engine** plus a **content pack** (a "theme").
The engine knows how to run a fixed sequence of screens and how to select a character from
quiz answers; it knows *nothing* about any specific dance form or subject. Everything a visitor
sees — words, artwork, characters, print layout, colors, music — comes from JSON and assets
in a theme folder. Shipping a new experience means authoring a new theme, not editing code.

---

## 1. Technology choices and why

### Electron + a no-build renderer

The kiosk shell is **Electron**, and the renderer is **plain ES modules with no build step**.

- **Why Electron over a web-only or Tauri build:** the product needs reliable webcam capture,
  silent/again-and-again kiosk operation, local file writes (saving prints), access to the
  system print dialog, and a one-file installer a non-developer can double-click. Electron's
  `getUserMedia`, `webContents.print()`, `electron-builder` packaging, and mature kiosk
  fullscreen support cover all of this on both Windows and macOS today. Tauri is lighter but
  its webview/camera/printing story is less uniform across OSes, which is the wrong risk for a
  ten-year commercial fixture.
- **Why no bundler:** the renderer is intentionally buildless. The browser loads `app.js` as a
  module and imports the rest. This means the code you read is the code that runs — no
  transpile, no sourcemaps, no toolchain rot over a decade. It also lets the identical code run
  in a normal browser (`npm run web`) for testing and demos.

### One server for both modes (no `file://`)

Electron does **not** load the UI from `file://`. Instead the main process starts a tiny
internal HTTP server bound to `127.0.0.1` and loads the app from there. `npm run web` runs the
*same* server on a fixed port. This has one important technical payoff: every theme asset is
**same-origin**, so drawing SVG/PNG artwork onto a `<canvas>` never "taints" it. A tainted
canvas makes `toDataURL()` throw — which would break transform output generation and the
print sheet. Serving over loopback eliminates that failure class and makes desktop and browser
behavior byte-identical.

### The platform shim

`src/core/platform.js` is the only place that knows which environment it's in. It exposes
`readJson`, `assetUrl`, `listThemes`, `writeJson`, `savePng`, `printHtml`, `isOnline`. Reads
and assets go over HTTP in both modes; only disk writes and printing differ (native IPC in
Electron, download/`window.print()` fallback in the browser). The engine and screens call the
shim and never branch on environment themselves.

---

## 2. Folder structure

```
electron/            Desktop shell — thin. No business logic.
  main.js            Starts loopback server, opens kiosk window, IPC for disk/print.
  preload.js         contextBridge exposing window.platform (disk + print only).
  server.js          Shared static server (used by Electron AND npm run web).

src/
  index.html         Mounts #stage, loads app.js as a module.
  app.js             Boot: load theme, apply tokens as CSS vars, start Engine + Music.
  core/
    platform.js      Environment abstraction (see above).
    configLoader.js  Loads + validates a theme; throws ConfigError with a clear message.
    engine.js        Theme-agnostic state machine. Owns session state and step flow.
    music.js         Per-step ambient loop with crossfade; silent if files absent.
    ui.js            Tiny DOM helpers (no framework).
  modules/           One file per screen; each exports a render function.
    idle · story · quiz · reveal · camera · transform · results · print · qr
    selection.js         PURE logic: score traits → pick character → build "why you" text.
    transform-provider.js  Swappable transform backends (see §5).
  admin/             Admin dashboard (builders + raw JSON + validate + launch).
  styles/main.css    All screen styles, driven by CSS variables from theme tokens.

themes/<id>/         A complete experience as data.
  experience.json    Flow, timings, which part-files to load, QR settings.
  story.json quiz.json characters.json prompts.json print.json theme.json
  assets/            masks · idle · frame · music

schemas/             Versioned JSON Schema (draft-07) for every config file.
scripts/             generate-assets.js · validate-config.js · serve.js
vendor/              Offline QR encoder and face-landmark runtime/model (no CDN dependency).
```

---

## 3. The visitor flow (state machine)

`engine.js` advances through the steps listed in `experience.json > flow`:

```
idle → story → quiz → reveal → camera → transform → results → print → qr → (reset)
```

The engine holds a **session** object: `{ answers, traitScores, character, revealText, photo,
outputs }`. Each screen reads what it needs and calls `engine.next()`. An inactivity timer
returns the kiosk to `idle` after `idleTimeoutSeconds`, and `reset()` wipes the session so no
visitor ever sees the previous person's photo. The engine emits an `onStep` hook that drives
music and would drive analytics.

### The reveal is mandatory and derived

The product's signature beat — *"I chose YOU because…"* — is not decorative text. In
`selection.js`:

1. Each quiz option contributes weighted **traits** to a running score.
2. Each character has trait **weights**; the winner is the highest dot-product of visitor
   traits · character weights.
3. The reveal template is filled using the visitor's **strongest trait that the character
   actually cares about**, looked up in that character's `reasons` map (with a
   `defaultReason` fallback). This guarantees the "why" is specific to how *this* person
   answered, and guarantees it is never empty — even with zero answers.

This logic is pure and unit-tested (no DOM, no canvas), because it is the heart of the
product.

---

## 4. Config contract

Every config file carries `"schemaVersion": 1`. The loader (`configLoader.js`) validates
structure and asset existence before the experience starts and surfaces a human-readable
error naming the file and field. The formal contract lives in `schemas/*.schema.json` and can
be enforced in CI with any JSON-Schema validator. Highlights:

- **experience** — `flow`, `idleTimeoutSeconds`, `parts` (filenames of the other configs),
  optional `qr.deliveryBaseUrl`.
- **quiz** — questions → options → `traits` (`{trait: number}`).
- **characters** — `weights` per character and a **required `reveal.template`** plus
  per-trait `reasons`.
- **prompts** — per-character `mask` layers, each an asset plus
  `anchor`/`scale`/`offsetX`/`offsetY`/`rotation`/`opacity`; optional `costume` layers remain
  supported for future themes. The `prompt` field is reserved for future generative providers.
- **print** — page size/orientation/DPI, grid, margins, labels, and the `frame` overlay.
- **theme** — design `tokens` (mapped to CSS variables at boot), `music.steps`, and the idle
  attract-loop content.

Because tokens become CSS variables, a new theme restyles the entire UI without a line of CSS.

---

## 5. The transformation pipeline — and its honest risk

**This is the highest-risk part of the product, and it is deliberately abstracted so it can
evolve without touching the flow.**

`transform-provider.js` defines a `TransformProvider` interface: given the visitor photo and a
character's prompt set, return configured outputs such as **Original** and **Dance Mask**.

- **v1 ships a `CompositingProvider`** that runs fully **on-device**: it uses vendored
  MediaPipe Face Landmarker files to identify eyes, chin, face oval, and head angle, then
  derives `face`, `head`, and `torso` anchors for overlay layers. If landmark
  detection cannot initialize it falls back to the browser's `FaceDetector`, then to
  proportional anchoring. The mask artwork still comes from `prompts.json`,
  using `anchor` plus `scale`/`offsetX`/`offsetY`/`rotation`/`opacity`. It is deterministic
  and works offline on kiosk hardware after installation. Its limitation is honest: it
  overlays artwork, it does not *reimagine* the person.

- **A `GenerativeProvider` is the planned upgrade** — a locally-run diffusion/segmentation
  model (e.g. an ONNX or Stable-Diffusion pipeline bundled with the kiosk) that produces
  painterly transformations. The `prompt` fields already sit in `prompts.json` for exactly
  this. Because everything goes through the same interface and returns data URLs by key,
  swapping providers is a one-line change in the transform step and requires **no** changes to
  the engine, screens, print, or admin.

This phased approach lets the product ship and earn revenue on reliable compositing now, while
leaving a clean seam for on-device generative AI as the models get small and fast enough to
run offline on kiosk hardware. Treat the generative provider as an R&D track with its own
performance and quality gates, not a launch blocker.

---

## 6. Offline-first

The entire core path — idle, story, quiz, reveal, camera, transform, results, print — makes
**no network calls**. There is no CDN, no web font fetch (the QR library and face-landmark
runtime/model are vendored, fonts are system stacks), and no analytics beacon in the critical path. The only online feature is
the optional QR/digital-delivery screen, which checks `navigator.onLine` and the presence of
a `deliveryBaseUrl`; if either is missing it degrades to a "take your printed sheet" message
and resets. Loss of connectivity can never strand a visitor mid-experience.

---

## 7. Authoring a new theme

1. Copy `themes/know-your-dance/` to `themes/<your-id>/` and add `<your-id>` to `themes/themes.json`.
2. In the **admin panel**, select your theme and rewrite the story, quiz, characters (with
   their reveals), and prompts. Set trait tags on quiz options and weights on characters.
3. Drop your artwork into `assets/` (masks, idle images, frame), keeping filenames
   or updating the paths in the Prompt/Print builders.
4. Set the design `tokens` in `theme.json` to restyle the whole UI.
5. Run `npm run check` (or the admin **Validate** button) until it passes, then `npm start`.

No engine code changes are required to ship a completely different experience — which is the
core architectural goal.
