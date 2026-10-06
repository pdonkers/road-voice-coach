# Road Voice Coach: research and build notes

App: https://pdonkers.github.io/road-voice-coach/ (repo pdonkers/road-voice-coach, GitHub Pages from main). Installed on Paul's Android phone as a web app; used in a Volvo over the car speakers with the phone's microphone.

Status (7 Oct 2026, version label 2026-10-07.1): everything in "Build notes" is live. What changed when, and what Paul reported after each drive, is in [changelog.md](changelog.md). Planned work is in [BACKLOG.md](../BACKLOG.md).

Fixed requirements from Paul: press Start once and never touch the screen again; spoken feedback; English coach; beginner with auto-detected range; exercises plus free singing. He sings nasally (true nasality, confirmed with the nose-pinch test, so the app does not test for it) and reducing that is a main goal. He is not interested in rhythm practice.

## Build notes (what exists in the app now)

- Files: `index.html` (the whole app, about 1,600 lines), `sw.js` (network-first service worker, cache `rvc-v2`), `manifest.webmanifest`, icons, `audio/*.mp3` (real singing clips).
- Round order: warm-up (round 1), technique block, pitch matching + scales + intervals (or "mixed practice" from round 2 once 3+ sessions are logged), second technique block, practice block, free singing, summary, reset.
- Technique rotation (D.rotT2, nine slots): nasality, clean onsets, registers, vowels, clear tone, nasality, smooth line, breath and long notes, loose jaw and tongue. Practice rotation (D.rotP): song, skills (swell, clean starts). The `rhythm` function is still in the file, unused.
- Each technique block explains what it is and why it matters the first three times (WHY object, D.why counters).
- Cues: TIPS bank with several cues per topic (nasality 10, pitch 3, breath 5, onsets 4, registers 4, tone 4, legato 4, release 4, posture 4). One cue per topic per session, least-used first; starred cues are picked 40% of the time. Guide page lists cues with star toggles, times heard and, for nasality cues, the average nasality measure.
- Audio examples. Real singer (`real(name, fallback)`, clips in `audio/`): lip trill, breathy and clear tone, swell, smooth and separate notes, five vowels; vibrato, soft, full and a song line are on the Guide page only. Synthesized (`DEMO` object, formant synth): siren, sing-ah, staccato, onsets with an H and with a click, hiss, and the fallback for every real clip.
- Vowel work uses a held note and three-note patterns. Diction is on one note.
- Nasality block: nasal vs lifted "ah" contrast pair with back-to-back playback, lifted reps using the day's cue, "sing-ah", a phrase without M/N/NG. Experimental nasality score = A1-P0 calibrated against the user's own contrast pair each round; only used when the pair differs by 3 dB or more.
- Registers block detects flips in a slide (jump of 2.5+ semitones that is not an octave misread) and stores the note in D.brk.
- Smooth line block counts breaks in the sound between first and last sung frame.
- Replay policy: always in nasality, diction, onset and tone work; after clear misses (60+ cents); first rep of a new exercise type; best take at block end; a 12 s clip of free singing.
- Feedback: self-judgment prompt first; spoken verdict every rep for the first 2 sessions, every 2nd rep up to 5 sessions, then every 3rd; always on big misses. Setting "Spoken feedback" can force every rep.
- Adaptive levels per exercise (step up at 80% success over 6+ reps, down at 50%).
- Own-voice note bank: in-tune takes are stored (IndexedDB) and reused as the model note. Saved clips: the newest 20, plus the first clip of each label (at most 12).
- Listening: microphone with echo cancellation and gain control off; input filter of four cascaded 340 Hz high-passes plus a 3.2 kHz low-pass, so pitch is read from harmonics above the road rumble; YIN pitch detection; takes are timed on the audio clock, and sound above 2.2x the noise floor keeps a take open.
- Background running: pitch analysis and all waits are driven by incoming microphone audio (AudioWorklet messages), not page timers; a silent audio loop plays during sessions. Mic cut-off detection (digital silence 4 s, track mute/ended, or audio blocks stopping) triggers a spoken alert; the end-of-session message reports muted/suspended seconds and failed coach utterances.
- Session length (setting `len`, minutes; 0 = until Stop): a timed session plans each round with `fitRound` from block estimates (`BLOCK_MIN`, then the phone's own averages in `D.bmin`), keeps 1.2 min for the summary and cool-down, and ends with `coolDown()`. Priority: technique 1 and warm-up (always in round 1), pitch matching (or mixed practice), technique 2, song or skills, scales, intervals, free singing.
- Focus: `techRotation()` builds the technique rotation from the settings `nasal` (more, normal, less, off) and `topics` (the other topics chosen; null = all). Normal with all topics is the original nine-slot rotation.
- Backup (Settings): one JSON file with every `rvc_*` localStorage key and, optionally, the IndexedDB notes and clips (with their `first` flag) as 16-bit base64 PCM; restoring replaces the phone's data and reloads.
- Practice days, streak and weekly goal: `noteDay()` adds today to `rvc_days` (sorted unique `YYYY-MM-DD`, last 120) in the `finally` of `start()` when a non-test session ran 3 minutes or more (time counted with `SPEED`, as the clock is). Setting `goal` (3 to 7, default 4). `streakOf` runs to today, or to yesterday when today has no session; the week is Monday to Sunday on the same UTC dates as `today()`. Spoken: "Day three in a row." after the first greeting when the streak (counting today) is 2 or more, and one sentence in the round-1 summary with days this week against the goal. The Progress page starts with the week and streak line and 8 weeks of 7 squares.
- Then and now: `addClip` also keeps the first clip of each label as a copy with `first: true` (never pruned except past 12 labels, then the label used longest ago goes); normal clips stay at the newest 20. The Progress page shows "Then and now" with First, Latest and Both buttons for labels whose first take is at least 7 days older than the newest; Saved takes hides first clips. `freeSing()` plays the first free-singing take and then today's when the first is 14+ days old, at most once in 14 days (`D.thenNow`).
- Guide lessons: `LESSONS`, one YouTube video per topic (nasality, lip trills, pitch, breath, onsets, registers, clear tone, smooth line, loose jaw and tongue, posture, vowels), for watching at home.
- Delayed start: "Start in N min" opens the mic at the press and counts down; Skip starts at once.
- Navigation: Home link, title tap and Back buttons; panels open as separate views. A version label on the home screen shows which build is loaded.
- Listening diagnostics (Settings, then "Listening diagnostics"): every `listen()` call in a session adds one entry to `rvc_diag` (localStorage, last 8 sessions, at most 400 takes and 300 events each): block, seconds listened, seconds sung (first to last heard frame), share of that span with a readable pitch, why the take ended (quiet, limit, none, safety, skip, stop), noise floor and voice level in dBFS, how late the mic audio arrived, and the last caption. Phone events are logged with it: app to background and back, gaps in mic audio over 1.5 s, runs of digital silence, the mic cut-off warning, coach speech timeouts, pause, skip and replay. The page shows each session as a table, and Copy or Save as file exports all of it as text.
- Speaker-to-mic delay is measured with a beep at session start so the coach does not hear its own output over Bluetooth.
- Data on the phone only: localStorage keys `rvc_data`, `rvc_profile`, `rvc_history`, `rvc_days`, `rvc_rangeDate`, `rvc_diag` and the settings; IndexedDB `rvc` (stores `notes` and `clips`).
- Hosting constraint: the microphone needs HTTPS, which is why the app is on GitHub Pages; a Claude artifact cannot use the microphone.
- Untested on a real phone: the 5 Oct listening fix on the road, running with the phone locked or in the background (a Chromium issue reports the mic stopping about 2 minutes after Chrome is backgrounded on some setups), whether the phone's text-to-speech keeps speaking from the background, steering-wheel media buttons, hiss timing and nasality score over road noise, hum detection with the 340 Hz filter.
- Testing so far: headless Chromium runs with a simulated microphone, including with timers throttled to 1 Hz. The scripts are in `tests/`.

## What the evidence says (feedback, models, difficulty)

1. Feedback frequency. Voice-therapy motor-learning review (PMC13152083): 50% knowledge-of-results or no feedback gave better retention and transfer than constant feedback after the first acquisition phase. Crocco & Meyer (Journal of Singing 2021): feedback less often, on larger errors, and ask the student to self-evaluate first.
2. Model timbre. Voice models are matched much better than piano or synth tones (J Voice 2013). Everyone imitates recordings of their own voice more accurately, poor-pitch singers most (Pfordresher & Mantell 2014). Caveat (Frontiers Psychol 2021): matched-timbre help improved accuracy only while present.
3. Self-recording. Own voice sounds darker to the singer (bone conduction); playback improved self-assessment accuracy (small study).
4. Difficulty. Learning peaked near a 30% error rate (bioRxiv 2023). Shorter sequences, slower tempo and a neutral syllable make pitch easier (Frontiers 2011).
5. Practice structure. Distributed practice beats massed; random order helps transfer.
6. Car-specific. Lombard effect raises loudness in noise; instruction to resist it works. Semi-occluded warm-ups lower laryngeal load. AAA: long voice dialogues and recognition errors raise distraction.
7. Cues are individual. Analogy instructions helped people with high verbal preference and hurt those with low verbal preference (ScienceDirect S1469029219303061); a youth meta-analysis found little average difference between cue types (PLOS ONE 2023). Supports rotating cues and letting the singer pick.

Teaching practice, other apps and YouTube teachers were researched again on 6 Oct 2026; that comparison is in [BACKLOG.md](../BACKLOG.md).

## Technique areas beyond pitch and nasality (researched 4 Oct 2026)

Standard pedagogy splits technique into respiration, phonation, resonation, articulation and registration, plus posture, breath support, vibrato, range, tone quality, legato, agility and diction (Wikipedia: Vocal pedagogy).
- Onset: aspirate (H before the note), glottal (click), balanced (preferred). Exercises: hums, lip trills, slides from silence, short repeated notes (voicescience.org).
- Registers: cracks come from uncoordinated change between chest and head registers; slides on "woo" or "ng", lip trills or straw, light and not loud (Pfitzner passaggio playbook).
- Tone: breathy = folds not closing; pressed = too much resistance. Fixes: staccato three-note patterns, "ah-ha", voiced consonants, less air (SingWise).
- Legato: one vowel through the phrase, quick late consonants, no vowel decay, steady air (voicescience.org).
- Tension: tongue tip behind lower teeth, tongue-out singing, tongue stretches, yawn (London Singing Institute); most jaw exercises need hands, so only cues are used in the car.
- Soft palate cues: yawn, inner smile, silent laugh, ping-pong ball, K/G pops, B for M, ng to vowel, eyebrows and nostrils (Judy Rodman, Ted's Voice Academy, Cincinnati Children's speech therapy handout).
- Lip trill: lips loose, blow as if making bubbles, add voice; fingertips on cheeks if lips will not vibrate (Cambridge University Hospitals).
- Seated posture: tall spine, chin level, shoulders loose (Conquest Voice Studio).

## Competitor features worth considering (researched 4 Oct 2026)

- Per-note history and targeting weak notes (Singing Carrots).
- Session plan built from the singer's weaknesses, with a daily note ceiling for vocal health (Singing Carrots: 300 notes).
- Songs transposed to the singer's range and song suggestions that fit the range (Simply Sing, Yousician, Singing Carrots).
- Streaks, goals and levels (Vanido, Simply Sing, Yousician).
- Ear training (SingTrue, Vocalizer).
- Custom routines and warm-up length (SWIFTSCALES, Warm Me Up).
- Breath detection (Sing Sharp), cool-down and vocal fry (7 Minute Vocal Warmup), pentatonic/riff patterns (Vocalizer).
- Real-teacher lessons (Singeo, Melody): not replicable; export of takes for a teacher is the nearest equivalent.

## Sources
- https://pmc.ncbi.nlm.nih.gov/articles/PMC13152083/
- https://davidmeyervoice.com/site/wp-content/uploads/2021/08/JOS-077-5-2021-Crocco-Meyer-Motor-learning.pdf
- https://www.sciencedirect.com/science/article/abs/pii/S0892199713000027
- https://www.sciencedirect.com/science/article/abs/pii/S0010028514000036
- https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.684693/full
- https://www.biorxiv.org/content/10.1101/2023.07.19.549705v5
- https://public-pages-files-2025.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2011.00164/pdf
- https://www.voicescience.org/lexicon/lombard-effect/
- https://aaafoundation.org/research/mental-workload-common-voice-based-vehicle-interactions-across-six-different-vehicle-systems/
- https://wstyler.ucsd.edu/files/styler2017_jasa_onacousticalnatureofnasality.pdf
- https://www.sciencedirect.com/science/article/abs/pii/S1469029219303061
- https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0280201
- https://en.wikipedia.org/wiki/Vocal_pedagogy
- https://www.voicescience.org/lexicon/phonatory-onset-types/
- https://katrinapfitzner.com/passaggio-playbook/
- https://www.singwise.com/articles/good-tone-production-for-singing
- https://www.voicescience.org/articles/how-to-sing-legato/
- https://www.londonsinginginstitute.co.uk/how-to-reduce-tongue-tension-when-singing/
- https://judyrodman.com/vocal-techniques-for-lifting-soft/
- https://tedsvoiceacademy.com/blog/mastering-the-raised-soft-palate/
- https://www.cuh.nhs.uk/patient-information/lip-trills-exercises/
- https://www.conquestvoicestudio.com/blog/to-sit-or-to-stand
- https://issues.chromium.org/issues/331092194
- https://singwell.eu/singing-apps/
- https://americansongwriter.com/best-singing-apps/
- https://singingcarrots.com/blog/top-7-ai-vocal-coaches/
