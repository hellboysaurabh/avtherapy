// Audio: Ling sound playback (grown-up recording first, bundled sound file otherwise),
// reward/feedback effects, and spoken praise.

import { getRecording } from './store.js';

let ctx = null;
let master = null;
const active = new Set();
const decoded = new Map(); // cache key -> AudioBuffer | null

export function audioCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);
  }
  return ctx;
}

// Must be called from a user gesture (tap) on Android before anything can play.
export async function unlockAudio() {
  const c = audioCtx();
  if (c.state !== 'running') {
    try { await c.resume(); } catch { /* ignore */ }
  }
}

export function stopAll() {
  for (const node of active) {
    try { node.stop(); } catch { /* already stopped */ }
  }
  active.clear();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function track(node, done) {
  active.add(node);
  node.onended = () => { active.delete(node); done && done(); };
}

// Trims leading/trailing silence and brings every sound to the same peak level,
// so no picture is easier to pick just because its sound is louder or arrives sooner.
function tidy(buf) {
  const PAD = 0.05;
  const TARGET_PEAK = 0.85;
  const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
  let peak = 0;
  for (const d of chans) for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak === 0) return buf;
  const threshold = peak * 0.05;
  let first = buf.length;
  let last = 0;
  for (const d of chans) {
    for (let i = 0; i < d.length; i++) {
      if (Math.abs(d[i]) > threshold) { first = Math.min(first, i); last = Math.max(last, i); }
    }
  }
  const pad = Math.round(PAD * buf.sampleRate);
  const start = Math.max(0, first - pad);
  const end = Math.min(buf.length, last + pad);
  const gain = TARGET_PEAK / peak;
  const out = audioCtx().createBuffer(buf.numberOfChannels, end - start, buf.sampleRate);
  chans.forEach((d, c) => {
    const o = out.getChannelData(c);
    for (let i = 0; i < o.length; i++) o[i] = d[start + i] * gain;
  });
  return out;
}

// Decodes audio once and caches it. Keys: 'rec:<objectId>' for grown-up recordings,
// otherwise the URL of the bundled sound file.
async function loadBuffer(key, getBytes) {
  if (decoded.has(key)) return decoded.get(key);
  let buf = null;
  try {
    const bytes = await getBytes();
    if (bytes) buf = tidy(await audioCtx().decodeAudioData(bytes));
  } catch {
    buf = null;
  }
  decoded.set(key, buf);
  return buf;
}

export const recordingKey = (objectId) => `ling:${objectId}`;

function loadRecording(objectId) {
  return loadBuffer(`rec:${objectId}`, async () => {
    const blob = await getRecording(recordingKey(objectId));
    return blob && blob.arrayBuffer();
  });
}

function loadFile(url) {
  return loadBuffer(url, async () => {
    const res = await fetch(url);
    return res.ok ? res.arrayBuffer() : null;
  });
}

export function forgetRecording(objectId) {
  decoded.delete(`rec:${objectId}`);
}

export async function hasRecording(objectId) {
  return !!(await loadRecording(objectId));
}

// Decode the bundled sounds ahead of time so the first turn plays without delay.
export function preloadLing(objects) {
  return Promise.all(objects.map((o) => Promise.all([loadRecording(o.id), loadFile(o.audio)])));
}

function playBuffer(buf) {
  const src = audioCtx().createBufferSource();
  src.buffer = buf;
  src.connect(master);
  return new Promise((resolve) => {
    track(src, resolve);
    src.start();
  });
}

// Plays an object's Ling sound: the grown-up's own recording if there is one,
// otherwise the bundled sound file. Resolves when playback has finished.
export async function playLing(obj, { bundled = false } = {}) {
  const buf = (!bundled && await loadRecording(obj.id)) || await loadFile(obj.audio);
  if (buf) return playBuffer(buf);
}

// ---------- Reward & feedback effects ----------

function tone(freq, start, dur, { type = 'sine', vol = 0.3, slideTo = null } = {}) {
  const c = audioCtx();
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  track(o);
  o.start(start);
  o.stop(start + dur + 0.02);
}

export const sfx = {
  enabled: true,

  correct() {
    if (!this.enabled) return;
    const t = audioCtx().currentTime + 0.02;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(f, t + i * 0.1, 0.45, { vol: 0.25 });
      tone(f * 2, t + i * 0.1, 0.3, { type: 'triangle', vol: 0.06 });
    });
    for (let i = 0; i < 6; i++) tone(1800 + i * 260, t + 0.45 + i * 0.05, 0.18, { vol: 0.05 });
  },

  wrong() {
    if (!this.enabled) return;
    const t = audioCtx().currentTime + 0.02;
    tone(330, t, 0.28, { type: 'triangle', vol: 0.25, slideTo: 262 });
    tone(262, t + 0.28, 0.4, { type: 'triangle', vol: 0.22, slideTo: 196 });
  },

  pop() {
    if (!this.enabled) return;
    const t = audioCtx().currentTime + 0.01;
    tone(500, t, 0.12, { vol: 0.12, slideTo: 900 });
  },

  fanfare() {
    if (!this.enabled) return;
    const t = audioCtx().currentTime + 0.05;
    const notes = [523.25, 659.25, 783.99, 659.25, 783.99, 1046.5];
    const times = [0, 0.14, 0.28, 0.42, 0.56, 0.7];
    notes.forEach((f, i) => {
      tone(f, t + times[i], i === notes.length - 1 ? 0.9 : 0.25, { type: 'triangle', vol: 0.25 });
      tone(f / 2, t + times[i], 0.25, { vol: 0.12 });
    });
  },
};

// ---------- Spoken praise ----------

let voice = null;
function pickVoice() {
  if (voice || !('speechSynthesis' in window)) return voice;
  const voices = speechSynthesis.getVoices();
  voice = voices.find((v) => /^en[-_](IN|GB|US)/i.test(v.lang) && /female|woman/i.test(v.name))
    || voices.find((v) => /^en/i.test(v.lang))
    || null;
  return voice;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { voice = null; pickVoice(); };

export const speech = {
  enabled: true,
  say(text) {
    if (!this.enabled || !('speechSynthesis' in window)) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = 0.95;
      u.pitch = 1.3;
      const fallback = setTimeout(resolve, 900 + text.length * 90);
      u.onend = u.onerror = () => { clearTimeout(fallback); resolve(); };
      speechSynthesis.speak(u);
    });
  },
};
