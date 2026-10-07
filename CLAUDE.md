# Road Voice Coach

A hands-free singing coach for the car, built for one user, Paul. He presses Start when the trip begins and never touches the screen again; the coach talks, plays examples, listens through the phone's microphone and gives spoken feedback. Live at https://pdonkers.github.io/road-voice-coach/ (GitHub Pages from `main`), installed on his Android phone as a web app.

## Read first

- `docs/research.md`: requirements, what the app contains now, the research behind it.
- `docs/changelog.md`: what changed when, what Paul reported after each drive, what is still unverified.
- `BACKLOG.md`: assessment of the app and the prioritized list of planned work.
- `tests/README.md`: how to run the checks.

## Where things are

- `index.html`: the markup only. `css/app.css`: the styles. `js/`: the script as seven plain classic scripts loaded in this order and sharing globals (`core.js` helpers, pitch detection, analysis, storage, state; `audio.js` audio in and out, the own-voice bank; `coach.js` practice days, limit, range, one repetition, cues; `blocks.js` the exercise blocks, ear training, songs; `session.js` diagnostics, session plan, session, start and stop, hands-free controls; `home.js` home practice; `pages.js` progress, guide, backup, settings). `sw.js`: service worker. `audio/`: real singing clips, with `audio/CREDITS.md`.
- `tests/`: working test scripts and simulated microphone recordings.

## After every change to the app

1. Run `npm test` (every script in `tests/`, about 30 minutes; `npm run test:quick` skips `blocks.js` and the 20-minute length run, about 22 minutes, then run the scripts the change touches, and always `blocks.js`, a full pass through every block with no page errors). The same run happens on GitHub Actions after every push to `main`; check that it is green.
2. Raise the version label on the home screen in `index.html` (`Version YYYY-MM-DD.N`). Paul uses it to see which build his phone has loaded.
3. If the list of files to cache changed (a file added to `css/` or `js/` too), update the list and raise `CACHE` in `sw.js`.
4. Commit and push to `main`. GitHub Pages rebuilds in about a minute. Check that the live page shows the new version label; fetch it with the web fetch tool if the shell cannot reach github.io.
5. Add an entry to `docs/changelog.md`, and bring `docs/research.md` ("Build notes") and `BACKLOG.md` up to date.

## Rules

- Say plainly what was tested only in a headless browser and not on the phone or in the car. Most listening behaviour has only been simulated; Paul's reports from real drives are the real test, so record each one in the changelog.
- Nothing may need the screen or hands during a session. Spoken lines are English, short, and one instruction at a time.
- Balance: nasality is Paul's main goal but must not crowd out the other technique work. No rhythm practice.
- Only add audio that is openly licensed for reuse (for example CC BY), with credit in `audio/CREDITS.md` and on the Guide page.
- The repo is public. Keep personal details, file paths on Paul's computer and anything private out of it.
- Backlog: `BACKLOG.md` mirrors the Claude Doc linked in `docs/changelog.md`. If the Claude Docs tools are available, make each change in the doc and the same change in `BACKLOG.md` (a full re-export is large; use it only after big edits). If they are not, edit `BACKLOG.md` and note in the changelog that the doc is behind.
- Use judgment rather than asking; Paul prefers few questions. Ask when a decision is really his: publishing something new, anything that costs money, anything that needs his phone, car or computer.
- The cloud workspace reaches GitHub and package registries only. Other downloads have to go through the browser on Paul's computer, with his permission.
