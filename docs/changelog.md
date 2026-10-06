# Road Voice Coach: changelog and field reports

Companion to [research.md](research.md) (research and build notes). Newest first.

The assessment and prioritized backlog are in [BACKLOG.md](../BACKLOG.md). The working copy is the Claude Doc "Road Voice Coach: assessment and backlog" (https://claude.ai/code/artifact/48816687-019b-4b0f-85eb-14495b2ef7ce, private to Paul). When a backlog item is built, update the status in the doc and re-export it to `BACKLOG.md`, replacing the byline line.

## 7 Oct 2026 (version label 2026-10-07.2): more nasality exercises, sounds with a job and a half-step climb, transfer to a song

Three backlog items from the YouTube teachers section.

Changes:
- Nasality: besides the contrast pair and the lifted ah, each nasality block now uses one or two exercises from a rotating list of six (`NASX`, counter `D.nx`): sing-ah (as before), "hung" held on the N G and opened to ah, a dark "uh" dropping the jaw into ah, puffed cheeks (feel only: one puffed note, one relaxed, played back, no pitch score), the slow-motion gasp or silent-K in-breath followed by a sung ah, and a dopey Yogi Bear uh-ah followed by a normal ah. The first nasality block of a session uses one, later ones two, so the block stays about as long as before. Sing-ah is now one of the six rather than in every block.
- Five new nasality cues in `TIPS.nasal` (hung then open, dark uh to ah, puffed cheeks, in-breath on a K, dopey Yogi Bear); the slow-motion gasp already existed as "Silent gasp". The Guide lists them with the others.
- The synth has a new vowel shape "uh" and three new demonstrations (hung, uh to ah, Yogi Bear), all built from the existing formant synth.
- New technique topic "Sounds with a job", last in the rotation, so the default rotation has ten slots. Four sounds rotate through `tipFor("job")` (so they can be starred on the Guide page): ng for a relaxed tongue and a forward sound, gee for a loose tongue and bright easy tone, mum with a slight yawn for a low relaxed larynx, a sad no to stop the voice flipping at the break. The coach says the job aloud and plays the pattern on the closest vowel shape (ng, ee, hum, oh), because the synth has no consonants. The pattern is the five-note scale 1-2-3-4-5-4-3-2-1 or 1-3-5-3-1, changing every fourth block.
- The half-step climb is part of that block: the pattern starts at `p.low`+2 and goes up a semitone each step, with "Up a half step." between steps. It stops after two bad misses in a row (not heard, or 60 cents off or more), when the top of the pattern would pass `p.high`-1, or after 8 steps, then says "You climbed to F sharp 3 today." with how many half steps that is above or below last time, and "A new best." when it is. The highest clean step (under 40 cents) is kept in `D.climb`. Climb takes are not counted in the session's cents-off average (new rep option `noScore`), because they deliberately go to the edge of the range.
- Settings, topic checkboxes: the new topic appears automatically. A saved `topics` list now also stores `topicsOf` (the topics that existed when it was saved); a list saved before this change knew the first seven, so the new topic is included until it is unticked. With the default (all topics) it is included.
- Transfer step: about every second technique block (counter `D.xf`; the pattern shifts every 8 blocks so a topic that always lands on the same beat, such as nasality set to "more", still gets it about half the time) ends with one line of a song. The coach says "Now take that into a song. One line of <song>, first on ah, keeping today's cue, <cue name>." (on "mum" for sounds with a job; plain "ah" for nasality, because an M would work against it), the line is sung once on that syllable and once with the words. All 12 song phrases are used in turn (`D.xp`); the key comes from a new shared helper `songTon`, which the song block now uses too. It is inside each technique function, so learned block times include it. In the nasality block it replaces the final phrase-without-M-N-NG step when due.
- Block estimates (`BLOCK_MIN`): technique blocks now include half of the transfer step; new entry "Sounds with a job" 2.3.
- Tests: new `tests/technique.js`; `tests/blocks.js` and `tests/timing.js` include the new block, and `timing.js` also times nasality with and without the transfer step and the transfer step alone.

Tested in headless Chromium only: `technique.js` (79 checks, 0 failed, 0 page errors) covers the exercise rotation, the transfer step text and count, the four sounds in turn, the climb rules with a scripted rep (all clean, two misses in a row, single misses, takes not heard, fair takes, narrow and tiny ranges, nothing clean, higher, same, lower, new best) and the old and new saved topic lists; `blocks.js` passes. `timing.js` at speed 6 with speech stubbed at 70 ms a character: nasality 2.4 min (first block), 2.1 (later), 2.7 with the transfer step; sounds with a job 1.5 (the simulated singer is not on the notes, so the climb stops after two steps; a real climb will be longer, hence the 2.3 estimate); transfer step 0.8. Not tested on the phone or in the car: how the new exercises sound through the car speakers and the synthesized uh, hung and Yogi Bear demonstrations, whether the pitch tracker follows ng, gee, mum and no, the real length of a full eight-step climb, whether the puffed-cheeks and gasp exercises are clear from the spoken instructions alone, or whether the transfer step is welcome at this frequency. The Claude Doc copy of the backlog is behind `BACKLOG.md` for these three items.

## 7 Oct 2026 (version label 2026-10-07.1): streak and weekly goal, old take against new take, lesson links

Three backlog items.

Changes:
- Practice days: a day counts when a session ran for 3 minutes or more, recorded when the session ends (`rvc_days`, sorted unique `YYYY-MM-DD`, last 120), separately from the session history, which still needs 4 pitch scores. Mic tests do not count. Dates use the same function as everywhere else in the app (`today()`, UTC), so the day and the week change at the same moment as the rest of the data; the week is Monday to Sunday on those dates.
- Settings, "Weekly goal": 3 to 7 days a week, default 4 (`rvc_goal`).
- Spoken: after the first greeting line, when the streak is 2 days or more counting today, "Day three in a row." (words up to ten, digits after). The summary at the end of round 1 adds "That's 2 of your 4 practice days this week." or, once the goal is met, "That's your weekly goal of 4 days reached." Both count today as practised, because the session is running.
- Progress page, top: "This week: 2 of 4 days. Streak: 3 days." and the last 8 weeks as small squares (one column of 7 per week, Monday at the top, amber when practised, most recent week last), each week with an accessible label giving its count. The streak runs to today, or to yesterday when today has no session yet.
- Old take against new take: the first saved take of each label (free singing, each block's best take, song names) is also stored as a marked copy that is never pruned (`first: true` in the `clips` store); the newest 20 other clips are kept as before and at most 12 first clips (past that the first clip of the label used longest ago goes, so free singing stays). A clip saved before this update becomes the first for its label, so existing takes are not lost. First clips are left out of "Saved takes" and are included in the backup file.
- Progress page, "Then and now": for each label whose first take is at least 7 days older than its newest one, the label with "▶ First (MM-DD)", "▶ Latest (MM-DD)" and "▶ Both" (first, a 0.7 s gap, then latest).
- In a session, after the free-singing clip is saved: if the first free-singing take is 14 or more days old and it was not done in the last 14 days (`D.thenNow`), the coach says "Here's your free singing from your first week, and then today's." and plays the first (12 s at most) and then today's. This replaces the plain "Here are a few seconds of it" playback that time.
- Guide, "Lessons to watch at home" after the cues: one YouTube lesson per topic (nasality, lip trills, pitch, breath, clean onsets, registers, clear tone, smooth line, loose jaw and tongue, posture, vowels), each a link that opens in a new tab, with the video title and channel. For home, never while driving.
- New test `tests/progress.js`.

Tested in headless Chromium only: streak and week text and squares from seeded days (including a gap and the up-to-yesterday case), the goal setting, 11 lesson links all to https://www.youtube.com/, `addClip` keeping first clips through pruning (20 normal, 12 first, the original free-singing take kept), the then-and-now buttons and the 0.7 s gap, the free-singing then-and-now line (played once, not again until 14 days later, not when the first take is under 14 days old), the two spoken summary lines, the streak line at the start of a session, and a day recorded only after 3 simulated minutes; `backup.js` and `blocks.js` pass. Not tested on the phone: the spoken lines and the then-and-now playback through the car speakers, the layout on the phone's own screen, and whether the YouTube links open in the phone's browser or the YouTube app. I did not watch the videos; titles and channels are as given.

## 6 Oct 2026 (version label 2026-10-06.4): session length, focus, backup

Changes:
- Settings, "Session length": until Stop (as before, the default), or about 5, 10, 20 or 30 minutes. A timed session plans each round from block estimates: the warm-up and the first technique block always run in round 1, then pitch matching, the second technique block, song or skills, scales, intervals and free singing as time allows. It ends with the summary, a 25-second cool-down (gentle hums sliding down) and "That's the end of today's session". Sessions of 10 minutes or less use a short warm-up (15 s of lip trills, one hum pattern). The home screen says which length is set.
- Block estimates start from `tests/timing.js` (speech stubbed at 70 ms a character): technique blocks 1.3 to 2.4 min, warm-up 2.4, pitch blocks about 1.8, mixed practice 5.5. The phone then learns its own (`D.bmin`, a running average; paused time left out), and the diagnostics log shows how long each block took and each round's plan.
- Settings, "Nasality work": more (every other technique block), normal (twice per rotation, the old rotation exactly, so `D.rotT2` carries on), less (once), off. Checkboxes choose the other technique topics in the rotation.
- Settings, "Backup": Save backup downloads one JSON file with all `rvc_*` settings and progress and, optionally, the saved takes and own-voice model notes (16-bit samples, base64). Restore from backup replaces everything on the phone after a confirmation, then reloads. The date of the last backup is shown.
- New tests: `timing.js`, `length.js`, `backup.js`.

Tested in headless Chromium only: a 5-minute session ended by itself after about 5.5 minutes (short warm-up, one technique block, cool-down); a 20-minute session ran a full first round (eight blocks) and a short second one, then the cool-down; the rotation for every nasality setting and topic choice; a backup with a take and a model note restored onto a cleared browser with identical data; a non-backup file is refused; `blocks.js` passes. Not yet run on the phone. Real block lengths depend on how fast the phone speaks, so the first timed sessions may run a minute or two long until the phone has learned its own block lengths.

## 6 Oct 2026 (version label 2026-10-06.3): listening diagnostics

The first backlog item: so the next drive gives data and not only a description, the app now logs every take.

Changes:
- New page "Listening diagnostics", opened from Settings. For each of the last 8 sessions it shows one line per take: time into the session, block, seconds listened, seconds sung, share of that time with a readable pitch, why listening ended (quiet = the singer stopped, limit = time limit, none = never heard the singer, safety = the wall-clock safety stop after audio fell far behind, skip, stop), car noise and voice level in dB, how late the microphone audio arrived, and the last line on screen. Phone events go in the same list: app to background and back on screen, gaps in microphone audio, the microphone giving pure silence, the cut-off warning, speech that did not finish, pause, skip and replay.
- Copy puts all of it on the clipboard as plain text, to paste into a chat; Save as file downloads the same text. Clear empties the log.
- Stored in localStorage key `rvc_diag`. A session that crashes or is closed without Stop still keeps its log, marked "not finished".
- New test `tests/diag.js`.

What to do on the next drive: run a session as usual, then open Settings, Listening diagnostics, press Copy and paste the text into a chat. Takes that ended "quiet" with only a short "sang" time while you were still singing, a low "pitch" share, or a "lag" that keeps growing point to the cause.

Tested in headless Chromium only: a session started with the Start button logs takes and events (pause, resume, skip, stop), the page shows them at phone width without the page scrolling sideways, Copy, Save as file and Clear work, `blocks.js`, `smoke.js`, `navtest.js` and `cut.js` (1.5 s lag, road11) pass with no page errors. Not yet run on the phone.

Backlog updated in the Claude Doc and in `BACKLOG.md`: the first item notes the page is built; its status stays "Needs Paul" for the drive.

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
