// Network first, so updates arrive; falls back to the saved copy when there is no signal.
const CACHE = "rvc-v2";
const CLIPS = ["lip-trill","breathy","clear","swell","vibrato","smooth","separate","vowel-ah","vowel-eh","vowel-ee","vowel-oh","vowel-oo","soft","full","song-plain","song-vibrato"].map(n => `audio/${n}.mp3`);
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "manifest.webmanifest", "icon-192.png", ...CLIPS])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
