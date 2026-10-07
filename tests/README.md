# Tests

These are the scripts used to check the app after each change. `npm test` runs all of them, and GitHub Actions runs the same command after every push to `main`. They test in a headless browser with a simulated microphone, which is not the same as a phone in a car.

## Run everything

1. `npm install` (Playwright, from `package.json`; `package-lock.json` is committed and CI uses `npm ci`).
2. `npx playwright install chromium` (once).
3. ffmpeg on the path (once; `winget install ffmpeg`, `brew install ffmpeg` or `sudo apt-get install -y ffmpeg`). It decodes the simulated microphone recordings.
4. `npm test`.

`npm test` is `node tests/run-all.js`. It does the following:
- Decodes `tests/audio/*.opus` to WAV when a WAV is missing (what `prepare.sh` does) and makes `tests/out/`.
- Serves the repo itself on port 8765 (or the `PORT` environment variable, which every script reads); if something already serves `index.html` there, such as `python3 -m http.server 8765`, it uses that. If the port is taken by something else, it picks a free one.
- Runs each script below in turn, with fixed arguments, and writes each one's output to `tests/out/<name>.log`.
- Judges each script by its exit code, by any error count it prints (`page errors: N`, `errors: N`), by its failure markers (`FAIL`, `N FAILED`, `checks failed: N`, `failed checks: N`, `RESTORE MISMATCH`, `TIMEOUT`, `PAGEERROR`) and by the summary line it should print. It then prints a summary table and exits non-zero if anything failed.
- Leaves out `timing.js` (a measurement) and `filt*.js` (reference simulations).

Options: `npm run test:quick` skips `blocks.js` and the 20-minute length run; `node tests/run-all.js songs home` runs only the named scripts.

A full run takes about 30 minutes and a quick one about 22. Run the scripts on their own (below) while working on one feature.

## CI

`.github/workflows/tests.yml` runs on every push and pull request to `main`: Ubuntu, Node 20, ffmpeg from apt, `npm ci`, `npx playwright install --with-deps chromium`, `npm test`. When it fails, `tests/out/` (the logs and screenshots) is uploaded as the `test-output` artifact. The scripts launch Chromium with fake-media flags, which works headless on Linux.

## Running one script

1. Serve the repo: `python3 -m http.server 8765` from the repo root, or let `run-all.js` do it.
2. Run `tests/prepare.sh` once, or `npm test`, so `tests/audio/*.wav` exist (both are ignored by git, as is `tests/out/`).
3. The scripts find Playwright in `node_modules`. Set `PLAYWRIGHT` to another path to use a different install.

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
| `focus.js` | Session focus and the nasality-score check: the focus rules (low or falling nasality, the register break, the topic practised longest ago, ties to nasality, the setting), the spoken line and the technique-block order in untimed and timed sessions, `nas` saved with scored takes, backup and pruning of them, and the "Check the nasality measure" panel (random order, hidden score, Spearman result and verdicts, scatter) | `node tests/focus.js 10` (speed; about 6 minutes) |
| `ear.js` | Ear training by voice: the generators for the three exercises at each level (higher or lower, the missing note, interval by ear; narrow ranges too), the sung answer judged within 70 cents with octaves folded (strict for the octave interval), the one-line verdicts, the retry with the right note, level steps up and down, the whole block on the simulated microphone (items per level, first-time explanations against the short lines, nothing in `D.notes` or the cents-off score), the rotation swell, starts, ear training, and a timed session planning and naming the block | `node tests/ear.js 10` (speed; about 3 minutes) |
| `home.js` | Home practice: the nav button at 412 px, the live pitch graph (ring buffer fed by `tick()`, line pixels read from the canvas, green or orange against the target, neutral without one, CSS variables followed, 8-second scroll, DPR and resize), the target picker and its limits, Play note, the drone on and off and following the target, Stop on the first press with no singing time, diagnostics or practice day recorded, the Home link and nav buttons, and that a car session does not feed the graph | `node tests/home.js` (about 1 minute) |
| `songs.js` | Songs: every built-in song (4 phrases, n and d of equal length, cues of 5 words at most, spans), the range fit, know / teach me / skip per song and their defaults, the rotation (least sung first, known before teach, a song in progress carries on, an old saved state), teaching a song (lines played twice, becoming known after a good whole-song take, next pressed early marking it teach), the transfer step using known songs only, the cue wording in song practice and the transfer step, the own-song format (valid and invalid inputs, error messages naming phrase and token), the Guide form (save, preview, duplicate name, delete, no sideways scroll at 412 px), the backup, and a whole own song through `song()` | `node tests/songs.js` (about 1 minute) |
| `run-all.js` | Runs all of the above in turn (see Run everything); not a check of the app | `npm test` or `npm run test:quick` |
| `later.js` | Delayed start: countdown, Skip, and the session starting after the wait | `node tests/later.js` |
| `navtest.js` | Home link, Back buttons and the separate views, including the mic test and home practice (the Home link ends both; six nav buttons fit at 412 px) | `node tests/navtest.js` |
| `own.js` | The own-voice note bank: an in-tune note is saved, reloaded and reused as the model note | `node tests/own.js` |
| `pwa.js` | Manifest, service worker, installability and loading offline | `node tests/pwa.js` |
| `clipcheck.js` | Pitch, level and gaps of each clip in `audio/`, using the app's own pitch detector | `node tests/clipcheck.js` |
| `filt.js`, `filt2.js`, `filt3.js` | Simulations of the input filter against road noise, from the 5 Oct fix; kept for reference | `node tests/filt3.js` |

## Recordings

`tests/audio/*.opus` are synthetic, not a real voice: `voice` is a simulated singer for whole sessions, `quiet` is a held note without noise, `road8` and `road11` are the same note with simulated road noise 8 and 11 dB above the voice.
