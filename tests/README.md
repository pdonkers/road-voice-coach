# Tests

These are the working scripts used to check the app after each change. They are run by hand; nothing runs automatically yet (see "Automated tests in the repository" in `BACKLOG.md`). They test in a headless browser with a simulated microphone, which is not the same as a phone in a car.

## Setup

1. Serve the repo: `python3 -m http.server 8765` from the repo root.
2. Decode the simulated microphone recordings: `tests/prepare.sh` (needs ffmpeg; writes `tests/audio/*.wav` and creates `tests/out/`, both ignored by git).
3. The scripts need Playwright with Chromium. They look for it at `/opt/npm-tools/node_modules/playwright`; set `PLAYWRIGHT=playwright` (or another path) to use a different install.

The app reads `window.__speed` to run its waits faster, and the scripts replace the phone's speech with a stub that logs each sentence.

## Scripts

| Script | What it checks | Run |
| --- | --- | --- |
| `blocks.js` | Every block of a session runs to the end with no page errors; prints the time per block and the cues used | `node tests/blocks.js` (about 4 minutes) |
| `smoke.js` | A session with replay, skip and pause pressed; optional seeded history and throttled timers | `node tests/smoke.js 6 45` (speed, seconds, then optionally `seed`, a screenshot name, `throttle`) |
| `realtest.js` | The 16 real singing clips decode and play, the synthesized fallback runs for a missing clip, the service worker caches the clips, the Guide page lists them | `node tests/realtest.js` |
| `cut.js` | How long the app listens to a held note in a given recording, with optional lag injected into the audio delivery (the 5 Oct cut-off bug) | `node tests/cut.js 8765 road11.wav 0` (port, recording, lag in ms) |
| `diag.js` | Listening diagnostics: a session started with Start logs takes and phone events; the page shows them, and Copy, Save as file and Clear work | `node tests/diag.js 60` (seconds per half of the session) |
| `later.js` | Delayed start: countdown, Skip, and the session starting after the wait | `node tests/later.js` |
| `navtest.js` | Home link, Back buttons and the separate views | `node tests/navtest.js` |
| `own.js` | The own-voice note bank: an in-tune note is saved, reloaded and reused as the model note | `node tests/own.js` |
| `pwa.js` | Manifest, service worker, installability and loading offline | `node tests/pwa.js` |
| `clipcheck.js` | Pitch, level and gaps of each clip in `audio/`, using the app's own pitch detector | `node tests/clipcheck.js` |
| `filt.js`, `filt2.js`, `filt3.js` | Simulations of the input filter against road noise, from the 5 Oct fix; kept for reference | `node tests/filt3.js` |

## Recordings

`tests/audio/*.opus` are synthetic, not a real voice: `voice` is a simulated singer for whole sessions, `quiet` is a held note without noise, `road8` and `road11` are the same note with simulated road noise 8 and 11 dB above the voice.
