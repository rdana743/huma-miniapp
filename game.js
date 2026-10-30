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
    snow: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2M4.5 10.5l3.4-.3-1.4-3M19.5 13.5l-3.4.3 1.4 3M4.5 13.5l3.4.3-1.4 3M19.5 10.5l-3.4-.3 1.4-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
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
      ${changing ? '' : inviteCard()}
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

  // ---------- главный экран: «Сегодня» + плитки разделов ----------
  let openUnit = null; // открытый экран раздела (id) — возвращаемся в него после урока

  const unitIndex = (id) => S.units.findIndex((u) => u.id === id);
  const seenDuels = () => store.get('duelsSeen', []);
  const newDuelResults = () => (S.duels?.list || []).filter((d) => d.result !== 'waiting' && !seenDuels().includes(d.code));
  const gotAch = () => S.achievements.filter((a) => a.got).length;
  const achDot = () => Math.max(0, gotAch() - store.get('achSeen', 0));

  function topBar() {
    const p = S.profile;
    const duelDot = (S.duels?.invite ? 1 : 0) + newDuelResults().length;
    const dot = (n) => (n ? `<em>${n > 9 ? '9+' : n}</em>` : '');
    return `
      <div class="g-top">
        <div class="g-stats">
          <span class="g-chip ${p.playedToday ? 'is-hot' : ''}" title="Серия дней">${icon.flame}<b>${p.streak}</b></span>
          <span class="g-chip g-chip--xp" title="Опыт">${icon.bolt}<b>${fmt(p.xp)}</b></span>
          ${p.freezes ? `<button class="g-chip g-chip--ice" data-g="freeze" title="Заморозки серии">${icon.snow}<b>${p.freezes}</b></button>` : ''}
        </div>
        <div class="g-icons">
          <button data-g="duels" aria-label="Дуэли">⚔️${dot(duelDot)}</button>
          <button data-g="board" aria-label="Топ недели">🏆</button>
          <button data-g="profile" aria-label="Уровень и награды">🎖${dot(achDot())}</button>
        </div>
      </div>`;
  }

  function heroCard() {
    const p = S.profile;
    const lv = p.level;
    const lvPct = lv.next ? Math.round(((p.xp - lv.from) / (lv.next - lv.from)) * 100) : 100;
    const goalPct = Math.min(100, Math.round((p.todayXp / p.goal) * 100));
    const R = 26, C = 2 * Math.PI * R;
    const next = nextLesson();
    const u = next ? S.units.find((x) => x.lessons.some((l) => l.id === next.id)) : null;
    const k = u ? u.lessons.findIndex((l) => l.id === next.id) + 1 : 0;
    return `
      <section class="g-hero on-dark">
        <div class="g-hero__top">
          <div>
            <span class="t-small">${next ? `${esc(u.title)} · урок ${k} из ${u.lessons.length}` : 'Все уроки пройдены'}</span>
            <h2 class="t-h2 g-hero__title">${next ? esc(next.title) : 'Вы прошли весь путь!'}</h2>
          </div>
          <div class="g-ring ${goalPct >= 100 ? 'is-done' : ''}" aria-label="Цель дня ${p.todayXp} из ${p.goal} опыта">
            <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" class="g-ring__bg"/><circle cx="32" cy="32" r="${R}" class="g-ring__fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - goalPct / 100)}"/></svg>
            <span>${goalPct >= 100 ? icon.check : `<b>${p.todayXp}</b><small>/${p.goal}</small>`}</span>
          </div>
        </div>
        ${next
          ? `<button class="btn btn--red btn--shine" data-lesson="${next.id}">${p.xp ? 'Продолжить' : 'Начать первый урок'}</button>`
          : '<button class="btn btn--white" data-g="tracks">Сменить путь</button>'}
        <button class="g-hero__lv" data-g="levels">
          <span><b>${esc(lv.title)}</b>${lv.next ? ` → ${esc(lv.nextTitle)}` : ''}</span>
          <span class="g-bar"><i style="width:${lvPct}%"></i></span>
          <small>${lv.next ? `${fmt(p.xp - lv.from)}/${fmt(lv.next - lv.from)}` : 'макс.'}</small>
        </button>
      </section>`;
  }

  // Лента «Сегодня»: что важно сейчас — первым
  function laneCards() {
    const p = S.profile;
    const cards = [];
    const inv = S.duels?.invite;
    if (inv) cards.push(`<button class="g-lc g-lc--dark" data-duel-accept="${inv.code}"><span class="g-lc__e">⚔️</span><b>${esc(inv.from)} вызывает на дуэль</b><small>${inv.correct}/${inv.size} за ${mmss(inv.ms)}</small><span class="g-lc__btn">Принять</span></button>`);
    for (const d of newDuelResults().slice(0, 2)) {
      const t = { win: 'Вы победили', lose: 'Дуэль проиграна', draw: 'Ничья' }[d.result];
      cards.push(`<button class="g-lc ${d.result === 'win' ? 'g-lc--win' : ''}" data-g="duels"><span class="g-lc__e">${d.result === 'win' ? '🏆' : '⚔️'}</span><b>${t}</b><small>${esc(d.rival || '')} · ${d.my} : ${d.their}</small><span class="g-lc__btn">${d.result === 'lose' ? 'Реванш' : 'Смотреть'}</span></button>`);
    }
    if (p.streak && !p.playedToday) cards.push(`<button class="g-lc g-lc--fire" data-lesson="${nextLesson()?.id || ''}"><span class="g-lc__e">🔥</span><b>Серия ${p.streak} ${plural(p.streak, 'день', 'дня', 'дней')} под угрозой</b><small>Один урок — 2 минуты</small><span class="g-lc__btn">Спасти</span></button>`);
    if (S.poll && (S.poll.voted === null || S.poll.voted === undefined)) cards.push(`<button class="g-lc" data-g="poll"><span class="g-lc__e">📊</span><b>Опрос дня</b><small>${esc(S.poll.question)}</small><span class="g-lc__btn">Ответить · +15⚡</span></button>`);
    const cert = S.units.find((u) => u.complete && !store.get('certSeen', []).includes(u.id));
    if (cert && S.referral?.code) cards.push(`<button class="g-lc" data-cert="${cert.id}"><span class="g-lc__e">🎓</span><b>Сертификат готов</b><small>«${esc(cert.title)}» — для сторис</small><span class="g-lc__btn">Открыть</span></button>`);
    if (!(S.duels?.list || []).length) cards.push(`<button class="g-lc" data-g="duel"><span class="g-lc__e">⚔️</span><b>Вызовите коллегу</b><small>5 вопросов на скорость, победителю +50⚡</small><span class="g-lc__btn">Сыграть</span></button>`);
    if (S.referral?.code) cards.push(`<button class="g-lc" data-g="ref"><span class="g-lc__e">🎁</span><b>Позовите друга</b><small>+${S.referral.reward.referrer}⚡ и заморозка серии</small><span class="g-lc__btn">Пригласить</span></button>`);
    if (S.poll && S.poll.voted !== null && S.poll.voted !== undefined) cards.push(`<button class="g-lc" data-g="poll"><span class="g-lc__e">📊</span><b>Итоги опроса</b><small>${esc(S.poll.question)}</small><span class="g-lc__btn">Смотреть</span></button>`);
    return cards;
  }

  function unitTile(u) {
    const done = u.lessons.filter((l) => l.done).length;
    const total = u.lessons.length;
    const next = nextLesson();
    const cur = next && u.lessons.some((l) => l.id === next.id);
    const locked = !u.lessons.some((l) => !l.locked);
    const state = u.complete ? 'done' : cur ? 'cur' : locked ? 'lock' : 'open';
    const R = 15, C = 2 * Math.PI * R;
    return `
      <button class="g-utile is-${state}" data-unit="${u.id}">
        <img src="${u.img}" alt="" />
        <b>${esc(u.title)}</b>
        <span class="g-utile__p">
          <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="${R}" fill="none" stroke="#e5e5e5" stroke-width="4"/><circle cx="18" cy="18" r="${R}" fill="none" stroke="${u.complete ? 'var(--ok)' : 'var(--red)'}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - done / total)}" transform="rotate(-90 18 18)"/></svg>
          ${done}/${total}
        </span>
        ${state === 'done' ? `<i class="g-utile__ok">${icon.check}</i>` : state === 'lock' ? `<i class="g-utile__lock">${icon.lock}</i>` : ''}
      </button>`;
  }

  function renderHome() {
    if (openUnit && unitIndex(openUnit) >= 0) return renderUnit(openUnit);
    const p = S.profile;
    const cards = laneCards();
    const doneUnits = S.units.filter((u) => u.complete).length;
    H.shell(`
      ${H.head()}
      ${inviteCard()}
      ${topBar()}
      ${heroCard()}
      ${cards.length ? `
        <div class="h-row"><h2 class="t-h2">Сегодня</h2>${cards.length > 1 ? '<span class="t-small">листайте →</span>' : ''}</div>
        <div class="g-lane">${cards.join('')}</div>` : ''}
      <div class="h-row"><h2 class="t-h2">Разделы</h2><span class="t-small">${doneUnits} из ${S.units.length} пройдены</span></div>
      <div class="g-grid">${S.units.map(unitTile).join('')}</div>
      <div class="g-links">
        <button data-g="board">🏆 <span>Топ недели</span><b>${S.board.me ? `вы на ${S.board.me.place} месте` : 'сыграйте урок'}</b></button>
        <button data-g="profile">🎖 <span>Уровень и награды</span><b>${gotAch()} из ${S.achievements.length}</b></button>
        <button data-g="tracks">🧭 <span>Путь</span><b>${esc(p.trackTitle)}</b></button>
      </div>
    `);
    bind();
  }

  // Экран раздела: дорожка уроков как в Duolingo
  function renderUnit(id) {
    const ui = unitIndex(id);
    const u = S.units[ui];
    openUnit = id;
    const next = nextLesson();
    const doneN = u.lessons.filter((l) => l.done).length;
    const prevUnit = S.units[ui - 1];
    H.shell(`
      <button class="g-back" data-g="units">${icon.left}Все разделы</button>
      <section class="g-unitbig on-dark">
        <img src="${u.img}" alt="" />
        <div><span class="t-small">Раздел ${ui + 1} · ${doneN} из ${u.lessons.length}</span><h1 class="t-h1">${esc(u.title)}</h1><p>${esc(u.desc)}</p></div>
      </section>
      <div class="g-nodes g-nodes--big">
        ${u.lessons.map((l, i) => {
          const cur = next && next.id === l.id;
          const perfect = l.done && l.best === l.size;
          const cls = l.done ? `is-done${perfect ? ' is-perfect' : ''}` : cur ? 'is-current' : l.locked ? 'is-locked' : '';
          return `
          <div class="g-node-wrap" style="--x:${[0, 52, -52][i % 3]}px">
            ${cur ? '<span class="g-node__bubble">Старт</span>' : ''}
            <button class="g-node ${cls}" ${l.locked ? 'disabled' : ''} data-lesson="${l.id}" aria-label="${esc(l.title)}">
              ${l.done ? (perfect ? icon.star : icon.check) : l.locked ? icon.lock : icon.star}
            </button>
            <span class="g-node__title">${esc(l.title)}${l.done ? `<small>${l.best}/${l.size}</small>` : ''}</span>
          </div>`;
        }).join('')}
      </div>
      ${u.complete && S.referral?.code
        ? `<button class="btn btn--red" data-cert="${u.id}">🎓 Сертификат за раздел</button>`
        : u.lessons.every((l) => l.locked)
          ? `<div class="g-hint">🔒 Откроется после раздела «${esc(prevUnit?.title || '')}»</div>`
          : `<div class="g-hint">🎓 Пройдите все ${u.lessons.length} урока — получите сертификат для сторис</div>`}
      ${S.units[ui + 1] ? `<button class="g-nextunit" data-unit="${S.units[ui + 1].id}"><span>Следующий раздел</span><b>${esc(S.units[ui + 1].title)}</b>${icon.right}</button>` : ''}
    `);
    window.scrollTo(0, 0);
    bind();
  }

  // ---------- шторки ----------
  function boardSheet() {
    H.sheet(`
      <h2 class="t-h1">Топ недели</h2>
      <p class="t-lead">Опыт с понедельника. В понедельник всё обнуляется — шанс есть у каждого.</p>
      ${S.board.top.length
        ? `<ol class="g-board">${S.board.top.map((r) => `<li class="${r.me ? 'is-me' : ''}"><span class="g-board__place p${r.place}">${r.place}</span><span class="g-board__name">${esc(r.name)}${r.me ? ' · вы' : ''}</span><b>${fmt(r.xp)}</b></li>`).join('')}</ol>
           ${S.board.me && S.board.me.place > 10 ? `<p class="g-board__me">Вы на ${S.board.me.place} месте · ${fmt(S.board.me.xp)} опыта</p>` : ''}`
        : '<p class="t-lead">На этой неделе ещё никто не играл. Пройдите урок — и вы первый.</p>'}
      <button class="btn" data-g="duel">⚔️ Вызвать коллегу и обогнать</button>`);
  }

  function profileSheet() {
    store.set('achSeen', gotAch());
    const p = S.profile;
    const certs = S.units.filter((u) => u.complete);
    H.sheet(`
      <h2 class="t-h1">Уровень и награды</h2>
      <button class="g-lvcard" data-g="levels">
        <span><small>Уровень ${p.level.index + 1} из ${S.levels?.length || 15}</small><b>${esc(p.level.title)}</b></span>
        <span class="g-bar"><i style="width:${p.level.next ? Math.round(((p.xp - p.level.from) / (p.level.next - p.level.from)) * 100) : 100}%"></i></span>
        <small>${p.level.next ? `до «${esc(p.level.nextTitle)}» — ${fmt(p.level.next - p.xp)} опыта · все уровни ›` : 'Максимальный уровень'}</small>
      </button>
      <div class="h-row"><h3 class="t-h2">Достижения</h3><span class="t-small">${gotAch()} из ${S.achievements.length}</span></div>
      <div class="g-ach">${S.achievements.map((a) => `<button class="g-badge ${a.got ? 'is-got' : ''}" data-ach="${a.key}"><span class="g-badge__icon">${a.icon}</span><span>${esc(a.title)}</span></button>`).join('')}</div>
      ${certs.length && S.referral?.code ? `<div class="h-row"><h3 class="t-h2">Сертификаты</h3><span class="t-small">${certs.length}</span></div>
        <div class="g-certs">${certs.map((u) => `<button data-cert="${u.id}">🎓 <span>${esc(u.title)}</span>${icon.right}</button>`).join('')}</div>` : ''}
      <button class="g-switch" data-g="tracks">Путь: <b>${esc(p.trackTitle)}</b> · сменить</button>`);
  }

  function duelsSheet() {
    store.set('duelsSeen', [...new Set([...seenDuels(), ...(S.duels?.list || []).filter((d) => d.result !== 'waiting').map((d) => d.code)])].slice(-50));
    H.sheet(`${inviteCard()}${duelCard()}`);
  }

  // ---------- ссылки на бота ----------
  const botLink = (payload) => (H.platform === 'tg' ? `https://t.me/${H.C.tgBotUsername}?start=${payload}` : `https://max.ru/${H.C.botUsername}?start=${payload}`);
  const mmss = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  async function shareLink(link, text, event) {
    track(event.name, event.props || {});
    if (H.platform === 'tg') return H.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    if (navigator.share) { try { await navigator.share({ text: `${text}\n${link}` }); return; } catch {} }
    if (await copyText(`${text}\n${link}`)) H.toast('Скопировано — отправьте коллеге');
    else H.toast(link, 8000);
  }

  // ---------- дуэли ----------
  function inviteCard() {
    const inv = S.duels?.invite;
    if (!inv) return '';
    return `
      <section class="g-duel-invite">
        <span class="g-duel-invite__swords">⚔️</span>
        <div>
          <span class="g-tag g-tag--red">Вызов на дуэль</span>
          <h2 class="t-h2">${esc(inv.from)} вызывает вас</h2>
          <p>${inv.correct}/${inv.size} верных за ${mmss(inv.ms)}. Сможете лучше? Победителю +50 опыта.</p>
        </div>
        <button class="btn btn--red btn--shine" data-duel-accept="${inv.code}">Принять вызов</button>
      </section>`;
  }

  function duelCard() {
    const list = S.duels?.list || [];
    const label = { win: 'победа', lose: 'поражение', draw: 'ничья', waiting: 'ждём соперника' };
    return `
      <section class="g-card g-duel">
        <div class="g-ref__top">
          <div>
            <span class="g-tag">Дуэль</span>
            <h2 class="t-h2">Вызовите коллегу</h2>
            <p class="g-ref__lead">5 одинаковых вопросов. Кто ответит лучше и быстрее — получит <b>+50 опыта</b>, проигравший — +20.</p>
          </div>
          <span class="g-duel__swords" aria-hidden="true">⚔️</span>
        </div>
        <button class="btn" data-g="duel">Сыграть и вызвать</button>
        ${list.length ? `<ul class="g-duels">${list.map((d) => `
          <li class="is-${d.result}">
            <span>${d.rival ? esc(d.rival) : 'Соперник ещё не принял'}</span>
            <b>${d.my}${d.their !== null ? ` : ${d.their}` : ` / ${d.size}`}</b>
            <small>${label[d.result]}</small>
            ${d.result === 'waiting' ? `<button class="g-duels__share" data-duel-share="${d.code}" data-duel-score="${d.my}">Отправить</button>` : ''}
          </li>`).join('')}</ul>` : ''}
      </section>`;
  }

  async function duelStart() {
    haptic('medium');
    try {
      const d = await call('duel_create');
      track('game_duel_create');
      beginRound({ duel: { code: d.code, role: 'creator' }, title: 'Дуэль', questions: d.questions });
    } catch (e) { H.toast(e.message); }
  }

  async function duelAccept(code) {
    haptic('medium');
    try {
      const d = await call('duel_open', { code });
      if (!d.canPlay) {
        H.toast(d.mine ? 'Это ваша дуэль — отправьте ссылку коллеге' : 'В эту дуэль уже сыграли — создайте свою');
        if (S?.duels) S.duels.invite = null;
        return H.showTab('game');
      }
      track('game_duel_accept');
      beginRound({ duel: { code, role: 'opponent', from: d.from, them: { correct: d.creatorCorrect, ms: d.creatorMs } }, title: `Дуэль с ${d.from}`, questions: d.questions });
    } catch (e) { H.toast(e.message); }
  }

  function beginRound({ duel, title, questions }) {
    L = { id: null, duel, title, queue: questions.slice(), total: questions.length, done: 0, correct: 0, mistakes: new Set(), combo: 0, best: 0, started: Date.now() };
    window.scrollTo(0, 0);
    document.body.classList.add('g-lesson-on');
    clearInterval(timerId);
    timerId = setInterval(() => { const t = document.querySelector('[data-duel-timer]'); if (t && L) t.textContent = mmss(Date.now() - L.started); }, 500);
    showQuestion();
  }
  let timerId = null;

  async function duelFinish() {
    clearInterval(timerId);
    const ms = Date.now() - L.started;
    const round = L;
    H.app.innerHTML = `<div class="g-lesson g-result"><div class="g-result__load"><span class="g-spin"></span><p>Подводим итог…</p></div></div>`;
    let r;
    try {
      r = await call('duel_submit', { code: round.duel.code, correct: round.correct, ms });
    } catch (e) {
      H.app.innerHTML = `<div class="g-lesson g-result"><h2 class="t-h1">Не получилось</h2><p class="t-lead">${esc(e.message)}</p><button class="btn" data-out>Назад</button></div>`;
      H.app.querySelector('[data-out]').onclick = leave;
      return;
    }
    if (r.role === 'creator') {
      const link = botLink(`duel_${r.code}`);
      H.app.innerHTML = `
        <div class="g-lesson g-result">
          <div class="g-duel-big">⚔️</div>
          <h1 class="t-hero">Вызов готов</h1>
          <p class="t-lead">Ваш результат — <b>${r.correct}/${round.total}</b> за <b>${mmss(r.ms)}</b>. Отправьте ссылку коллеге: когда он сыграет, бот пришлёт итог.</p>
          <div class="g-ref__link" style="width:100%"><span>${esc(link.replace('https://', ''))}</span></div>
          <button class="btn btn--red" data-send>${icon.share}Отправить вызов</button>
          <button class="btn btn--line" data-copy>${icon.copy}Скопировать ссылку</button>
          <button class="g-switch" data-out>Вернуться в игру</button>
        </div>`;
      const text = `Вызываю на дуэль по маркетингу: я ответил на ${r.correct} из ${round.total} за ${mmss(r.ms)}. Сможешь лучше?`;
      H.app.querySelector('[data-send]').onclick = () => shareLink(link, text, { name: 'game_invite', props: { via: 'duel' } });
      H.app.querySelector('[data-copy]').onclick = () => copyText(link).then((ok) => H.toast(ok ? 'Ссылка скопирована' : link, ok ? 2500 : 8000));
      H.app.querySelector('[data-out]').onclick = leave;
      return;
    }
    const titles = { win: 'Победа!', lose: 'Почти!', draw: 'Ничья!' };
    H.notify(r.result === 'lose' ? 'warning' : 'success');
    H.app.innerHTML = `
      <div class="g-lesson g-result">
        ${r.result === 'win' ? confetti() : ''}
        <div class="g-duel-big">${r.result === 'win' ? '🏆' : r.result === 'draw' ? '🤝' : '⚔️'}</div>
        <h1 class="t-hero">${titles[r.result]}</h1>
        <div class="g-versus">
          <div class="${r.result === 'win' ? 'is-win' : ''}"><small>Вы</small><b>${r.you.correct}/${round.total}</b><span>${mmss(r.you.ms)}</span></div>
          <i>vs</i>
          <div class="${r.result === 'lose' ? 'is-win' : ''}"><small>${esc(r.from)}</small><b>${r.them.correct}/${round.total}</b><span>${mmss(r.them.ms)}</span></div>
        </div>
        <div class="g-tiles" style="grid-template-columns:1fr"><div class="g-tile g-tile--xp"><small>Опыт</small><b>${icon.bolt}<span data-count="${r.xp}">0</span></b></div></div>
        <button class="btn btn--red" data-revenge>${r.result === 'lose' ? 'Реванш: вызвать самому' : 'Вызвать кого-то ещё'}</button>
        <button class="g-switch" data-out>Вернуться в игру</button>
      </div>`;
    countUp(H.app.querySelector('[data-count]'), r.xp);
    H.app.querySelector('[data-revenge]').onclick = () => { L = null; duelStart(); };
    H.app.querySelector('[data-out]').onclick = leave;
    await sleep(800);
    showAchievements(r.achievements);
  }

  // ---------- сертификаты ----------
  const certUrl = (unitId) => `${H.C.apiBase}/game/cert?c=${S.referral?.code}&u=${unitId}`;

  function certSheet(unitId) {
    const u = S.units.find((x) => x.id === unitId);
    if (!u || !S.referral?.code) return;
    const url = certUrl(unitId);
    track('game_cert', { unit: unitId });
    store.set('certSeen', [...new Set([...store.get('certSeen', []), unitId])]);
    const tg = H.tg;
    H.sheet(`
      <h2 class="t-h1">Сертификат</h2>
      <p class="t-lead">Раздел «${esc(u.title)}» пройден. Поделитесь — пусть коллеги видят.</p>
      <div class="g-cert"><span class="g-spin"></span><img src="${url}" alt="Сертификат ${esc(u.title)}" onload="this.previousElementSibling.remove()" /></div>
      ${tg?.shareToStory ? '<button class="btn btn--red" data-cert-story>Выложить в сторис</button>' : ''}
      <button class="btn ${tg?.shareToStory ? 'btn--line' : 'btn--red'}" data-cert-get>${tg?.downloadFile ? 'Скачать картинку' : 'Открыть картинку'}</button>`);
    const el = H.sheetEl;
    el.querySelector('[data-cert-story]')?.addEventListener('click', () => {
      try { tg.shareToStory(url, { text: `Прошёл раздел «${u.title}» в игре HUMA 🎓`, widget_link: { url: botLink('cert'), name: 'Играть' } }); } catch { H.open(url); }
    });
    el.querySelector('[data-cert-get]').addEventListener('click', () => {
      if (tg?.downloadFile) { try { return tg.downloadFile({ url, file_name: `HUMA-${unitId}.png` }); } catch {} }
      H.open(url);
    });
  }

  // ---------- пригласи друга ----------
  const refLink = () => {
    const code = S.referral?.code;
    if (!code) return '';
    return H.platform === 'tg' ? `https://t.me/${H.C.tgBotUsername}?start=ref_${code}` : `https://max.ru/${H.C.botUsername}?start=ref_${code}`;
  };

  function refCard() {
    const r = S.referral;
    if (!r?.code) return '';
    return `
      <section class="g-card g-ref">
        <div class="g-ref__top">
          <div>
            <span class="g-tag g-tag--red">Пригласи друга</span>
            <h2 class="t-h2">Играйте вместе</h2>
            <p class="g-ref__lead">Друг проходит первый урок — вам <b>+${r.reward.referrer} опыта и ❄️ заморозка</b> серии, другу — <b>+${r.reward.friend} опыта</b> на старте.</p>
          </div>
          <img class="float" src="img/social.webp" alt="" />
        </div>
        <div class="g-ref__link"><span>${esc(refLink().replace('https://', ''))}</span></div>
        <div class="g-ref__btns">
          <button class="btn btn--red" data-g="share">${icon.share}Пригласить</button>
          <button class="btn btn--line" data-g="copy">${icon.copy}Скопировать</button>
        </div>
        <div class="g-ref__stats">
          <span><b>${r.joined}</b>${plural(r.joined, 'пришёл', 'пришли', 'пришли')} по ссылке</span>
          <span><b>${r.active}</b>${plural(r.active, 'прошёл', 'прошли', 'прошли')} первый урок</span>
        </div>
        ${r.friends.length ? `<div class="g-ref__friends">${r.friends.map((f) => `<span class="${f.active ? 'is-on' : ''}" title="${f.active ? 'Прошёл первый урок' : 'Ещё не прошёл урок'}">${esc(f.name)}${f.active ? ' ✓' : ''}</span>`).join('')}</div>` : ''}
      </section>`;
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    try {
      const t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok;
    } catch { return false; }
  }

  async function share() {
    const link = refLink();
    const text = 'Залипаю в игру по маркетингу от HUMA: уроки на 2 минуты, опыт и топ недели. Давай наперегонки — по ссылке тебе +50 опыта на старте';
    track('game_invite', { via: 'share' });
    if (H.platform === 'tg') return H.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    if (navigator.share) { try { await navigator.share({ text: `${text}\n${link}` }); return; } catch {} }
    if (await copyText(`${text}\n${link}`)) H.toast('Ссылка скопирована — отправьте её другу');
    else H.toast(link, 8000);
  }

  function levelsSheet() {
    const p = S.profile;
    if (!S.levels) return;
    H.sheet(`
      <h2 class="t-h1">Уровни</h2>
      <p class="t-lead">${fmt(p.xp)} опыта. ${p.level.next ? `До «${esc(p.level.nextTitle)}» — ${fmt(p.level.next - p.xp)}` : 'Вы на вершине!'}</p>
      <ol class="g-ladder">
        ${S.levels.map((l, i) => {
          const st = i < p.level.index ? 'is-done' : i === p.level.index ? 'is-now' : '';
          return `<li class="${st}"><span class="g-ladder__n">${i < p.level.index ? '✓' : i + 1}</span><b>${esc(l.title)}</b><small>${fmt(l.xp)}</small></li>`;
        }).join('')}
      </ol>
      <p class="t-small">Опыт дают уроки, опрос дня и друзья, которых вы пригласили.</p>
      <button class="btn" data-close>Понятно</button>`);
    setTimeout(() => document.querySelector('.g-ladder .is-now')?.scrollIntoView({ block: 'center' }), 50);
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
      H.sheet(pollCard());
      if (r.xp) floatXp(r.xp, H.sheetEl.querySelector('.g-poll'));
      if (r.achievements?.length) setTimeout(() => showAchievements(r.achievements), 1500);
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
    H.app.onclick = dispatch;
  }
  // Шторка живёт вне #app — вешаем тот же обработчик один раз
  H.sheetEl.addEventListener('click', (e) => { if (H.tab === 'game' && !L) dispatch(e, true); });

  function dispatch(e, inSheet = false) {
    {
      const t = e.target.closest('[data-track],[data-lesson],[data-g],[data-vote],[data-pollview],[data-ach],[data-tab],[data-duel-accept],[data-duel-share],[data-cert],[data-unit]');
      if (!t) return;
      const close = () => { if (inSheet && !t.dataset.vote && !t.dataset.pollview) H.sheetEl.hidden = true; };
      close();
      if (t.dataset.tab) { haptic(); return H.showTab(t.dataset.tab); }
      if (t.dataset.unit) { haptic(); return renderUnit(t.dataset.unit); }
      if (t.dataset.track) return chooseTrack(t.dataset.track);
      if (t.dataset.duelAccept) return duelAccept(t.dataset.duelAccept);
      if (t.dataset.duelShare) return shareLink(botLink(`duel_${t.dataset.duelShare}`), `Вызываю на дуэль по маркетингу: у меня ${t.dataset.duelScore} из 5. Сможешь лучше?`, { name: 'game_invite', props: { via: 'duel' } });
      if (t.dataset.cert) return certSheet(t.dataset.cert);
      if (t.dataset.lesson && !t.disabled) return startLesson(t.dataset.lesson);
      if (t.dataset.vote !== undefined) return vote(Number(t.dataset.vote));
      if (t.dataset.pollview) { pollMine = t.dataset.pollview === 'mine'; return H.sheet(pollCard()); }
      if (t.dataset.ach) {
        const a = S.achievements.find((x) => x.key === t.dataset.ach);
        return H.sheet(`<div class="g-ach-big ${a.got ? 'is-got' : ''}"><span>${a.icon}</span></div><h2 class="t-h1">${esc(a.title)}</h2><p class="t-lead">${esc(a.desc)}</p><p class="t-small">${a.got ? 'Получено' : 'Ещё не получено'}</p><button class="btn" data-close>Понятно</button>`);
      }
      const g = t.dataset.g;
      if (g === 'reload') return page();
      if (g === 'tracks') return renderTracks(true);
      if (g === 'home') return renderHome();
      if (g === 'levels') return levelsSheet();
      if (g === 'duel') return duelStart();
      if (g === 'units') { openUnit = null; window.scrollTo(0, 0); return renderHome(); }
      if (g === 'duels') return duelsSheet();
      if (g === 'board') return boardSheet();
      if (g === 'profile') return profileSheet();
      if (g === 'poll') return S.poll && H.sheet(pollCard());
      if (g === 'ref') return H.sheet(refCard());
      if (g === 'share') return share();
      if (g === 'copy') return copyText(refLink()).then((ok) => { track('game_invite', { via: 'copy' }); H.toast(ok ? 'Ссылка скопирована' : refLink(), ok ? 2500 : 8000); });
      if (g === 'freeze') return H.sheet(`<div class="g-ach-big is-got"><span>❄️</span></div><h2 class="t-h1">Заморозки: ${S.profile.freezes}</h2><p class="t-lead">Если пропустите день, заморозка сработает сама и серия не сгорит. Одна заморозка — один пропущенный день. Получить: пригласить друга, который пройдёт первый урок. Максимум ${5}.</p><button class="btn" data-close>Понятно</button>`);
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
    H.sheet(`<h2 class="t-h1">${L?.duel ? 'Выйти из дуэли?' : 'Выйти из урока?'}</h2><p class="t-lead">${L?.duel ? 'Результат не сохранится.' : 'Прогресс этого урока не сохранится.'}</p>
      <button class="btn btn--red" data-g-exit>Выйти</button><button class="btn btn--line" data-close>Продолжить урок</button>`);
    H.sheetEl.querySelector('[data-g-exit]').onclick = () => { H.sheetEl.hidden = true; leave(); };
  }

  function leave() {
    L = null;
    clearInterval(timerId);
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
          ${L.duel ? `<span class="g-timer" data-duel-timer>${mmss(Date.now() - L.started)}</span>` : `<span class="g-combo ${L.combo >= 3 ? 'is-on' : ''}">${icon.flame}${L.combo}</span>`}
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
    if (!q) return L.duel ? duelFinish() : finish();
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
    } else if (L.duel) {
      // В дуэли ошибку не переигрываем — идём дальше
      L.mistakes.add(q.id);
      L.queue.shift();
      L.done++;
      L.combo = 0;
      H.notify('error');
      picked?.classList.add('is-wrong');
      if (q.type === 'quiz') H.app.querySelector(`.g-choice[data-i="${q.a}"]`)?.classList.add('is-answer');
      reveal?.();
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
    if (L.duel) {
      // В дуэли без разборов: короткий сигнал и следующий вопрос, время идёт
      fb.innerHTML = `<div class="g-feedback__head">${ok ? icon.check : icon.close}<b>${ok ? 'Верно' : `Неверно · ${esc(rightText)}`}</b></div>`;
      setTimeout(() => L && showQuestion(), ok ? 650 : 1300);
      return;
    }
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
          <div class="g-tile g-tile--xp"><small>Опыт</small><b>${icon.bolt}<span data-count="${r.xp + (r.welcome || 0)}">0</span></b></div>
          <div class="g-tile"><small>Точность</small><b>${acc}%</b></div>
          <div class="g-tile"><small>Время</small><b>${time}</b></div>
        </div>
        ${r.welcome ? `<div class="g-bonus">🤝 <span><b>+${r.welcome} опыта за приглашение</b><span>Вас позвал друг — ему тоже придёт награда</span></span></div>` : ''}
        ${r.frozeUsed ? `<div class="g-bonus g-bonus--ice">❄️ <span><b>Заморозка спасла серию</b><span>Потрачено: ${r.frozeUsed}. Пригласите друга, чтобы получить ещё</span></span></div>` : ''}
        ${r.streakUp ? `<div class="g-streak-up">${icon.flame}<span><b>Серия ${r.streak} ${plural(r.streak, 'день', 'дня', 'дней')}!</b><span>${r.streak === 1 ? 'Возвращайтесь завтра, чтобы не потерять её' : 'Огонь горит. Завтра — ещё один урок'}</span></span></div>` : ''}
        ${r.levelUp ? `<div class="g-levelup"><span>Новый уровень</span><b>${esc(r.levelUp)}</b></div>` : ''}
        ${r.todayXp >= r.goal && r.todayXp - r.xp < r.goal ? '<div class="g-goal-done">🎯 Цель дня выполнена</div>' : ''}
        <button class="btn btn--red" data-out>Продолжить</button>
      </div>`;
    H.notify('success');
    countUp(H.app.querySelector('[data-count]'), r.xp + (r.welcome || 0));
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

  // Пришёл по ссылке дуэли — предлагаем сыграть сразу, даже если человек на другой вкладке
  async function checkInvite() {
    if (!H.inMessenger) return;
    try {
      const r = await call('invite');
      const inv = r?.invite;
      if (!inv || store.get('duelSeen', '') === inv.code || L) return;
      store.set('duelSeen', inv.code);
      H.sheet(`<div class="g-duel-big">⚔️</div><h2 class="t-h1">${esc(inv.from)} вызывает вас на дуэль</h2>
        <p class="t-lead">5 вопросов по маркетингу на скорость. Результат соперника: ${inv.correct}/${inv.size} за ${mmss(inv.ms)}. Победителю +50 опыта.</p>
        <button class="btn btn--red btn--shine" data-g-acc>Принять вызов</button><button class="btn btn--line" data-close>Позже</button>`);
      H.sheetEl.querySelector('[data-g-acc]').onclick = () => {
        H.sheetEl.hidden = true;
        store.set('onboarded', true);
        duelAccept(inv.code);
      };
    } catch {}
  }
  setTimeout(checkInvite, 1200);

  window.HUMA_GAME = { page };
})();
