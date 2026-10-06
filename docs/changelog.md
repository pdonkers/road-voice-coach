# Road Voice Coach: changelog and field reports

Companion to [research.md](research.md) (research and build notes). Newest first.

The assessment and prioritized backlog are in [BACKLOG.md](../BACKLOG.md). The working copy is the Claude Doc "Road Voice Coach: assessment and backlog" (https://claude.ai/code/artifact/48816687-019b-4b0f-85eb-14495b2ef7ce, private to Paul). When a backlog item is built, update the status in the doc and re-export it to `BACKLOG.md`, replacing the byline line.

## 6 Oct 2026 (no app change): notes, tests and instructions moved into the repo

The work moved out of the "ToDo" Claude project. The research notes and this changelog now live in `docs/`, the working test scripts in `tests/`, and the standing instructions in `CLAUDE.md`. The app itself is unchanged (version 2026-10-06.2).

## 6 Oct 2026, commit b19046a (version label 2026-10-06.2): real singing examples, backlog in the repo

Paul approved downloading VocalSet through his computer and publishing short clips with credit.

Changes:
- `audio/` holds 16 MP3 clips (628 KB in total, mono 64 kbit/s, 3 to 8 s each) of VocalSet singer `m1` (baritone): lip-trill, breathy, clear, swell, vibrato, smooth, separate, vowel-ah/eh/ee/oh/oo, soft, full, song-plain, song-vibrato. Attribution and the clip-to-source table are in `audio/CREDITS.md`.
- `real(name, fallback)` in index.html plays a clip through the session output and falls back to the synthesized `DEMO` example if the clip does not load within 4 s. Used in: warm-up (lip trill), clear tone (breathy then clear), swell, smooth line (separate then smooth), vowels. The Guide page lists all 16 under "Real singer" above the synthesized examples.
- `sw.js` cache is now `rvc-v2` and precaches the clips, so they work without a connection after the first load.
- `BACKLOG.md` added to the repo; README links to it.

Still synthesized, because no openly licensed recording exists: nasal against lifted tone, sing-ah, onsets (H, click), slides and sirens, staccato. Not used in a session yet: vibrato, soft, full, song-plain, song-vibrato (Guide page only).

How the clips were obtained (reusable):
- VocalSet v1.2 is Zenodo record 1442513 (doi 10.5281/zenodo.1442513), CC BY 4.0. The download is one zip, `VocalSet11.zip`, 2.1 GB. The 637 MB figure and the record number 1492453 written earlier were wrong.
- The cloud workspace cannot reach zenodo.org (proxy allowlist). Chrome on Paul's PC can. In the Zenodo tab, JavaScript read the zip's central directory with HTTP Range requests, fetched only the 17 wanted entries (16 MB), unpacked them with `DecompressionStream`, and saved them as one tar through a download link.
- Clips were cut with ffmpeg: for long tones, take the loudest window found with a 50 ms RMS envelope (a relative silence threshold picked up room noise); for scales, the span above 12% of the near-peak level; fade 30 ms in and 300 ms out, `loudnorm` to about -18 LUFS (breathy -21, soft -23, full -17), mono 44.1 kHz MP3 at 64 kbit/s. Checked with the app's own YIN detector (`tests/clipcheck.js`).
- Paul has copies of the clips on his PC.

Tested in headless Chromium only: all 16 clips decode and play, the fallback runs for a missing clip, the service worker caches 16 audio files, a full pass through every block gives no page errors. Not yet heard on the phone or in the car.

Open, waiting on Paul:
- Confirmation that the 5 Oct listening fix works on the road.
- A test with the phone locked.
- Whether he wants a voice teacher to record the nasality, sing-ah and onset examples.

## 6 Oct 2026, commit dbf02ad (version label 2026-10-06.1): balance, explanations, rhythm removed

Paul's report after his third drive: he likes it so far; rhythm practice does not work and he is not interested in it; nasality is overrepresented compared with other technique work; technique work needs more explanation and examples of how it should sound; he asked for real singing audio.

Changes:
- Rhythm removed from the skills rotation (skills = swell, clean starts). The `rhythm` function is still in the file, unused.
- Nasality no longer runs every round. Technique rotation (D.rotT2, nine slots): nasality, clean onsets, registers, vowels, clear tone, nasality, smooth line, breath and long notes, loose jaw and tongue. Two technique blocks per round: one after the warm-up, one after the pitch drills.
- Each technique block gives a "what and why" explanation the first three times (WHY object, D.why counters).
- New synthesized examples: onset with an H, onset with a click, choppy line, smooth line, vowels ee/eh/oh/oo/ah as the model sound in vowel work.

Real singing audio was researched here and built in the next entry. GTSinger (CC BY-NC-SA 4.0, Hugging Face) remains an unused option: it has falsetto/mixed voice and glissando with paired control takes, but its licence is non-commercial share-alike.

## 5 Oct 2026, commit 4f5e0c8: takes cut off too early

Paul's report after his second drive: listening often stopped far too soon; he could not finish a scale, and was told a sustained note was too short while still holding it.

Causes found and fixed:
1. Clock mismatch in `listen()` (introduced with the background-running change on 4 Oct). Frame timestamps were on the audio-sample clock, but the end-of-take test compared them with the wall clock. Once audio delivery lagged behind real time (any glitch or pause; the lag never recovers), every take ended about 0.6 s after singing began. Reproduced in headless Chromium by injecting 1.5 s of lag (`tests/cut.js`): the old build kept 3 voiced frames of a 6 s note. `listen()` now times everything on the audio clock, with a wall-clock safety limit.
2. Road rumble drowned the voice in pitch detection. The input filter was a single 65 Hz high-pass. In a simulation with noise falling 9 dB per octave and the voice 8 to 11 dB below total noise level, the old filter detected 0% of sung frames; four cascaded 340 Hz high-passes (pitch read from harmonics) plus a 3.2 kHz low-pass detected about 100%. The voicing gate is now 1.5x the noise floor (was 2.5x).
3. Once singing has started, sound above 2.2x the noise floor keeps the take open even when the pitch cannot be read.
4. Held notes are measured from the first to the last frame near the main pitch (`holdSeg`), not the longest unbroken stretch.
5. Longer limits: default end-silence 1.5 s (was 1.2), sequence limit = model length x 1.8 + 6 s, held-note limits raised by about 3 s.

Still unverified on the phone: all of the above in a real car; hum detection may be weaker with the new high-pass because a hum has little energy above 340 Hz.

## 4 Oct 2026 and earlier

First build, research-based feature batches 1 to 3, hosting on GitHub Pages, installable web app, background running, rotating cues, synthesized examples, new technique blocks, delayed start, Home link and Back buttons. Paul's first drive: he liked the nasality tips, found 9-note scales in vowel work too hard to remember, and needed audio examples for lip trills and "sing-ah". See the git history and [research.md](research.md).
