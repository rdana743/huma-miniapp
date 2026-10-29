/* Вкладка «Игра»: тренажёр по маркетингу в стиле Duolingo.
   Уроки, опыт, уровни, серия дней, достижения, опрос дня, топ недели. Всё хранится на сайте (api /game). */
(function () {
  const H = window.HUMA_CORE;
  if (!H) return;
  const { esc, haptic, track, flush, store } = H;
  const tz = new Date().getTimezoneOffset();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (n) => Number(n || 0).toLocaleString('ru-RU');
  const plural = (x, one, few, many) => { const a = x % 10, b = x % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };

  let S = null; // состояние с сервера
  const call = (action, extra = {}) => H.api('/game', { action, tz, ...extra });

  const icon = {
    flame: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><defs><linearGradient id="gf" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#F90402"/><stop offset="1" stop-color="#FF8A3D"/></linearGradient></defs><path fill="url(#gf)" d="M12 2c1 3.2-.6 4.8-2 6.4C8.6 10 7 11.6 7 14.5A5 5 0 0 0 12 20a5 5 0 0 0 5-5.4c-.2-2.3-1.5-3.7-2.4-4.8.1 1.6-.4 2.7-1.4 3.2.4-3.6-.4-7.7-1.2-11z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M13.5 2 4 14h7l-1.5 8L20 10h-7z"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    left: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // ---------- главный экран вкладки ----------
  async function page() {
    track('game_open');
    L = null;
    document.body.classList.remove('g-lesson-on');
    if (!H.inMessenger) {
      return H.shell(`${H.head()}
        <div class="g-empty"><img class="float" src="img/arrow.webp" alt="" />
          <h2 class="t-h1">Игра по маркетингу</h2>
          <p class="t-lead">Уроки на 2 минуты, опыт, серия дней и топ недели. Откройте приложение из бота HUMA в MAX или Telegram, чтобы играть.</p></div>`);
    }
    if (!S) H.shell(`${H.head()}${skeleton()}`);
    try {
      S = await call('state');
      if (H.tab !== 'game') return;
      S.profile ? renderHome() : renderTracks();
    } catch (e) {
      if (H.tab !== 'game') return;
      H.shell(`${H.head()}<div class="g-empty"><h2 class="t-h2">Не получилось загрузить игру</h2><p class="t-lead">${esc(e.message)}</p><button class="btn" data-g="reload">Попробовать ещё раз</button></div>`);
      bind();
    }
  }

  const skeleton = () => `<div class="g-skel"><span></span><span></span><span></span></div><div class="g-skel g-skel--big"></div><div class="g-skel g-skel--path"></div>`;

  function renderTracks(changing = false) {
    H.shell(`
      ${H.head()}
      <div class="g-intro">
        <h1 class="t-h1">${changing ? 'Сменить путь' : 'Кто вы?'}</h1>
        <p class="t-lead">Подберём уроки под вашу роль. Путь можно сменить в любой момент, опыт сохранится.</p>
      </div>
      <div class="g-tracks">
        ${S.tracks.map((t, i) => `
          <button class="g-track ${S.profile?.track === t.id ? 'is-on' : ''}" data-track="${t.id}" style="animation-delay:${i * 80}ms">
            <img class="float" src="${t.img}" alt="" />
            <span><b>${esc(t.title)}</b><span>${esc(t.desc)}</span></span>
            ${icon.right}
          </button>`).join('')}
      </div>
      ${changing ? '<button class="btn btn--line" data-g="home">Оставить как есть</button>' : ''}`);
    bind();
  }

  function nextLesson() {
    for (const u of S.units) for (const l of u.lessons) if (!l.done && !l.locked) return { ...l, unit: u.title };
    return null;
  }

  function renderHome() {
    const p = S.profile;
    const lv = p.level;
    const lvPct = lv.next ? Math.round(((p.xp - lv.from) / (lv.next - lv.from)) * 100) : 100;
    const goalPct = Math.min(100, Math.round((p.todayXp / p.goal) * 100));
    const next = nextLesson();
    const R = 26, L = 2 * Math.PI * R;

    H.shell(`
      ${H.head()}
      <div class="g-stats">
        <span class="g-chip ${p.playedToday ? 'is-hot' : ''}" title="Серия дней">${icon.flame}<b>${p.streak}</b></span>
        <span class="g-chip g-chip--xp" title="Опыт">${icon.bolt}<b>${fmt(p.xp)}</b></span>
        <span class="g-chip g-chip--lv"><b>${esc(lv.title)}</b></span>
      </div>

      <section class="g-hero on-dark">
        <div class="g-hero__top">
          <div>
            <span class="t-small">Уровень ${lv.index + 1} · ${esc(p.trackTitle)}</span>
            <h2 class="t-h1">${esc(lv.title)}</h2>
          </div>
          <div class="g-ring ${goalPct >= 100 ? 'is-done' : ''}" aria-label="Цель дня ${p.todayXp} из ${p.goal} опыта">
            <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" class="g-ring__bg"/><circle cx="32" cy="32" r="${R}" class="g-ring__fg" style="stroke-dasharray:${L};stroke-dashoffset:${L * (1 - goalPct / 100)}"/></svg>
            <span>${goalPct >= 100 ? icon.check : `<b>${p.todayXp}</b><small>/${p.goal}</small>`}</span>
          </div>
        </div>
        <div class="g-bar"><i style="width:${lvPct}%"></i></div>
        <p class="g-hero__hint">${lv.next ? `${fmt(p.xp - lv.from)} из ${fmt(lv.next - lv.from)} опыта до уровня «${esc(lv.nextTitle)}»` : 'Максимальный уровень. Вы легенда!'}</p>
        <p class="g-hero__goal">${goalPct >= 100 ? 'Цель дня выполнена 🎉' : p.playedToday ? `Цель дня: ещё ${p.goal - p.todayXp} опыта` : p.streak ? `Пройдите урок, чтобы серия ${p.streak} ${plural(p.streak, 'день', 'дня', 'дней')} не сгорела` : 'Цель дня: 30 опыта — примерно один урок'}</p>
        ${next
          ? `<button class="btn btn--red btn--shine" data-lesson="${next.id}">${p.xp ? 'Продолжить' : 'Начать'}: ${esc(next.title)}</button>`
          : '<button class="btn btn--white" data-g="tracks">Все уроки пройдены — сменить путь</button>'}
      </section>

      ${pollCard()}

      <div class="g-path">
        ${S.units.map((u, ui) => {
          const doneN = u.lessons.filter((l) => l.done).length;
          return `
          <section class="g-unit ${u.complete ? 'is-done' : ''}">
            <header class="g-unit__head">
              <img src="${u.img}" alt="" />
              <span><span class="t-small">Раздел ${ui + 1} · ${doneN} из ${u.lessons.length}</span><b>${esc(u.title)}</b><span class="g-unit__desc">${esc(u.desc)}</span></span>
            </header>
            <div class="g-nodes">
              ${u.lessons.map((l, i) => {
                const cur = next && next.id === l.id;
                const cls = l.done ? `is-done${l.best === l.size ? ' is-perfect' : ''}` : cur ? 'is-current' : l.locked ? 'is-locked' : '';
                const perfect = l.done && l.best === l.size;
                return `
                <div class="g-node-wrap" style="--x:${[0, 46, -46][i % 3]}px">
                  ${cur ? '<span class="g-node__bubble">Старт</span>' : ''}
                  <button class="g-node ${cls}" ${l.locked ? 'disabled' : ''} data-lesson="${l.id}" aria-label="${esc(l.title)}">
                    ${l.done ? (perfect ? icon.star : icon.check) : l.locked ? icon.lock : icon.star}
                  </button>
                  <span class="g-node__title">${esc(l.title)}${l.done ? `<small>${l.best}/${l.size}</small>` : ''}</span>
                </div>`;
              }).join('')}
            </div>
          </section>`;
        }).join('')}
      </div>

      <section class="g-card">
        <div class="h-row"><h2 class="t-h2">Топ недели</h2><span class="t-small">сброс в понедельник</span></div>
        ${S.board.top.length
          ? `<ol class="g-board">${S.board.top.map((r) => `
              <li class="${r.me ? 'is-me' : ''}"><span class="g-board__place p${r.place}">${r.place}</span><span class="g-board__name">${esc(r.name)}${r.me ? ' · вы' : ''}</span><b>${fmt(r.xp)}</b></li>`).join('')}</ol>
             ${S.board.me && S.board.me.place > 10 ? `<p class="g-board__me">Вы на ${S.board.me.place} месте · ${fmt(S.board.me.xp)} опыта</p>` : ''}`
          : '<p class="t-lead">На этой неделе ещё никто не играл. Пройдите урок — и вы первый.</p>'}
      </section>

      <section class="g-card">
        <div class="h-row"><h2 class="t-h2">Достижения</h2><span class="t-small">${S.achievements.filter((a) => a.got).length} из ${S.achievements.length}</span></div>
        <div class="g-ach">
          ${S.achievements.map((a) => `
            <button class="g-badge ${a.got ? 'is-got' : ''}" data-ach="${a.key}">
              <span class="g-badge__icon">${a.icon}</span><span>${esc(a.title)}</span>
            </button>`).join('')}
        </div>
      </section>

      <button class="g-switch" data-g="tracks">Путь: <b>${esc(p.trackTitle)}</b> · сменить</button>
    `);
    bind();
  }

  // ---------- опрос дня ----------
  let pollMine = false;
  function pollCard() {
    const q = S.poll;
    if (!q) return '';
    if (q.voted === null || q.voted === undefined) {
      return `
        <section class="g-card g-poll">
          <div class="h-row"><span class="g-tag">Опрос дня</span><span class="g-plus">${icon.bolt}+15</span></div>
          <h3 class="t-h3">${esc(q.question)}</h3>
          <div class="g-poll__opts">${q.options.map((o, i) => `<button class="g-opt" data-vote="${i}">${esc(o)}</button>`).join('')}</div>
          <p class="t-small">После ответа увидите, как ответили другие</p>
        </section>`;
    }
    const counts = pollMine ? q.countsMine : q.counts;
    const total = (pollMine ? q.totalMine : q.total) || 1;
    const max = Math.max(...q.options.map((_, i) => counts[i] || 0));
    return `
      <section class="g-card g-poll is-voted">
        <div class="h-row"><span class="g-tag">Опрос дня</span><span class="t-small">${fmt(pollMine ? q.totalMine : q.total)} ${plural(pollMine ? q.totalMine : q.total, 'ответ', 'ответа', 'ответов')}</span></div>
        <h3 class="t-h3">${esc(q.question)}</h3>
        <div class="g-seg"><button class="${pollMine ? '' : 'is-on'}" data-pollview="all">Все</button><button class="${pollMine ? 'is-on' : ''}" data-pollview="mine">${S.profile.track === 'owner' ? 'Владельцы' : 'Маркетологи'}</button></div>
        <div class="g-poll__res">
          ${q.options.map((o, i) => {
            const pct = Math.round(((counts[i] || 0) / total) * 100);
            return `<div class="g-res ${q.voted === i ? 'is-mine' : ''} ${(counts[i] || 0) === max && max ? 'is-top' : ''}">
              <i style="--w:${pct}%"></i><span>${esc(o)}${q.voted === i ? ' · ваш ответ' : ''}</span><b>${pct}%</b></div>`;
          }).join('')}
        </div>
        <p class="t-small">Новый опрос — завтра</p>
      </section>`;
  }

  async function vote(i) {
    haptic('medium');
    document.querySelectorAll('[data-vote]').forEach((b, k) => { b.disabled = true; if (k === i) b.classList.add('is-picked'); });
    try {
      const r = await call('poll', { pollId: S.poll.id, option: i });
      track('game_poll', { id: S.poll.id });
      S.poll = { ...S.poll, ...r };
      if (r.xp) { S.profile.xp += r.xp; S.profile.todayXp += r.xp; }
      renderHome();
      if (r.xp) floatXp(r.xp, document.querySelector('.g-poll'));
      showAchievements(r.achievements);
    } catch (e) {
      H.toast(e.message);
      renderHome();
    }
  }

  function floatXp(xp, el) {
    if (!el) return;
    const s = document.createElement('span');
    s.className = 'g-float-xp';
    s.innerHTML = `${icon.bolt}+${xp}`;
    el.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }

  // ---------- события ----------
  function bind() {
    H.app.onclick = (e) => {
      const t = e.target.closest('[data-track],[data-lesson],[data-g],[data-vote],[data-pollview],[data-ach],[data-tab]');
      if (!t) return;
      if (t.dataset.tab) { haptic(); return H.showTab(t.dataset.tab); }
      if (t.dataset.track) return chooseTrack(t.dataset.track);
      if (t.dataset.lesson && !t.disabled) return startLesson(t.dataset.lesson);
      if (t.dataset.vote !== undefined) return vote(Number(t.dataset.vote));
      if (t.dataset.pollview) { pollMine = t.dataset.pollview === 'mine'; return renderHome(); }
      if (t.dataset.ach) {
        const a = S.achievements.find((x) => x.key === t.dataset.ach);
        return H.sheet(`<div class="g-ach-big ${a.got ? 'is-got' : ''}"><span>${a.icon}</span></div><h2 class="t-h1">${esc(a.title)}</h2><p class="t-lead">${esc(a.desc)}</p><p class="t-small">${a.got ? 'Получено' : 'Ещё не получено'}</p><button class="btn" data-close>Понятно</button>`);
      }
      const g = t.dataset.g;
      if (g === 'reload') return page();
      if (g === 'tracks') return renderTracks(true);
      if (g === 'home') return renderHome();
    };
  }

  async function chooseTrack(id) {
    haptic('medium');
    try {
      S = await call('track', { track: id });
      window.scrollTo(0, 0);
      renderHome();
    } catch (e) {
      H.toast(e.message);
    }
  }

  // ---------- урок ----------
  let L = null; // { id, title, queue, total, done, correct, mistakes:Set, combo, started }

  async function startLesson(id) {
    haptic('medium');
    try {
      const data = await call('lesson', { lessonId: id });
      track('game_lesson_start', { id });
      L = { id, title: data.title, unit: data.unit, queue: data.questions.slice(), total: data.questions.length, done: 0, correct: 0, mistakes: new Set(), combo: 0, best: 0, started: Date.now() };
      window.scrollTo(0, 0);
      document.body.classList.add('g-lesson-on');
      showQuestion();
    } catch (e) {
      H.toast(e.message);
    }
  }

  function exitLesson() {
    H.sheet(`<h2 class="t-h1">Выйти из урока?</h2><p class="t-lead">Прогресс этого урока не сохранится.</p>
      <button class="btn btn--red" data-g-exit>Выйти</button><button class="btn btn--line" data-close>Продолжить урок</button>`);
    H.sheetEl.querySelector('[data-g-exit]').onclick = () => { H.sheetEl.hidden = true; leave(); };
  }

  function leave() {
    L = null;
    document.body.classList.remove('g-lesson-on');
    H.showTab('game');
  }

  function lessonShell(body, footer) {
    const pct = Math.round((L.done / L.total) * 100);
    H.app.innerHTML = `
      <div class="g-lesson">
        <header class="g-lesson__top">
          <button class="g-x" data-x aria-label="Выйти">${icon.close}</button>
          <div class="g-bar g-bar--lesson"><i style="width:${pct}%"></i></div>
          <span class="g-combo ${L.combo >= 3 ? 'is-on' : ''}">${icon.flame}${L.combo}</span>
        </header>
        <main class="g-lesson__body">${body}</main>
        <footer class="g-lesson__foot">${footer}</footer>
        <div class="g-feedback" hidden></div>
      </div>`;
    H.app.onclick = null;
    H.app.querySelector('[data-x]').onclick = exitLesson;
  }

  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  function showQuestion() {
    const q = L.queue[0];
    if (!q) return finish();
    const retry = L.mistakes.has(q.id);
    const tag = { quiz: 'Выберите ответ', swipe: 'Да или нет?', spot: 'Найдите ошибку', calc: 'Посчитайте' }[q.type];
    const head = `<p class="g-q__tag">${retry ? '<span class="g-retry">Ещё раз</span>' : ''}${tag}</p><h2 class="g-q">${esc(q.q)}</h2>`;
    let picked = null;

    if (q.type === 'quiz') {
      const order = q.options.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      lessonShell(`${head}<div class="g-choices">${order.map((i, k) => `<button class="g-choice" data-i="${i}"><span class="g-choice__k">${LETTERS[k]}</span><span>${esc(q.options[i])}</span></button>`).join('')}</div>`,
        `<button class="btn" data-check disabled>Проверить</button>`);
      pickable('.g-choice', (i) => (picked = i));
      H.app.querySelector('[data-check]').onclick = () => answer(q, picked === q.a, q.options[q.a]);
    }

    if (q.type === 'spot') {
      lessonShell(`${head}
        <div class="g-spot g-spot--${q.view}">
          ${q.view === 'ad' ? '<span class="g-spot__ad">Реклама</span>' : ''}
          ${q.rows.map((r, i) => `<button class="g-spot__row" data-i="${i}">${r.label ? `<small>${esc(r.label)}</small>` : ''}<span>${esc(r.text)}</span></button>`).join('')}
        </div>`, `<button class="btn" data-check disabled>Проверить</button>`);
      pickable('.g-spot__row', (i) => (picked = i));
      H.app.querySelector('[data-check]').onclick = () => {
        const row = H.app.querySelector(`.g-spot__row[data-i="${q.a}"]`);
        answer(q, picked === q.a, q.rows[q.a].text, () => row.classList.add('is-answer'));
      };
    }

    if (q.type === 'calc') {
      lessonShell(`${head}
        <label class="g-calc"><input id="gCalc" inputmode="decimal" autocomplete="off" placeholder="0" /><span>${esc(q.unit || '')}</span></label>
        ${q.hint ? `<p class="t-small">${esc(q.hint)}</p>` : '<p class="t-small">Можно округлить</p>'}`,
        `<button class="btn" data-check disabled>Проверить</button>`);
      const inp = H.app.querySelector('#gCalc');
      const btn = H.app.querySelector('[data-check]');
      inp.oninput = () => (btn.disabled = !inp.value.trim());
      setTimeout(() => inp.focus(), 250);
      const go = () => {
        const v = Number(inp.value.replace(/\s/g, '').replace(',', '.'));
        const tol = q.tol ?? 0.02;
        const ok = Number.isFinite(v) && Math.abs(v - q.a) <= Math.max(Math.abs(q.a) * tol, 0.05);
        inp.blur();
        answer(q, ok, `${fmt(q.a)}${q.unit ? ' ' + q.unit : ''}`);
      };
      btn.onclick = go;
      inp.onkeydown = (e) => { if (e.key === 'Enter' && inp.value.trim()) go(); };
    }

    if (q.type === 'swipe') {
      const yes = q.yes || 'Да', no = q.no || 'Нет';
      lessonShell(`${head}
        <div class="g-swipe">
          <div class="g-swipe__card" id="gCard">
            ${q.card ? `<span class="g-spot__ad">Реклама</span>${q.card.title ? `<b>${esc(q.card.title)}</b>` : ''}<p>${esc(q.card.text)}</p>${q.card.note ? `<small>${esc(q.card.note)}</small>` : ''}` : `<p class="g-swipe__big">${esc(q.q)}</p>`}
            <span class="g-swipe__stamp g-swipe__stamp--no">${esc(no)}</span><span class="g-swipe__stamp g-swipe__stamp--yes">${esc(yes)}</span>
          </div>
          <p class="t-small g-swipe__hint">Смахните карточку или нажмите кнопку</p>
        </div>`,
        `<div class="g-swipe__btns"><button class="btn btn--line g-no" data-ans="0">${icon.left}${esc(no)}</button><button class="btn btn--line g-yes" data-ans="1">${esc(yes)}${icon.right}</button></div>`);
      if (q.card) H.app.querySelector('.g-q').classList.add('g-q--small');
      else H.app.querySelector('.g-q').remove();
      const card = H.app.querySelector('#gCard');
      const decide = (v) => {
        card.classList.add(v ? 'fly-right' : 'fly-left');
        H.app.querySelectorAll('[data-ans]').forEach((b) => (b.disabled = true));
        setTimeout(() => answer(q, v === q.a, q.a ? yes : no), 260);
      };
      H.app.querySelectorAll('[data-ans]').forEach((b) => (b.onclick = () => decide(b.dataset.ans === '1')));
      drag(card, decide);
    }
  }

  function pickable(sel, onPick) {
    const btn = H.app.querySelector('[data-check]');
    H.app.querySelectorAll(sel).forEach((b) => {
      b.onclick = () => {
        haptic();
        H.app.querySelectorAll(sel).forEach((x) => x.classList.remove('is-picked'));
        b.classList.add('is-picked');
        onPick(Number(b.dataset.i));
        btn.disabled = false;
      };
    });
  }

  // Смахивание карточки пальцем
  function drag(card, decide) {
    let x0 = null, dx = 0;
    card.addEventListener('pointerdown', (e) => { x0 = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = 'none'; });
    card.addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      dx = e.clientX - x0;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      card.classList.toggle('lean-right', dx > 40);
      card.classList.toggle('lean-left', dx < -40);
    });
    const up = () => {
      if (x0 === null) return;
      x0 = null;
      card.style.transition = '';
      if (Math.abs(dx) > 90) return decide(dx > 0);
      card.style.transform = '';
      card.classList.remove('lean-right', 'lean-left');
    };
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', up);
  }

  function answer(q, ok, rightText, reveal) {
    const fb = H.app.querySelector('.g-feedback');
    const first = !L.mistakes.has(q.id);
    H.app.querySelectorAll('.g-choice,.g-spot__row,[data-check],[data-ans],#gCalc').forEach((b) => (b.disabled = true));
    const picked = H.app.querySelector('.is-picked');
    if (ok) {
      L.queue.shift();
      L.done++;
      if (first) L.correct++;
      L.combo++;
      L.best = Math.max(L.best, L.combo);
      H.notify('success');
      picked?.classList.add('is-right');
    } else {
      L.mistakes.add(q.id);
      L.combo = 0;
      L.queue.push(L.queue.shift()); // вернём в конец урока, как в Duolingo
      H.notify('error');
      picked?.classList.add('is-wrong');
      H.app.querySelector('.g-lesson__body').classList.add('shake');
      if (q.type === 'quiz') H.app.querySelector(`.g-choice[data-i="${q.a}"]`)?.classList.add('is-answer');
      reveal?.();
    }
    const praise = ['Отлично!', 'В точку!', 'Верно!', 'Так держать!', 'Супер!'][Math.floor(Math.random() * 5)];
    fb.className = `g-feedback ${ok ? 'is-ok' : 'is-bad'}`;
    fb.innerHTML = `
      <div class="g-feedback__head">${ok ? icon.check : icon.close}<b>${ok ? (L.combo >= 3 ? `${L.combo} подряд! 🔥` : praise) : 'Не совсем'}</b>${ok && first ? `<span class="g-plus">${icon.bolt}+10</span>` : ''}</div>
      ${ok ? '' : `<p class="g-feedback__right">Правильный ответ: <b>${esc(rightText)}</b></p>`}
      <p>${esc(q.why)}</p>
      <button class="btn ${ok ? 'btn--ok' : 'btn--red'}" data-next>${ok ? 'Дальше' : 'Понятно'}</button>`;
    fb.hidden = false;
    const bar = H.app.querySelector('.g-bar--lesson i');
    if (bar) bar.style.width = `${Math.round((L.done / L.total) * 100)}%`;
    const combo = H.app.querySelector('.g-combo');
    if (combo) { combo.innerHTML = `${icon.flame}${L.combo}`; combo.classList.toggle('is-on', L.combo >= 3); }
    fb.querySelector('[data-next]').onclick = () => { haptic(); showQuestion(); };
    fb.querySelector('[data-next]').focus({ preventScroll: true });
  }

  // ---------- итог урока ----------
  async function finish() {
    const ms = Date.now() - L.started;
    const lesson = L;
    H.app.innerHTML = `<div class="g-lesson g-result"><div class="g-result__load"><span class="g-spin"></span><p>Считаем опыт…</p></div></div>`;
    let r;
    try {
      r = await call('finish', { lessonId: lesson.id, correct: lesson.correct, mistakes: [...lesson.mistakes], ms });
    } catch (e) {
      H.app.innerHTML = `<div class="g-lesson g-result"><h2 class="t-h1">Урок пройден</h2><p class="t-lead">Не получилось сохранить результат: ${esc(e.message)}</p><button class="btn" data-again>Сохранить ещё раз</button><button class="btn btn--line" data-out>Выйти</button></div>`;
      H.app.querySelector('[data-again]').onclick = () => { L = lesson; finish(); };
      H.app.querySelector('[data-out]').onclick = leave;
      return;
    }
    track('game_lesson_done', { id: lesson.id, correct: r.correct, total: r.total });
    flush();
    const acc = Math.round((r.correct / r.total) * 100);
    const sec = Math.round(ms / 1000);
    const time = sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`;
    const title = r.perfect ? 'Без единой ошибки!' : acc >= 80 ? 'Отличный урок!' : acc >= 50 ? 'Урок пройден' : 'Главное — практика';
    H.app.innerHTML = `
      <div class="g-lesson g-result">
        ${r.perfect ? confetti() : ''}
        <div class="g-result__hero"><img class="float" src="img/${r.perfect ? 'coins' : 'arrow'}.webp" alt="" /></div>
        <h1 class="t-hero">${title}</h1>
        <p class="t-lead">${esc(lesson.title)}${r.replay ? ' · повтор урока даёт меньше опыта' : ''}</p>
        <div class="g-tiles">
          <div class="g-tile g-tile--xp"><small>Опыт</small><b>${icon.bolt}<span data-count="${r.xp}">0</span></b></div>
          <div class="g-tile"><small>Точность</small><b>${acc}%</b></div>
          <div class="g-tile"><small>Время</small><b>${time}</b></div>
        </div>
        ${r.streakUp ? `<div class="g-streak-up">${icon.flame}<span><b>Серия ${r.streak} ${plural(r.streak, 'день', 'дня', 'дней')}!</b><span>${r.streak === 1 ? 'Возвращайтесь завтра, чтобы не потерять её' : 'Огонь горит. Завтра — ещё один урок'}</span></span></div>` : ''}
        ${r.levelUp ? `<div class="g-levelup"><span>Новый уровень</span><b>${esc(r.levelUp)}</b></div>` : ''}
        ${r.todayXp >= r.goal && r.todayXp - r.xp < r.goal ? '<div class="g-goal-done">🎯 Цель дня выполнена</div>' : ''}
        <button class="btn btn--red" data-out>Продолжить</button>
      </div>`;
    H.notify('success');
    countUp(H.app.querySelector('[data-count]'), r.xp);
    H.app.querySelector('[data-out]').onclick = () => { leave(); };
    if (S?.profile) {
      S.profile.xp = r.totalXp;
      S.profile.streak = r.streak;
    }
    await sleep(900);
    showAchievements(r.achievements);
  }

  function countUp(el, to) {
    if (!el) return;
    if (H.reduced) return (el.textContent = to);
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function confetti() {
    const colors = ['#F90402', '#000', '#FF8A3D', '#DEDEDE', '#F90402'];
    return `<div class="g-confetti" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => `<i style="--l:${(i * 37) % 100}%;--d:${(i % 7) * 0.12}s;--c:${colors[i % 5]};--r:${(i * 53) % 360}deg;--s:${0.7 + (i % 4) * 0.2}"></i>`).join('')}</div>`;
  }

  function showAchievements(list) {
    if (!list || !list.length) return;
    H.notify('success');
    H.sheet(`
      <div class="g-ach-new">
        ${list.map((a, i) => `<div class="g-ach-new__item" style="animation-delay:${i * 120}ms"><span class="g-ach-big is-got"><span>${a.icon}</span></span><b>${esc(a.title)}</b><small>${esc(a.desc)}</small></div>`).join('')}
      </div>
      <h2 class="t-h1">${list.length > 1 ? 'Новые достижения!' : 'Новое достижение!'}</h2>
      <button class="btn" data-close>Забрать</button>`);
  }

  window.HUMA_GAME = { page };
})();
