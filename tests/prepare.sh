#!/bin/sh
# Decode the simulated microphone recordings to WAV (Chromium's fake microphone needs WAV) and make the output folder.
cd "$(dirname "$0")" && mkdir -p out
for f in audio/*.opus; do ffmpeg -y -loglevel error -i "$f" -ar 48000 -ac 1 -c:a pcm_s16le "${f%.opus}.wav"; done
ls -la audio/*.wav
