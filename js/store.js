// Settings and progress live in localStorage; voice recordings live in IndexedDB.

const SETTINGS_KEY = 'lg.settings';
const HISTORY_KEY = 'lg.history';
const BEST_KEY = 'lg.best';

const DEFAULTS = {
  answerSeconds: 5,
  rounds: 10,
  praiseVoice: true,
  effects: true,
  soundMap: {},        // objectId -> ling sound id (overrides the default)
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export function getSettings() {
  return { ...DEFAULTS, ...readJSON(SETTINGS_KEY, {}) };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  writeJSON(SETTINGS_KEY, next);
  return next;
}

// ---- Progress history: one entry per finished game ----
export function getHistory() {
  return readJSON(HISTORY_KEY, []);
}

export function addHistory(entry) {
  const list = getHistory();
  list.push(entry);
  writeJSON(HISTORY_KEY, list.slice(-500));
}

export function clearHistory() {
  writeJSON(HISTORY_KEY, []);
  writeJSON(BEST_KEY, {});
}

export function getBest(gameId, level) {
  return readJSON(BEST_KEY, {})[`${gameId}:${level}`] || 0;
}

export function setBest(gameId, level, stars) {
  const all = readJSON(BEST_KEY, {});
  const key = `${gameId}:${level}`;
  if ((all[key] || 0) < stars) {
    all[key] = stars;
    writeJSON(BEST_KEY, all);
  }
}

// ---- Recordings (IndexedDB) ----
let dbPromise;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('listen-and-play', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('recordings');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('recordings', mode);
    const req = fn(t.objectStore('recordings'));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
  });
}

export async function getRecording(key) {
  try { return (await tx('readonly', (s) => s.get(key))) || null; } catch { return null; }
}

export function putRecording(key, blob) {
  return tx('readwrite', (s) => s.put(blob, key));
}

export function deleteRecording(key) {
  return tx('readwrite', (s) => s.delete(key));
}
