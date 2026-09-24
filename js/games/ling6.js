// Game 1: Ling Six Sounds.
// The child hears one Ling sound and taps the matching picture among 2-6 pictures.

import { LING_OBJECTS } from '../data/ling.js';
import { playLing, preloadLing, sfx, speech, stopAll } from '../audio.js';
import { burst, rain, clearFx } from '../fx.js';
import { mascotSVG, setMood } from '../mascot.js';
import { icons } from '../icons.js';
import { getSettings, addHistory, getBest, setBest } from '../store.js';

const GAME_ID = 'ling6';
const LEVEL_COLORS = { 2: '#34c77b', 3: '#4dabf7', 4: '#8e7dff', 5: '#ff8a5b', 6: '#ff6b6b' };
const TEST_MODE = new URLSearchParams(location.search).has('test');
const PRAISE = ['Well done!', 'Great listening!', 'Super!', 'You got it!', 'Wonderful!', 'Yay!'];

const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mount(root, app) {
  let alive = true;
  const timeouts = new Set();
  let cleanupScreen = () => {};

  const later = (ms) => new Promise((resolve) => {
    const id = setTimeout(() => { timeouts.delete(id); resolve(); }, ms);
    timeouts.add(id);
  });

  // Objects with the sound chosen in the Grown-ups area; one object per sound.
  function objects() {
    const map = getSettings().soundMap;
    const seen = new Set();
    return LING_OBJECTS
      .map((o) => ({ ...o, sound: map[o.id] || o.sound }))
      .filter((o) => (seen.has(o.sound) ? false : seen.add(o.sound)));
  }

  function show(html) {
    cleanupScreen();
    cleanupScreen = () => {};
    stopAll();
    clearFx();
    root.innerHTML = html;
  }

  // ---------------- Level select ----------------
  function showLevels() {
    const max = objects().length;
    const levels = [2, 3, 4, 5, 6].filter((n) => n <= max);
    show(`
      <section class="screen">
        <div class="topbar">
          <button class="round-btn" data-act="home" aria-label="Home">${icons.home}</button>
          <h2 class="subtitle">Ling Sounds</h2>
          <div class="spacer"></div>
          <button class="big-btn ghost" data-act="explore">Explore sounds</button>
        </div>
        <div class="level-body">
          <h1 class="title">How many pictures?</h1>
          <div class="level-row">
            ${levels.map((n, i) => {
              const best = getBest(GAME_ID, n);
              return `
              <button class="level-btn" data-level="${n}" style="--lvl:${LEVEL_COLORS[n]}; animation-delay:${i * 80}ms">
                <span class="num">${n}</span>
                <span class="dots">${'<i></i>'.repeat(n)}</span>
                <span class="stars">${'★'.repeat(best)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>
      </section>`);

    root.querySelector('[data-act=home]').onclick = () => app.goHome();
    root.querySelector('[data-act=explore]').onclick = showExplore;
    root.querySelectorAll('[data-level]').forEach((b) => {
      b.onclick = () => startGame(Number(b.dataset.level));
    });
  }

  // ---------------- Explore: tap a picture to hear its sound ----------------
  function showExplore() {
    const list = objects();
    preloadLing(list);
    show(`
      <section class="screen">
        <div class="topbar">
          <button class="round-btn" data-act="back" aria-label="Back">${icons.back}</button>
          <h2 class="subtitle">Tap a picture to hear its sound</h2>
        </div>
        <div class="stage">
          <div class="mascot-dock"><div class="bubble"></div>${mascotSVG()}</div>
          <div class="board"></div>
        </div>
      </section>`);
    root.querySelector('[data-act=back]').onclick = showLevels;
    const board = root.querySelector('.board');
    const bubble = root.querySelector('.bubble');
    board.innerHTML = list.map((o, i) => cardHTML(o, i)).join('');
    cleanupScreen = fitCards(board, list.length);

    board.querySelectorAll('.card').forEach((el) => {
      el.onclick = async () => {
        const o = list.find((x) => x.id === el.dataset.id);
        stopAll();
        board.querySelectorAll('.card').forEach((c) => c.classList.remove('correct'));
        void el.offsetWidth;
        el.classList.add('correct');
        setMood(root, 'listen');
        bubble.textContent = o.name;
        bubble.classList.add('show');
        await playLing(o);
        if (!alive) return;
        setMood(root, 'idle');
      };
    });
  }

  // ---------------- The game ----------------
  function startGame(level) {
    const settings = getSettings();
    sfx.enabled = settings.effects;
    speech.enabled = settings.praiseVoice;
    const all = objects();
    preloadLing(all);
    const rounds = settings.rounds;
    const answerMs = settings.answerSeconds * 1000;
    const usage = Object.fromEntries(all.map((o) => [o.id, 0]));
    const results = [];
    let trial = 0;
    let target = null;
    let answering = false;
    let playing = false;
    let replays = 0;
    let timerRaf = 0;
    let timerStart = 0;

    show(`
      <section class="screen">
        <div class="play-top">
          <button class="round-btn" data-act="back" aria-label="Back">${icons.back}</button>
          <div class="progress">${'<i></i>'.repeat(rounds)}</div>
          <button class="listen-btn" aria-label="Listen again">${icons.ear}</button>
        </div>
        <div class="timer"><div></div></div>
        <div class="stage">
          <div class="mascot-dock"><div class="bubble"></div>${mascotSVG()}</div>
          <div class="board"></div>
        </div>
      </section>`);

    const board = root.querySelector('.board');
    const bubble = root.querySelector('.bubble');
    const listenBtn = root.querySelector('.listen-btn');
    const timerEl = root.querySelector('.timer');
    const dots = root.querySelectorAll('.progress i');
    root.querySelector('[data-act=back]').onclick = showLevels;
    listenBtn.onclick = () => {
      if (answering && !playing) { replays++; present(); }
    };
    let unfit = () => {};
    cleanupScreen = () => { cancelAnimationFrame(timerRaf); unfit(); };

    const say = (text) => {
      bubble.textContent = text;
      bubble.classList.toggle('show', !!text);
    };

    // Target = least-used object (never the same twice in a row), plus random distractors.
    function chooseSet() {
      const prev = target && target.id;
      const pool = all.filter((o) => o.id !== prev || all.length === 1);
      const minUse = Math.min(...pool.map((o) => usage[o.id]));
      const t = pick(pool.filter((o) => usage[o.id] === minUse));
      usage[t.id]++;
      const others = shuffle(all.filter((o) => o.id !== t.id)).slice(0, level - 1);
      return { t, set: shuffle([t, ...others]) };
    }

    function setTimer(frac) {
      timerEl.firstElementChild.style.setProperty('--t', frac);
      timerEl.classList.toggle('low', frac < 0.35);
    }

    function startTimer() {
      timerStart = performance.now();
      const tick = (now) => {
        const left = 1 - (now - timerStart) / answerMs;
        setTimer(Math.max(0, left));
        if (left <= 0) timeUp();
        else timerRaf = requestAnimationFrame(tick);
      };
      timerRaf = requestAnimationFrame(tick);
    }

    function stopTimer() {
      cancelAnimationFrame(timerRaf);
    }

    async function nextTrial() {
      if (!alive) return;
      if (trial >= rounds) return finish();
      const { t, set } = chooseSet();
      target = t;
      replays = 0;
      if (TEST_MODE) board.dataset.target = t.id;
      dots.forEach((d, i) => d.classList.toggle('now', i === trial));
      setMood(root, 'idle');
      say('');
      setTimer(1);
      timerEl.classList.remove('low');
      unfit();
      board.innerHTML = set.map((o, i) => cardHTML(o, i)).join('');
      unfit = fitCards(board, set.length);
      board.querySelectorAll('.card').forEach((el) => {
        el.onclick = () => answer(el);
      });
      await later(650 + set.length * 90);
      if (!alive) return;
      answering = true;
      present();
    }

    // Play the target sound; the answer clock starts when the sound ends.
    async function present() {
      stopTimer();
      setTimer(1);
      playing = true;
      listenBtn.classList.add('playing');
      setMood(root, 'listen');
      say('Listen...');
      await playLing(target);
      playing = false;
      if (!alive || !answering) return;
      listenBtn.classList.remove('playing');
      setMood(root, 'idle');
      say('');
      startTimer();
    }

    function record(chosenId, timedOut) {
      results.push({
        sound: target.sound,
        object: target.id,
        chosen: chosenId,
        correct: chosenId === target.id,
        timedOut,
        replays,
        ms: timedOut || playing ? null : Math.round(performance.now() - timerStart),
      });
    }

    function lockCards() {
      answering = false;
      stopTimer();
      stopAll();
      playing = false;
      listenBtn.classList.remove('playing');
      board.querySelectorAll('.card').forEach((c) => c.classList.add('locked'));
    }

    function addBadge(el, good) {
      el.insertAdjacentHTML('beforeend', `<span class="badge ${good ? 'good' : 'bad'}">${good ? '✓' : '✗'}</span>`);
    }

    async function showCorrectAnswer() {
      const right = board.querySelector(`.card[data-id="${target.id}"]`);
      board.querySelectorAll('.card').forEach((c) => {
        c.classList.remove('wrong');
        c.classList.toggle('dim', c !== right);
      });
      right.classList.add('reveal');
      setMood(root, 'listen');
      say('This one!');
      await later(500);
      if (!alive) return;
      await playLing(target);
      if (!alive) return;
      await later(1300);
    }

    async function answer(el) {
      if (!answering) return;
      const chosen = el.dataset.id;
      record(chosen, false);
      lockCards();
      const good = chosen === target.id;
      dots[trial].classList.add(good ? 'win' : 'miss');

      if (good) {
        el.classList.add('correct');
        addBadge(el, true);
        board.querySelectorAll('.card').forEach((c) => c !== el && c.classList.add('dim'));
        const r = el.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
        sfx.correct();
        setMood(root, 'happy');
        const praise = pick(PRAISE);
        say(praise);
        await later(450);
        if (!alive) return;
        await Promise.all([speech.say(praise), later(1800)]);
      } else {
        el.classList.add('wrong');
        addBadge(el, false);
        sfx.wrong();
        setMood(root, 'sad');
        say('Oops!');
        await later(1100);
        if (!alive) return;
        await showCorrectAnswer();
      }
      if (!alive) return;
      trial++;
      nextTrial();
    }

    async function timeUp() {
      if (!answering) return;
      record(null, true);
      lockCards();
      dots[trial].classList.add('miss');
      setMood(root, 'sad');
      say("Time's up!");
      await later(900);
      if (!alive) return;
      await showCorrectAnswer();
      if (!alive) return;
      trial++;
      nextTrial();
    }

    function finish() {
      const correct = results.filter((r) => r.correct).length;
      const pct = correct / results.length;
      const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
      addHistory({ game: GAME_ID, level, rounds, correct, stars, at: Date.now(), trials: results });
      setBest(GAME_ID, level, stars);
      showResults(level, correct, results.length, stars);
    }

    nextTrial();
  }

  // ---------------- Results ----------------
  function showResults(level, correct, total, stars) {
    const msg = stars === 3 ? 'Amazing listening!' : stars === 2 ? 'Great job!' : 'Good try!';
    show(`
      <section class="screen">
        <div class="result-body">
          <div class="big-stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}">★</span>`).join('')}</div>
          <h1 class="title">${msg}</h1>
          <div class="result-score">${correct} out of ${total}</div>
          <div class="mascot-wrap">${mascotSVG()}</div>
          <div class="btn-row">
            <button class="big-btn" data-act="again">Play again</button>
            <button class="big-btn alt" data-act="levels">Change level</button>
            <button class="big-btn ghost" data-act="home">Home</button>
          </div>
        </div>
      </section>`);
    setMood(root, 'happy');
    sfx.fanfare();
    rain();
    speech.say(msg);
    root.querySelector('[data-act=again]').onclick = () => startGame(level);
    root.querySelector('[data-act=levels]').onclick = showLevels;
    root.querySelector('[data-act=home]').onclick = () => app.goHome();
  }

  showLevels();

  return () => {
    alive = false;
    timeouts.forEach(clearTimeout);
    cleanupScreen();
    stopAll();
    clearFx();
  };
}

function cardHTML(o, i) {
  return `<button class="card" data-id="${o.id}" style="--i:${i}" aria-label="${o.name}"><img src="${o.img}" alt=""></button>`;
}

// Size the cards so n of them fill the board as large as possible.
const BOARD_PAD = 12;
function fitCards(board, n) {
  const layout = () => {
    const w = board.clientWidth - BOARD_PAD * 2;
    const h = board.clientHeight - BOARD_PAD * 2;
    const gap = Math.max(14, Math.min(32, Math.min(w, h) * 0.04));
    let best = 0;
    let bestCols = n;
    let bestScore = 0;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const size = Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows);
      // Prefer tidy grids (2x2 over 3+1) unless the cards would get much smaller.
      const score = size * (1 - 0.08 * (rows * cols - n));
      if (score > bestScore) { bestScore = score; best = size; bestCols = cols; }
    }
    const size = Math.floor(Math.min(best - 2, 420));
    // Squeeze the sides so the cards wrap into exactly bestCols columns.
    const rowW = bestCols * size + (bestCols - 1) * gap;
    board.style.setProperty('--gap', `${gap}px`);
    board.style.setProperty('--size', `${size}px`);
    board.style.padding = `${BOARD_PAD}px ${Math.max(BOARD_PAD, (w - rowW) / 2 + BOARD_PAD - 1)}px`;
  };
  const ro = new ResizeObserver(layout);
  ro.observe(board);
  layout();
  return () => ro.disconnect();
}
