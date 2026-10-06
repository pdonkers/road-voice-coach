# Road Voice Coach: assessment and backlog

Last updated 6 October 2026. This is a copy of the working document; the app itself is described in [README.md](README.md).

## Summary

The app teaches well enough that you keep using it, but it does not yet listen reliably on the road and it can demonstrate a real voice for only about half the topics, not for nasality. Those two gaps matter more than any missing feature.

The five things to do next, in order:

1. Confirm the 5 Oct listening fix on a drive; the diagnostics page that logs every take is built (version 2026-10-06.3), so the drive now gives data.
2. Record real examples for nasality, sing-ah and onsets with a voice teacher; the VocalSet examples for the other topics went in on 6 Oct.
3. Add session length and focus settings.
4. Replace the phone's speech with a natural coach voice.
5. Add a transfer step that carries each technique into a song phrase.

Three items wait on you: a drive to confirm the listening fix, a test with the phone locked, and whether you want one lesson with a voice teacher to record the nasality examples.

## Current state

The app runs a complete hands-free session and is in real use, but most of what it measures has never been checked against a real voice in a real car. Three drives have happened; each one surfaced problems that simulation did not.

| Area | State | Basis |
| --- | --- | --- |
| Session loop: example, listen, judge, feedback, playback | Works | Used on three drives |
| Hearing the voice over road noise | Reworked on 5 Oct after takes were cut short | Simulation only; not yet confirmed on the road |
| Nasality cues and contrast exercise | Works, and is the part you like most | Your feedback |
| Nasality score | Experimental | Never compared with a human judgment |
| Other technique blocks (onsets, registers, clear tone, smooth line, loose jaw) | Built on 4 Oct; explanations too thin | Your feedback |
| Audio examples | A real singer for lip trill, clear tone, swell, smooth line and vowels since 6 Oct; still synthesized for nasality, sing-ah, onsets and slides | Clips checked by pitch analysis; not yet heard in the car |
| Balance of content | Nasality ran every round, every other technique topic once in seven rounds | Fixed in today's update |
| Rhythm exercise | Did not work in practice | Removed in today's update |
| Coach voice | The phone's built-in speech, robotic | By design so far |
| Running in the background or with the phone locked | Built for it | Not confirmed on your phone; Chrome may cut the microphone |
| Steering-wheel buttons | Built | Never tested in a car |
| Breath timer, register-flip detection, smooth-line break count | Built | Simulation only |
| Progress page and saved takes | Works | Headless browser tests |
| Your data (range, history, takes, starred cues) | Stored only on the phone | No backup or export |
| Code | One HTML file of about 1,500 lines; the test scripts are in the repository since 6 Oct but are run by hand | Each fix so far risked breaking something else |

The pattern across the three drives is that the teaching content holds up and the listening does not yet. Reliability on the road is the main weakness, ahead of any missing feature.

## Teaching best practices

The app already follows the evidence on feedback and practice structure; where it falls short of good teaching is in demonstrating the sound, keeping one focus per session, and carrying technique into songs.

| Practice | Source | In the app today | Gap |
| --- | --- | --- | --- |
| Explain, demonstrate, try, test, refine | Lesson structure used by [Singeo](https://blog.singeo.com/how-to-stop-sounding-nasal/) | Explains, plays an example (a real singer where one exists), listens, gives feedback | The demonstration is a real voice for about half the topics only; topics without a pitch score have no test step |
| One focus per session | [Voice Science](https://www.voicescience.org/articles/how-to-practice-singing/): one micro-skill per session; [Singwell](https://singwell.eu/how-to-practice-singing-at-home/): a single element on one or two phrases | Two technique topics per round plus pitch, songs and free singing | No session focus; nothing is chosen from your weak points |
| Short, frequent sessions | Voice Science: 20 to 30 minutes a day, and six 10-minute blocks beat one 60-minute session; Singwell: 4 to 6 days a week, "regularity beats length" | Session length setting; practice days, streak and weekly goal | Not yet used on a drive |
| Feedback less often, self-judgment first | [Motor-learning review](https://pmc.ncbi.nlm.nih.gov/articles/PMC13152083/); [Crocco and Meyer](https://davidmeyervoice.com/site/wp-content/uploads/2021/08/JOS-077-5-2021-Crocco-Meyer-Motor-learning.pdf) | Built | None |
| Objective feedback | Voice Science: measurable data such as cents matters most for singers without a teacher | Built for pitch | Nasality, tone and onsets rely on your own ear |
| Record, listen back, compare across weeks | [Pfitzner](https://katrinapfitzner.com/how-to-practice-singing-at-home/): 20-second clips right after singing; Voice Science: compare recordings across weeks | Playback during the session, saved takes, first take of each kind kept for "Then and now" | Not yet used on a drive |
| Mixed practice order | Voice Science; motor-learning review | Mixed practice from the fourth session | None |
| A voice as the model | [Pitch matching with a voice model](https://www.sciencedirect.com/science/article/abs/pii/S0892199713000027); [own-voice advantage](https://www.sciencedirect.com/science/article/abs/pii/S0010028514000036) | Voice-like synthesized notes; your own in-tune takes reused | A real singer in the technique examples only; the pitch notes are still synthesized |
| Apply technique to song phrases | Singwell; Pfitzner: technique block, then repertoire problem spots; [30 Day Singer](https://www.30daysinger.com/blog/stop-singing-with-a-nasally-voice): sing the melody on "ah" or "mum" before the words | Song practice exists but is separate from the technique topics | No transfer step |
| Gentle warm-up, cool-down, rest | Pfitzner: first notes at 70% volume, a rest after every 5 to 10 minutes of intense singing, cool down with humming | Warm-up, volume warning, short reset between rounds | Daily singing limit and a cool-down when you stop: done on 7 Oct |
| Teaching fitted to the student's goals | [Evidence-Based Voice Pedagogy](https://kariragan.com/defining-evidence-based-voice-pedagogy-a-new-framework/): research, teacher expertise, and student goals together | Cues rotate and can be starred | The app never asks what you want to work on |

The third leg of evidence-based teaching is a teacher's ear. No app replaces that, so one lesson with a voice teacher remains the best check on whether the app is training the right things.

## Other singing apps

No other app I found coaches by voice without a screen, so the car use is still this app's own ground; what the others do better is personalisation and song content.

| Feature | Who has it | Here |
| --- | --- | --- |
| Per-note history, with practice aimed at weak notes | [Singing Carrots](https://singingcarrots.com/blog/top-7-ai-vocal-coaches/) | Done on 7 Oct |
| Session plan built from your weaknesses | Singing Carrots | Missing; the rotation is fixed |
| Daily limit to protect the voice (300 notes) | Singing Carrots | Missing |
| Songs moved into your range, and song suggestions that fit it | [Simply Sing](https://americansongwriter.com/best-singing-apps/), Yousician, Singing Carrots | Three songs, moved into your range; no suggestions |
| Levels, streaks and goals | Simply Sing, Yousician, Vanido | Hidden difficulty levels only |
| Structured course path | Yousician, Singeo, 30 Day Singer | Missing |
| Ear training | SingTrue, [Vocalizer](https://singwell.eu/singing-apps/) | Missing |
| Choosable warm-up or routine length | Warm Me Up, SWIFTSCALES | Missing |
| Breath detection | Sing Sharp | Timed breath-out only |
| Posture and anatomy visuals | Erol Singer's Studio | Spoken posture cue only; visuals don't suit a car |
| Lessons or feedback from a real teacher | Singeo, Melody | Not possible in an app like this |
| Hands-free spoken coaching while you sing | Vocal Ease 2 (recorded, does not listen) | Built, and listens |
| Rotating cues you can rate | None found | Built |
| Playback of your own takes inside the lesson | Simply Sing (recording and playback of songs) | Built into the exercises |

## YouTube singing teachers

YouTube teachers win on one thing the app only partly has: you hear a real person make the sound, wrong and right, before you try it. I could not watch videos from here, so this section is based on the same teachers' written lessons and on reviews of their channels.

| What they do | Example | Idea for the app |
| --- | --- | --- |
| Explain, demonstrate, try, test, refine, in that order | [Singeo's nasality lesson](https://blog.singeo.com/how-to-stop-sounding-nasal/) | Give every technique block the same five steps, with a real demonstration |
| Exercise sounds that each have one job | [Ramsey Voice Studio](https://ramseyvoice.com/sing-without-straining/): lip trill to relax, "ng" and "gee" for the tongue, "mum" with a yawn for the larynx, a sad-sounding "no" or "nuh" to stop the voice flipping | Add these as exercises, each with its purpose said out loud |
| Scales that climb by half steps | Ramsey: 1.5-octave scales; [Talkalman daily drills](https://lessons.talkalmanmusic.com/blog/beginner-singing-warm-ups/): five-note scales, 5 to 8 keys up and down | A "climb" mode: the same short pattern, one half step higher each time, until it gets hard |
| Follow-along routines of a fixed length | [30 Day Singer, Eric Arceneaux](https://www.musicindustryhowto.com/best-singing-lessons-on-youtube/): daily routines and brief warm-ups; Talkalman: 8 drills in 5 to 10 minutes | Session presets: 5, 10 and 20 minutes |
| More ways to feel and fix nasality | Singeo: hold "hung", then "uh" opening to "ah" by dropping the jaw, and singing with puffed cheeks; [30 Day Singer](https://www.30daysinger.com/blog/stop-singing-with-a-nasally-voice): slow-motion gasp, breathe in on a "k"; [Performance High](https://performancehigh.net/tips-to-reduce-nasality-in-the-voice/): a finger's width between the teeth, a dopey "Yogi Bear" tone | Add as cues and exercises to the nasality block |
| Technique carried into a song | 30 Day Singer: sing the melody on "ah" or "mum", then put the words back | A transfer step after each technique block |
| A course with a path | 30 Day Singer: 30 daily lessons | A visible path of stages, so progress means more than a chart |
| Reaction and analysis of famous singers | 30 Day Singer, Tara Simon Studios | Not suited to a hands-free car app |

The syllable exercises and the half-step climb are the standard repertoire of these teachers, and the app has neither.

## Real singing audio

Yes for about half the topics: an openly licensed set of studio recordings by professional singers covers them, and the rest needs a singer to record them. Sixteen clips of one VocalSet baritone are in the app since 6 Oct (version 2026-10-06.2).

| Option | Covers | Does not cover | Licence | What it takes |
| --- | --- | --- | --- | --- |
| [VocalSet](https://zenodo.org/records/1442513): 20 professional singers (11 male, 9 female), 17 techniques, 10 hours | Lip trill; breathy against straight tone (clear tone); swell (messa di voce); vibrato; slow legato against fast articulated (smooth line); loud against soft; the five vowels on scales, arpeggios and long notes | Nasal against lifted, sing-ah, onsets, slides, register flips | CC BY 4.0: free to reuse and publish with credit | Done on 6 Oct: 16 clips of baritone m1. The full set is a 2.1 GB zip, not 637 MB as this document first said; only the 17 recordings needed were fetched, 16 MB |
| [GTSinger](https://arxiv.org/html/2409.13832v1): 20 professional singers, each phrase sung with and without a technique | Falsetto and mixed voice (registers), slides (glissando), breathy, vibrato | Nasal against lifted, sing-ah, onsets | CC BY-NC-SA 4.0: non-commercial only, and the clips stay under that licence | Picking single files from a large set; a second step after VocalSet |
| A voice teacher records the examples | Everything, sung for exactly these exercises, including nasal against lifted | Nothing | Yours, by agreement with the teacher | One paid lesson; about 25 short clips. You also get a real assessment of your voice |
| Links to YouTube lessons in the Guide | Everything, with explanation | Cannot play inside a session | Their videos, linked only | I pick one lesson per topic; for watching at home |
| Computer-generated singing | Unknown | Unknown | Varies | Not available to me here, and the quality is unproven |

VocalSet is in; my recommendation for the rest is a teacher for the nasality examples, because nasality is your main goal and no open recording covers it. The recordings were fetched through your computer, because my workspace cannot reach the download site; the 16 clips are also in your Music folder under road-voice-coach-clips.

## Backlog

Reliability and real examples come first, then teaching depth, then new content. Effort is my build time: S is under an hour, M a few hours, L a day or more.

| Priority | Item | Why | Effort | Status |
| --- | --- | --- | --- | --- |
| 1 | Confirm the 5 Oct listening fix on the road, and add a diagnostics page that logs every take: seconds listened, share of frames with a readable pitch, why it ended, noise level (page built in version 2026-10-06.3; the drive is still to do) | Reliability is the main weakness, and today I fix from your description alone | S | Needs Paul |
| 1 | Real singing examples cut from VocalSet | Demonstration is the biggest teaching gap, and you asked for it | M | Done |
| 1 | Session length and focus settings: 5, 10 or 20 minutes, which topics, how much nasality | Rounds are long; teachers recommend short sessions with one focus | S | Done |
| 1 | Natural coach voice from pre-generated speech | The phone voice is robotic and may stop when the app is in the background | L | Open |
| 1 | Test running in the background and with the phone locked | Unverified; the result decides whether a native Android wrapper is needed | S | Needs Paul |
| 1 | Backup and export of your data | Range, history, takes and starred cues live on one phone | S | Done |
| 1 | Automated tests in the repository | Each fix so far has risked breaking something else | M | In progress |
| 2 | Transfer step: after a technique block, sing a song phrase on "ah" or "mum" with the same cue, then with the words | Standard teaching practice; technique work does not reach songs yet | M | Done |
| 2 | Teacher-recorded examples for nasality, sing-ah and onsets | No open recording covers them | S | Needs Paul |
| 2 | More nasality exercises from teachers: hold "hung", "uh" opening to "ah", puffed cheeks, breathing in on a "k", dopey tone | Your main goal, and more variety | S | Done |
| 2 | Exercise sounds with a job ("ng", "gee", "mum", "nuh") and a half-step climb | Core teacher repertoire that the app lacks | M | Done |
| 2 | Check the nasality score against your ear: rate replayed takes at home, then keep or drop the score | The score has never been validated | M | Open |
| 2 | Weak-note map, and practice aimed at your weak notes | The best idea from other apps | M | Done |
| 2 | Session plan that picks one focus from your results and says so at the start | One focus per session | M | Open |
| 2 | Old take against new take, side by side | Hearing progress across weeks | S | Done |
| 2 | Singing-time limit, and a cool-down when you stop | Voice protection | S | Done |
| 3 | More songs, your own songs, and suggestions that fit your range | Content | L | Open |
| 3 | Ear training by voice | Common in other apps | M | Open |
| 3 | Home mode with a live pitch graph | Visual feedback is the kind that lasted in the research | M | Open |
| 3 | Streak and weekly goal | Regularity beats length | S | Done |
| 3 | Guide links to one YouTube lesson per topic | Real demonstrations for watching at home | S | Done |
| 3 | Steering-wheel buttons: test, then keep or remove | Never tested | S | Needs Paul |
| 3 | Split the single code file into modules | Maintainability | M | Open |
|  | Rhythm exercise | Did not work, and you are not interested |  | Dropped |
|  | Spoken voice commands and a conversational coach | Distracting while driving |  | Dropped |

Done in today's update, before this backlog: nasality moved into the technique rotation (two slots in nine, with two technique blocks per round), each technique block now explains what it is and why it matters, and more synthesized examples were added as a stopgap. Added later the same day: 16 real singing examples from VocalSet (version 2026-10-06.2).

## Sources

Pages opened for this document. The feedback and motor-learning studies behind the earlier design are in docs/research.md in the repository.

- Teaching practice: [Evidence-Based Voice Pedagogy (Ragan)](https://kariragan.com/defining-evidence-based-voice-pedagogy-a-new-framework/) · [How to practice singing (Voice Science)](https://www.voicescience.org/articles/how-to-practice-singing/) · [4-part practice plan (Singwell)](https://singwell.eu/how-to-practice-singing-at-home/) · [Practice at home (Pfitzner)](https://katrinapfitzner.com/how-to-practice-singing-at-home/)
- Teachers' lessons: [How to stop sounding nasal (Singeo)](https://blog.singeo.com/how-to-stop-sounding-nasal/) · [Stop singing with a nasally voice (30 Day Singer)](https://www.30daysinger.com/blog/stop-singing-with-a-nasally-voice) · [Tips to reduce nasality (Performance High)](https://performancehigh.net/tips-to-reduce-nasality-in-the-voice/) · [10 exercises to sing without straining (Ramsey Voice Studio)](https://ramseyvoice.com/sing-without-straining/) · [8 daily vocal drills (Talkalman)](https://lessons.talkalmanmusic.com/blog/beginner-singing-warm-ups/) · [Best singing lessons on YouTube (Music Industry How To)](https://www.musicindustryhowto.com/best-singing-lessons-on-youtube/)
- Apps: [Singing app reviews (Singwell)](https://singwell.eu/singing-apps/) · [Best singing apps (American Songwriter)](https://americansongwriter.com/best-singing-apps/) · [AI vocal coaches compared (Singing Carrots)](https://singingcarrots.com/blog/top-7-ai-vocal-coaches/)
- Recordings: [VocalSet on Zenodo](https://zenodo.org/records/1442513) · [VocalSet paper](https://ismir2018.ircam.fr/doc/pdfs/114_Paper.pdf) · [GTSinger paper](https://arxiv.org/html/2409.13832v1)
