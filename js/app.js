import { GAMES } from './games/index.js';
import { LING_OBJECTS, LING_SOUNDS } from './data/ling.js';
import { icons } from './icons.js';
import { mascotSVG, setMood } from './mascot.js';
import {
  unlockAudio, stopAll, playLing, forgetRecording, hasRecording, recordingKey,
} from './audio.js';
import {
  getSettings, saveSettings, getHistory, clearHistory, putRecording, deleteRecording,
} from './store.js';

const root = document.getElementById('app');
let unmount = () => {};

// Android needs a tap before audio can play.
addEventListener('pointerdown', unlockAudio, { capture: true });

const app = {
  goHome: showHome,
};

function swap() {
  unmount();
  unmount = () => {};
  stopAll();
}

// ---------------- Home ----------------
function showHome() {
  swap();
  root.innerHTML = `
    <section class="screen">
      <div class="home-head">
        <div class="mascot-wrap">${mascotSVG()}</div>
        <h1 class="title">Listen &amp; Play</h1>
        <div class="spacer" style="flex:1"></div>
        <button class="round-btn gate-btn" aria-label="Grown-ups: press and hold">
          <span class="ring"></span>${icons.gear}
        </button>
      </div>
      <div class="home-grid">
        ${GAMES.map((g) => g.locked ? `
          <div class="game-tile locked">
            <div class="lock">🔒</div>
            <div class="tile-name">${g.name}</div>
            <div class="tile-sub">${g.sub}</div>
          </div>` : `
          <button class="game-tile" data-game="${g.id}" style="--tile:${g.color}">
            <div class="tile-art">${g.art.map((src) => `<div><img src="${src}" alt=""></div>`).join('')}</div>
            <div class="tile-name">${g.name}</div>
            <div class="tile-sub">${g.sub}</div>
          </button>`).join('')}
      </div>
      <div class="hint">Grown-ups: press and hold ⚙ for settings and progress</div>
    </section>`;

  root.querySelectorAll('[data-game]').forEach((el) => {
    el.onclick = () => openGame(GAMES.find((g) => g.id === el.dataset.game));
  });
  const idle = setInterval(() => setMood(root, Math.random() < 0.5 ? 'happy' : 'idle'), 6000);
  const releaseGate = holdToOpen(root.querySelector('.gate-btn'), showParent);
  unmount = () => { clearInterval(idle); releaseGate(); };
}

async function openGame(game) {
  swap();
  const mod = await game.load();
  unmount = mod.mount(root, app) || (() => {});
}

// A press-and-hold button so children don't wander into settings.
function holdToOpen(btn, onOpen, ms = 1500) {
  let raf = 0;
  let start = 0;
  const ring = btn.querySelector('.ring');
  const reset = () => { cancelAnimationFrame(raf); ring.style.setProperty('--p', 0); };
  const tick = (now) => {
    const p = Math.min(100, ((now - start) / ms) * 100);
    ring.style.setProperty('--p', p);
    if (p >= 100) { reset(); onOpen(); } else raf = requestAnimationFrame(tick);
  };
  btn.onpointerdown = (e) => { e.preventDefault(); start = performance.now(); raf = requestAnimationFrame(tick); };
  btn.onpointerup = btn.onpointerleave = btn.onpointercancel = reset;
  btn.oncontextmenu = (e) => e.preventDefault();
  return reset;
}

// ---------------- Grown-ups area ----------------
function showParent() {
  swap();
  const s = getSettings();
  root.innerHTML = `
    <section class="screen parent">
      <div class="topbar">
        <button class="round-btn" data-act="home" aria-label="Home">${icons.home}</button>
        <h2 class="subtitle">Grown-ups</h2>
      </div>

      <div class="panel">
        <h3>Game settings</h3>
        <div class="set-row">
          <label for="secs">Time to answer (after the sound ends)</label>
          <input id="secs" type="range" min="3" max="10" step="1" value="${s.answerSeconds}">
          <span class="val" id="secs-val">${s.answerSeconds} s</span>
        </div>
        <div class="set-row">
          <label>Turns per game</label>
          <div class="seg" id="rounds">
            ${[5, 10, 15, 20].map((n) => `<button data-n="${n}" class="${n === s.rounds ? 'on' : ''}">${n}</button>`).join('')}
          </div>
        </div>
        <div class="set-row">
          <label>Spoken praise ("Well done!")</label>
          <button class="toggle ${s.praiseVoice ? 'on' : ''}" data-key="praiseVoice" aria-label="Spoken praise"></button>
        </div>
        <div class="set-row">
          <label>Reward sounds (chimes)</label>
          <button class="toggle ${s.effects ? 'on' : ''}" data-key="effects" aria-label="Reward sounds"></button>
        </div>
      </div>

      <div class="panel">
        <h3>Ling sounds</h3>
        <p>Each picture plays its bundled sound file. You can replace a sound with your own voice using Record
        (about 1-2 seconds, normal loudness, in a quiet room); ✕ goes back to the bundled file.</p>
        <div id="sounds"></div>
      </div>

      <div class="panel">
        <h3>Progress</h3>
        <div id="stats"></div>
        <div class="set-row" style="justify-content:flex-end">
          <button class="mini-btn" id="clear">Clear progress</button>
        </div>
      </div>
    </section>`;

  root.querySelector('[data-act=home]').onclick = showHome;

  const secs = root.querySelector('#secs');
  secs.oninput = () => {
    root.querySelector('#secs-val').textContent = `${secs.value} s`;
    saveSettings({ answerSeconds: Number(secs.value) });
  };
  root.querySelectorAll('#rounds button').forEach((b) => {
    b.onclick = () => {
      saveSettings({ rounds: Number(b.dataset.n) });
      root.querySelectorAll('#rounds button').forEach((x) => x.classList.toggle('on', x === b));
    };
  });
  root.querySelectorAll('.toggle').forEach((t) => {
    t.onclick = () => {
      const on = !t.classList.contains('on');
      t.classList.toggle('on', on);
      saveSettings({ [t.dataset.key]: on });
    };
  });
  root.querySelector('#clear').onclick = () => {
    if (confirm('Clear all saved progress and stars?')) { clearHistory(); renderStats(); }
  };

  const rec = { recorder: null, stream: null, timer: 0 };
  renderSounds(rec);
  renderStats();
  unmount = () => stopRecording(rec, true);
}

function renderSounds(rec) {
  const box = root.querySelector('#sounds');
  const map = getSettings().soundMap;
  box.innerHTML = LING_OBJECTS.map((o) => {
    const sound = map[o.id] || o.sound;
    return `
      <div class="sound-row" data-id="${o.id}">
        <div class="thumb"><img src="${o.img}" alt=""></div>
        <div class="meta">
          <b>${o.name}</b>
          <select aria-label="Sound for ${o.name}">
            ${Object.values(LING_SOUNDS).map((ls) =>
              `<option value="${ls.id}" ${ls.id === sound ? 'selected' : ''}>${ls.label}  ${ls.ipa}  (${ls.hint})</option>`).join('')}
          </select>
          <span class="src-tag">…</span>
        </div>
        <div class="actions">
          <button class="mini-btn" data-act="play" aria-label="Play">${icons.play}</button>
          <button class="mini-btn rec" data-act="rec">● Record</button>
          <button class="mini-btn" data-act="del" aria-label="Delete recording">✕</button>
        </div>
      </div>`;
  }).join('');

  box.querySelectorAll('.sound-row').forEach((row) => {
    const obj = LING_OBJECTS.find((o) => o.id === row.dataset.id);
    const refresh = async () => {
      const has = await hasRecording(obj.id);
      const tag = row.querySelector('.src-tag');
      tag.textContent = has ? '✓ Your recording' : 'Sound file';
      tag.classList.toggle('rec', has);
      row.querySelector('[data-act=del]').disabled = !has;
    };
    refresh();

    row.querySelector('select').onchange = (e) => {
      const soundMap = { ...getSettings().soundMap, [obj.id]: e.target.value };
      if (soundMap[obj.id] === obj.sound) delete soundMap[obj.id];
      saveSettings({ soundMap });
      refresh();
    };
    row.querySelector('[data-act=play]').onclick = async () => {
      stopAll();
      await playLing(obj);
    };
    row.querySelector('[data-act=del]').onclick = async () => {
      await deleteRecording(recordingKey(obj.id));
      forgetRecording(obj.id);
      refresh();
      playLing(obj);
    };
    const recBtn = row.querySelector('[data-act=rec]');
    recBtn.onclick = async () => {
      if (rec.recorder) {
        stopRecording(rec);
        return;
      }
      stopAll();
      try {
        await startRecording(rec, recBtn, async (blob) => {
          await putRecording(recordingKey(obj.id), blob);
          forgetRecording(obj.id);
          await refresh();
          playLing(obj);
        });
      } catch (err) {
        alert('Could not use the microphone. Please allow microphone access for this app.\n\n' + err.message);
      }
    };
  });
}

async function startRecording(rec, btn, onDone) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
  });
  const chunks = [];
  const recorder = new MediaRecorder(stream);
  rec.recorder = recorder;
  rec.stream = stream;
  rec.btn = btn;
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    if (!rec.discard && chunks.length) onDone(new Blob(chunks, { type: recorder.mimeType }));
    rec.discard = false;
  };
  recorder.start();
  btn.classList.add('on');
  btn.textContent = '■ Stop';
  // Recordings are short on purpose: one sound, about 1-2 seconds.
  rec.timer = setTimeout(() => stopRecording(rec), 3000);
}

function stopRecording(rec, discard = false) {
  clearTimeout(rec.timer);
  if (!rec.recorder) return;
  rec.discard = discard;
  if (rec.recorder.state !== 'inactive') rec.recorder.stop();
  if (rec.btn) {
    rec.btn.classList.remove('on');
    rec.btn.textContent = '● Record';
  }
  rec.recorder = null;
}

function renderStats() {
  const box = root.querySelector('#stats');
  const games = getHistory().filter((h) => h.game === 'ling6');
  if (!games.length) {
    box.innerHTML = '<p>No games played yet.</p>';
    return;
  }
  const per = {};
  for (const g of games) {
    for (const t of g.trials) {
      const p = (per[t.sound] ||= { n: 0, ok: 0, late: 0, ms: [] });
      p.n++;
      if (t.correct) p.ok++;
      if (t.timedOut) p.late++;
      if (t.correct && t.ms != null) p.ms.push(t.ms);
    }
  }
  const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length / 1000).toFixed(1) + ' s' : '-');
  const recent = games.slice(-8).reverse();
  box.innerHTML = `
    <table class="stats">
      <tr><th>Sound</th><th>Correct</th><th></th><th>No answer</th><th>Avg. time</th></tr>
      ${Object.values(LING_SOUNDS).map((ls) => {
        const p = per[ls.id];
        if (!p) return `<tr><td><b>${ls.label}</b> ${ls.ipa}</td><td colspan="4">-</td></tr>`;
        const pct = Math.round((p.ok / p.n) * 100);
        return `<tr>
          <td><b>${ls.label}</b> ${ls.ipa}</td>
          <td>${p.ok}/${p.n} (${pct}%)</td>
          <td><div class="bar"><div style="width:${pct}%"></div></div></td>
          <td>${p.late}</td>
          <td>${avg(p.ms)}</td>
        </tr>`;
      }).join('')}
    </table>
    <p style="margin-top:14px"><b>Recent games</b></p>
    <table class="stats">
      <tr><th>When</th><th>Pictures</th><th>Score</th><th>Stars</th></tr>
      ${recent.map((g) => `<tr>
        <td>${new Date(g.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
        <td>${g.level}</td>
        <td>${g.correct}/${g.trials.length}</td>
        <td style="color:#ffc93c">${'★'.repeat(g.stars)}</td>
      </tr>`).join('')}
    </table>`;
}

showHome();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
