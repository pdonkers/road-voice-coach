# Road Voice Coach

Hands-free singing coach for the car. Open https://pdonkers.github.io/road-voice-coach/ on your phone, press Start, and the coach runs the whole session by voice.

What a session contains:

- Warm-up, then a nasality block (nasal versus lifted "ah", "sing-ah", phrases without M, N or NG) with playback of your takes.
- Pitch matching, scales and intervals. Difficulty adjusts itself to keep you near 70% success.
- Two technique blocks per round, rotating through nasality, onsets, registers, vowels, clear tone, smooth line, breath and loose jaw; then song practice or skills (dynamics, clean starts).
- Free singing, a summary, and a short voice reset between rounds.

How it gives feedback:

- You judge each take yourself first; spoken feedback then becomes less frequent as you gain experience.
- Playback of your own voice after clear misses, on new exercises, in nasality work, and as a best take per block.
- Reference notes are voice-like, and in-tune takes are reused as the model note in your own voice.
- A warning when you start singing louder than needed over road noise.

Other things it does:

- Rotating cues: each topic (nasality, pitch, breath, onsets, registers, clear tone, smooth line, loose jaw and tongue, posture) has several cues; one is used per session. Star the ones that work on the Guide page.
- Audio examples for exercises that are hard to describe, played during the session and on the Guide page. Lip trill, breathy versus clear tone, swell, smooth versus separate notes and the five vowels are short recordings of a real singer (from the VocalSet dataset, see `audio/CREDITS.md`). Nasal versus lifted tone, sing-ah, onsets and slides are synthesized, because no openly licensed recording of those exists yet.
- Delayed start: "Start in 10 min" opens the microphone straight away and begins the session after the wait.
- Built to keep running in the background or with the phone locked; it warns if the phone cuts off the microphone.

Steering-wheel media buttons: next skips the exercise, previous replays your last take, pause pauses.

The assessment of the app and the list of planned improvements are in [BACKLOG.md](BACKLOG.md).

The Progress page shows charts per session and lets you replay saved takes. After pressing Start you can switch to another app such as navigation; the session keeps running in the background. Everything runs in the browser; range, progress and recordings stay on the phone.
