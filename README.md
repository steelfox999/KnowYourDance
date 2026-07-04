# Story Machine

An **offline-first, config-driven interactive storytelling kiosk**. A visitor is pulled
into a short story, answers a playful quiz, is told **which mask chose them and why**,
takes one photo, and gets that photo transformed into a **dance-mask keepsake** — printed
as an A5 sheet with your venue's frame.

The whole core experience runs with **no internet**. The first shipped theme is
**"Know Your Dance"**, featuring Somana Kunitha, Chau, Bardo Chham, and Gomira mask
overlays authored entirely as configuration and replaceable artwork.

---

## Two ways to run

You can run Story Machine as a **desktop kiosk app (Electron)** or, for a quick look, in a
**normal web browser**. Both use the exact same code and behave identically; the browser
mode just falls back to a file picker if it can't reach a webcam.

### The fastest way to see it (browser)

You only need [Node.js](https://nodejs.org) (version 18 or newer). To check, open a terminal
and run `node --version`.

```bash
# 1. from inside the story-machine folder:
npm install
# 2. start it:
npm run web
```

Then open **http://localhost:4173** in Chrome or Edge. Allow the camera when asked (or use
the "Choose photo" button). That's the complete experience.

### The real kiosk (desktop app)

```bash
npm install
npm start
```

This opens a full-screen kiosk window.

- **Exit full screen:** press `Esc`.
- **Open the admin panel:** press `Ctrl` + `Shift` + `A` (use `Cmd` on a Mac).
- **Run windowed instead of full-screen** (handy while setting up):
  - macOS / Linux: `SM_KIOSK=0 npm start`
  - Windows (PowerShell): `$env:SM_KIOSK=0; npm start`

---

## Detailed setup

### Windows

1. **Install Node.js.** Download the "LTS" installer from <https://nodejs.org> and run it,
   accepting the defaults. This also installs `npm`.
2. **Open a terminal in the project folder.** In File Explorer, open the `story-machine`
   folder, click the address bar, type `cmd`, and press Enter.
3. **Install dependencies** (one time, needs internet just this once):
   ```
   npm install
   ```
4. **Run the kiosk:**
   ```
   npm start
   ```
5. **To build a double-click installer** (`.exe`) you can copy to other kiosks:
   ```
   npm run pack:win
   ```
   The installer appears in the `dist\` folder.

### macOS

1. **Install Node.js** from <https://nodejs.org> (the LTS installer), or with Homebrew:
   `brew install node`.
2. **Open Terminal** (Applications → Utilities → Terminal) and change into the project
   folder, e.g. `cd ~/Downloads/story-machine`.
3. **Install dependencies** (one time):
   ```
   npm install
   ```
4. **Run the kiosk:**
   ```
   npm start
   ```
   The first time, macOS will ask for **Camera** permission — click **Allow**.
5. **To build a `.dmg`** for other Macs:
   ```
   npm run pack:mac
   ```
   The `.dmg` appears in the `dist/` folder.

> **Note on packaging:** `npm run pack:win` / `pack:mac` builds an installer for the machine
> you run it on. Building a Windows installer is done on Windows; a Mac build on a Mac.

---

## Using the admin panel (no coding)

Press `Ctrl/Cmd + Shift + A` in the app, or open **http://localhost:4173/admin/admin.html**
in web mode. From here a non-developer can:

- **Story Builder** — write and reorder the narrative beats.
- **Quiz Builder** — edit questions and answer options, and tag each option with *traits*
  (e.g. `brave:2, bold:1`). Traits decide which character a visitor gets.
- **Characters & Reveal** — set each character's trait *weights* and, importantly, the
  **reveal text that explains why the character chose the visitor**. You write one reason per
  trait; the app automatically picks the reason that matches the visitor's answers.
- **Prompt Builder** — choose the mask artwork for each dance form and fine-tune how it sits
  on the visitor's face (landmark anchor, scale, vertical offset, rotation, opacity).
- **Print Layout** — page size (A5/A6/4×6), grid, margins, labels, and your frame.
- **Music** — point each step at an audio file (optional).
- **Raw JSON** — direct edit of any file, with validation before saving.

In the **desktop app**, "Save" writes changes straight to disk. In the **browser**, "Save"
downloads the updated file for you to drop back into the theme folder (browsers can't write
to disk for safety).

**Always click "Validate"** (top-right) after editing. It checks that every character has a
reveal, every character has artwork, the print page is set, and so on.

You can also validate from a terminal before deploying:

```bash
npm run check          # validates themes/know-your-dance
```

---

## Replacing the artwork (masks, frame, idle)

All artwork lives in `themes/know-your-dance/assets/`. Replace any file with your own
**PNG or SVG** of the same name and it just works — no code changes. The shipped mask art is
checked in deliberately rather than generated, so `npm run assets` is a no-op.

```bash
npm run assets         # confirms artwork is checked in
```

- **Masks** align to detected facial landmarks (`assets/masks/…`). Use transparent PNGs or SVGs.
- **Frame** is a full-sheet transparent overlay for print branding (`assets/frame.svg`).
- **Idle images** are the attract-loop backgrounds (`assets/idle/…`).
- **Music** (optional) goes in `assets/music/` and is wired up in the Music admin tab.

---

## Printing

The Print step composes an **A5 sheet with the original photo and masked photo**, with your
frame on top, then sends it to the system print dialog. Set your printer's paper to **A5** and "actual
size / 100%" (no scaling). Every printed sheet is also saved as a PNG to
**Pictures/StoryMachine/** so you have a copy.

---

## How offline-first works here

Story, quiz, reveal, camera, the mask transform, and printing are **100% local** — no
network calls anywhere in that path. The only online feature is the optional **QR / digital
download** at the end. If there's no connection (or no delivery URL configured), that screen
simply shows a friendly "collect your printed sheet" message and resets. It never blocks the
experience.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| **"Configuration problem" screen on launch** | A theme file has an error. Open admin (`Ctrl/Cmd+Shift+A`) → the message names the file/field. Or run `npm run check`. |
| **Camera is black / "No camera available"** | Grant camera permission (macOS: System Settings → Privacy → Camera; Windows: Settings → Privacy → Camera). In a browser, use the "Choose photo" fallback. |
| **`npm install` fails** | You need internet for this one step. Check your connection/proxy, then retry. Corporate networks may block npm — see the domains list your IT can allow. |
| **`npm start` says "electron not found"** | Run `npm install` first. |
| **Masks look off-center** | Adjust `anchor`, `scale`, `offsetY`, or `rotation` in the Prompt Builder. Negative `offsetY` moves the overlay up. |
| **Print comes out shrunk** | In the print dialog set scale to 100% / "actual size" and paper to A5. |
| **Music doesn't play** | Browsers block audio until the first tap — it starts once the visitor interacts. Missing files are silently skipped. |
| **Kiosk won't leave full screen** | Press `Esc`, or start windowed with `SM_KIOSK=0`. |
| **QR code screen says "unavailable"** | Expected when offline or when no `deliveryBaseUrl` is set in the experience config. |

---

## What's in the box

```
story-machine/
├── README.md              ← you are here
├── ARCHITECTURE.md        ← stack, schemas, technical-risk notes
├── PRD.md                 ← full product requirements
├── package.json           ← scripts: start, web, check, assets, pack:win, pack:mac
├── electron/              ← desktop shell + internal server (no business logic)
├── src/                   ← the engine, screen modules, admin, styles
├── themes/know-your-dance/ ← the Know Your Dance experience, as config + assets
├── schemas/               ← versioned JSON Schemas for every config file
├── scripts/               ← asset generator, config validator, web server
└── vendor/                ← bundled offline QR encoder and face-landmark runtime
```

---

## Command reference

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (needs internet, one time). |
| `npm run web` | Run in a browser at http://localhost:4173. |
| `npm start` | Run the desktop kiosk app. |
| `npm run check` | Validate the Know Your Dance theme config. |
| `npm run assets` | Confirm authored artwork is checked in. |
| `npm run pack:win` | Build a Windows installer into `dist/`. |
| `npm run pack:mac` | Build a macOS `.dmg` into `dist/`. |

For the design rationale and how to author a brand-new theme, see **ARCHITECTURE.md**.
