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
| `length.js` | Session length and focus: the technique rotation for each setting, and a timed session ending by itself with a cool-down | `node tests/length.js 5 8` (minutes, speed) |
| `timing.js` | Real minutes per block, with speech stubbed at about real speaking speed, including nasality with and without the transfer step and the transfer step alone; the source of the block estimates | `node tests/timing.js 6` |
| `backup.js` | A backup file restores settings, progress, takes and model notes onto a cleared browser; a wrong file is refused | `node tests/backup.js` |
| `technique.js` | The six rotating nasality exercises (one in a session's first nasality block, two after), the transfer step (every second technique block, song and cue named, line sung twice), the "Sounds with a job" block (four sounds in turn, 'Up a half step.', the climb stopping after two bad misses, near the top of the range or after 8 steps, progress against last time), and the topics setting for lists saved before the new topic | `node tests/technique.js` (about 3 minutes) |
| `progress.js` | Practice days, streak and weekly goal (text, week squares, spoken lines, a day recorded after 3 minutes), the 11 Guide lesson links, first clips kept through pruning, the then-and-now buttons and the free-singing then-and-now line | `node tests/progress.js` (about 1 minute) |
| `limits.js` | The daily singing limit (setting, Progress line, a session started at the limit, the 80 percent warning, the limit line and cool-down in timed and untimed sessions, "Finished"), the two-step Stop button (at once in the first block; otherwise cool-down first, then stop; pause released), the per-note map `D.notes`, the Notes chart on the Progress page and practice aimed at weak notes | `node tests/limits.js 10` (speed; about 5 minutes) |
| `later.js` | Delayed start: countdown, Skip, and the session starting after the wait | `node tests/later.js` |
| `navtest.js` | Home link, Back buttons and the separate views | `node tests/navtest.js` |
| `own.js` | The own-voice note bank: an in-tune note is saved, reloaded and reused as the model note | `node tests/own.js` |
| `pwa.js` | Manifest, service worker, installability and loading offline | `node tests/pwa.js` |
| `clipcheck.js` | Pitch, level and gaps of each clip in `audio/`, using the app's own pitch detector | `node tests/clipcheck.js` |
| `filt.js`, `filt2.js`, `filt3.js` | Simulations of the input filter against road noise, from the 5 Oct fix; kept for reference | `node tests/filt3.js` |

## Recordings

`tests/audio/*.opus` are synthetic, not a real voice: `voice` is a simulated singer for whole sessions, `quiet` is a held note without noise, `road8` and `road11` are the same note with simulated road noise 8 and 11 dB above the voice.
