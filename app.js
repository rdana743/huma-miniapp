/* Мини-приложение Huma Marketing для MAX */
(function () {
  const C = HUMA_CONFIG;
  // Мост мессенджера: Telegram или MAX (в обычном браузере его нет)
  const TG = window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : null;
  const WA = TG || window.WebApp;
  const botLink = (payload) => TG ? `https://t.me/${C.tgBotUsername}?start=${payload}` : `https://max.ru/${C.botUsername}?start=${payload}`;
  const $app = document.getElementById('app');

  // ---------- хранилище (может быть недоступно — тогда просто не запоминаем) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('huma2:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('huma2:' + k, JSON.stringify(v)); } catch {} },
  };

  // ---------- утилиты ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => (n === 0 ? 'Бесплатно' : n == null ? 'По запросу' : n.toLocaleString('ru-RU') + ' ₽');
  const user = WA?.initDataUnsafe?.user || null;
  const firstName = user?.first_name || '';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhoto = (src) => /case-|trial/.test(src || '');

  function haptic(type = 'light') {
    try { WA?.HapticFeedback?.impactOccurred?.(type); } catch {}
  }

  // Открыть ссылку: оплата — во внешнем браузере, бот — внутри MAX
  function open(url) {
    try {
      if (/^https:\/\/t\.me\//.test(url) && TG?.openTelegramLink) return TG.openTelegramLink(url);
      if (/^https:\/\/max\.ru\//.test(url) && WA?.openMaxLink) return WA.openMaxLink(url);
      if (WA?.openLink) return WA.openLink(url);
    } catch {}
    window.open(url, '_blank', 'noopener');
  }

  // Купить: есть ссылка на оплату — платим, нет — в бота оставить заявку
  function buy(id, payUrl) {
    haptic('medium');
    const pending = store.get('pending', []);
    if (!pending.includes(id)) store.set('pending', [...pending, id]);
    open(payUrl || botLink('buy_' + id));
  }

  const ic = {
    home: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/></svg>',
    shop: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 8h14l-1.2 11a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    me: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.8 3.6-5.5 7-5.5s6.2 1.7 7 5.5" stroke-linecap="round"/></svg>',
    promo: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 12.5V5a1 1 0 0 1 1-1h7.5L20 11.5 12.5 19z"/><circle cx="8.5" cy="8.5" r="1.4"/></svg>',
    key: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 5h14v10H10l-4 4v-4H5z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  // ---------- таймер персонального предложения ----------
  const offerEnd = () => { const s = store.get('offerStart', null); return s ? s + C.offerHours * 3600e3 : null; };
  const offerLeft = () => { const e = offerEnd(); return e ? Math.max(0, e - Date.now()) : 0; };
  const parts = (ms) => { const s = Math.floor(ms / 1000); return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')); };
  const fmtLeft = (ms) => parts(ms).join(':');
  const fmtBig = (ms) => parts(ms).join('<b>:</b>');
  setInterval(() => {
    const left = offerLeft();
    document.querySelectorAll('[data-timer]').forEach((el) => (el.textContent = fmtLeft(left)));
    document.querySelectorAll('[data-timer-big]').forEach((el) => (el.innerHTML = fmtBig(left)));
    if (!left) document.querySelector('.offer-pill')?.remove();
  }, 1000);

  const maxDiscount = () => Math.max(...C.tariffs.map((t) => Math.round((1 - t.price / t.old) * 100)));

  // ---------- онбординг ----------
  const STEPS = 5;
  const topbar = (i, dark) => `
    <div class="topbar">
      <img class="topbar__logo" src="img/logo.svg" alt="HUMA" />
      <div class="steps" aria-label="Шаг ${i + 1} из ${STEPS}">${Array.from({ length: STEPS }, (_, j) => `<span class="${j <= i ? 'on' : ''}"></span>`).join('')}</div>
    </div>`;

  function screenWelcome() {
    $app.innerHTML = `
      <section class="screen">
        <div class="fan" aria-hidden="true">
          ${C.heroCases.map((c, i) => `<div class="fan__card" style="--i:${i}"><img src="${c.img}" alt="" /><span>${esc(c.name)}</span></div>`).join('')}
        </div>
        <div class="screen__body">
          <p class="t-lead rise" style="--i:4">${firstName ? `Привет, ${esc(firstName)}!` : 'Привет!'} Это продукты команды huma.marketing</p>
          <h1 class="t-hero welcome__title rise" style="--i:5">Маркетинг, который приносит деньги</h1>
          <img class="welcome__logo" src="img/logo.svg" alt="HUMA" />
        </div>
        <div class="screen__foot rise" style="--i:8"><button class="btn btn--shine" data-go="products">Продолжить</button></div>
      </section>`;
  }

  function screenProducts() {
    $app.innerHTML = `
      <section class="screen">
        ${topbar(1)}
        <div class="screen__body">
          <h1 class="t-h1 rise" style="--i:0">Наши продукты</h1>
          <p class="t-lead rise" style="--i:1">От готовых инструментов до команды, которая сделает всё за вас</p>
          ${C.products.map((p, i) => `
            <article class="prod rise" style="--i:${i + 2}">
              <div>
                <h2 class="t-h3">${esc(p.title)}</h2>
                <p>${esc(p.text)}</p>
                <span class="prod__tag">${esc(p.tag)}</span>
              </div>
              <img class="prod__img float" style="animation-delay:-${i * 1.4}s" src="${p.img}" alt="" />
            </article>`).join('')}
        </div>
        <div class="screen__foot rise" style="--i:6"><button class="btn" data-go="bonus">Продолжить</button></div>
      </section>`;
  }

  function screenBonus() {
    $app.innerHTML = `
      <section class="screen screen--dark on-dark">
        ${topbar(2, true)}
        <div class="bonus">
          <img class="bonus__img spin-in" src="img/coins.webp" alt="" />
          <h1 class="t-h1 rise" style="--i:3">Забери бонус <span class="red">новичка</span></h1>
          <div class="bonus__card rise" style="--i:4">
            <p>Для новых пользователей — <b class="red">персональная скидка до −${maxDiscount()}%</b></p>
            <p class="t-lead">Ответь на 3 вопроса ассистента HUMA. Он подберёт продукт под твою задачу и бюджет.</p>
          </div>
        </div>
        <div class="screen__foot rise" style="--i:6">
          <button class="btn btn--red btn--shine" data-go="chat">Поехали</button>
          <button class="btn btn--line" data-go="app">Пропустить</button>
        </div>
      </section>`;
  }

  async function screenChat() {
    $app.innerHTML = `
      <section class="screen">
        ${topbar(3)}
        <div class="chat rise" style="--i:0">
          <div class="chat__head">
            <div class="chat__avatar"><img src="img/mark.webp" alt="" /></div>
            <div><div class="chat__name">Ассистент HUMA</div><div class="t-small">в сети · подбирает продукт под задачу</div></div>
          </div>
          <div class="chat__log" id="log" aria-live="polite"></div>
          <div class="chat__answers" id="answers"></div>
        </div>
      </section>`;
    const log = document.getElementById('log');
    const answers = document.getElementById('answers');
    const scroll = () => (log.scrollTop = log.scrollHeight);

    const say = async (html, delay = 700) => {
      const t = document.createElement('div');
      t.className = 'msg msg--bot';
      t.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
      log.appendChild(t); scroll();
      await sleep(reduced ? 0 : delay);
      t.innerHTML = html; scroll();
      return t;
    };
    const me = (text) => {
      const m = document.createElement('div');
      m.className = 'msg msg--me';
      m.textContent = text;
      log.appendChild(m); scroll();
    };
    const ask = (options) =>
      new Promise((resolve) => {
        answers.innerHTML = options.map((o, i) => `<button class="btn btn--line" style="--i:${i}" data-v="${esc(o.v)}">${esc(o.t)}</button>`).join('');
        answers.onclick = (e) => {
          const b = e.target.closest('[data-v]');
          if (!b) return;
          haptic();
          answers.innerHTML = '';
          const o = options.find((x) => x.v === b.dataset.v);
          me(o.t);
          resolve(o.v);
        };
      });

    await sleep(reduced ? 0 : 350);
    const res = {};
    for (const step of C.quiz) {
      if (step.intro) await say(esc(firstName ? `${firstName}, ${step.intro.charAt(0).toLowerCase()}${step.intro.slice(1)}` : step.intro), 700);
      await say(esc(step.q) + (step.hint ? `<span class="hint">${esc(step.hint)}</span>` : ''), 800);
      res[step.id] = await ask(step.options);
    }

    // «Думает»: вращающийся 3D-объект вместо простых точек
    const think = document.createElement('div');
    think.className = 'msg msg--think';
    think.innerHTML = '<img src="img/arrow.webp" alt="" /><span class="t-small">Анализирую ответы…</span>';
    log.appendChild(think); scroll();
    await sleep(reduced ? 0 : 1800);
    think.remove();

    const rec = recommend(res);
    store.set('quiz', res);
    store.set('recommended', rec.tariff);
    await say(rec.text, 900);
    await say(`🎁 Как и обещал — персональная скидка до <strong>−${maxDiscount()}%</strong>. Она действует ${C.offerHours} часа, успей забрать.`, 1000);
    if (!store.get('offerStart', null)) store.set('offerStart', Date.now());
    answers.innerHTML = `<button class="btn btn--red btn--shine rise" data-go="offer">Забрать предложение</button>`;
  }

  function recommend(r) {
    if (r.budget === 'big' || (r.role === 'owner' && r.goal === 'system')) {
      return { tariff: 'ultra', text: 'Я посмотрел твои ответы. При таком масштабе быстрее всего окупится работа с командой.<br><br><strong>Ultra</strong> — стратегия-сессия с HUMA, аудит воронки и сквозной аналитики, клуб на полгода и вся библиотека шаблонов.' };
    }
    if (r.role === 'marketer' || r.goal === 'cheaper' || r.budget === 'mid') {
      return { tariff: 'pro', text: 'Я посмотрел твои ответы. Главный резерв — в настройках рекламы и аналитике.<br><br><strong>Pro</strong> — разберём твой рекламный кабинет, дадим всю библиотеку шаблонов и клуб на 3 месяца, чтобы снижать цену заявки своими силами.' };
    }
    return { tariff: 'basic', text: 'Я посмотрел твои ответы. Тебе нужна крепкая база.<br><br><strong>Basic</strong> — клуб на месяц и три гайда: как запускать рекламу, считать окупаемость и не сливать бюджет.' };
  }

  function screenOffer(fromApp) {
    const rec = store.get('recommended', 'pro');
    let selected = rec;
    const render = (first) => {
      $app.innerHTML = `
        <section class="screen screen--dark on-dark" style="${first ? '' : 'animation:none'}">
          ${fromApp ? `<div class="topbar"><img class="topbar__logo" src="img/logo.svg" alt="HUMA" /><button class="sheet__close" style="position:static;background:#1a1a1a;color:#fff" data-go="app" aria-label="Закрыть">${ic.close}</button></div>` : topbar(4, true)}
          <div class="screen__body">
            <div class="timer ${first ? 'rise' : ''}" style="--i:0">
              <span class="t-lead">Скидка действует</span>
              <span class="timer__time" data-timer-big>${fmtBig(offerLeft())}</span>
            </div>
            <div class="tariffs" role="radiogroup" aria-label="Тарифы">
              ${C.tariffs.map((t, i) => {
                const off = Math.round((1 - t.price / t.old) * 100);
                const badge = t.id === rec ? 'Рекомендуем тебе' : t.badge;
                return `
                <button class="tariff ${first ? 'rise' : ''}" style="--i:${i + 1}" role="radio" aria-checked="${t.id === selected}" data-tariff="${t.id}">
                  <div class="tariff__top">
                    <span class="tariff__name">${esc(t.name)}</span>
                    ${badge ? `<span class="tariff__badge ${t.id === rec ? '' : 'tariff__badge--soft'}">${esc(badge)}</span>` : ''}
                    <span class="radio"></span>
                  </div>
                  <div class="tariff__price">
                    <span class="tariff__now">${rub(t.price)}</span>
                    <span class="tariff__old">${rub(t.old)}</span>
                    <span class="tariff__off">−${off}%</span>
                  </div>
                  <ul>${t.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
                </button>`;
              }).join('')}
            </div>
          </div>
          <div class="screen__foot">
            <button class="btn btn--red btn--shine" data-buy-tariff>Оформить ${esc(C.tariffs.find((t) => t.id === selected).name)}</button>
            ${fromApp ? '' : '<button class="btn btn--line" data-go="app">Посмотреть все продукты</button>'}
          </div>
        </section>`;
    };
    render(true);
    $app.onclick = (e) => {
      const t = e.target.closest('[data-tariff]');
      if (t) { haptic(); selected = t.dataset.tariff; const y = window.scrollY; render(false); window.scrollTo(0, y); return; }
      if (e.target.closest('[data-buy-tariff]')) {
        const tar = C.tariffs.find((x) => x.id === selected);
        return buy('tariff_' + tar.id, tar.payUrl);
      }
      route(e);
    };
  }

  // ---------- основное приложение ----------
  let tab = 'home';

  function shell(content) {
    const tabs = [['home', 'Главная'], ['shop', 'Магазин'], ['me', 'Кабинет'], ['promo', 'Акции']];
    const left = offerLeft();
    $app.innerHTML = `
      <main class="page">${content}</main>
      ${left && (tab === 'shop' || tab === 'me') ? `<button class="offer-pill" data-go="offerApp"><img src="img/coins.webp" alt="" /><span><b>Ваша скидка</b><span data-timer>${fmtLeft(left)}</span></span></button>` : ''}
      <nav class="tabbar" aria-label="Разделы">
        ${tabs.map(([id, name]) => `<button class="tab" data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}>${ic[id]}<span>${name}</span></button>`).join('')}
      </nav>`;
  }

  const head = () => `<div class="page__head"><img class="page__logo" src="img/logo.svg" alt="HUMA" />${firstName ? `<span class="hello">${esc(firstName)}</span>` : ''}</div>`;

  function pageHome() {
    const seen = store.get('seenStories', []);
    const left = offerLeft();
    shell(`
      ${head()}
      <div class="stories">
        ${C.stories.map((s) => `
          <button class="story ${seen.includes(s.id) ? 'seen' : ''}" data-story="${s.id}">
            <span class="story__ring"><img src="${s.img}" alt="" /></span>${esc(s.title)}
          </button>`).join('')}
      </div>
      ${left ? `
        <button class="banner" data-go="offerApp">
          <span class="t-h2">Ваше предложение</span>
          <span class="t-lead">Скидка до −${maxDiscount()}% на тарифы с клубом и разбором рекламы</span>
          <span class="banner__time" data-timer>${fmtLeft(left)}</span>
          <img class="banner__img float" src="img/coins.webp" alt="" />
        </button>` : `
        <button class="banner" data-go="chat">
          <span class="t-h2">Подбор за минуту</span>
          <span class="t-lead">3 вопроса ассистенту — и персональная скидка на 48 часов</span>
          <img class="banner__img float" src="img/arrow.webp" alt="" />
        </button>`}
      <div class="h-row"><h2 class="t-h2">Кейсы</h2><span class="t-small">листайте →</span></div>
      <div class="cases">
        ${C.heroCases.map((c) => `
          <button class="case" data-story="cases"><img src="${c.img}" alt="" loading="lazy" />
            <span class="case__cap"><b>${esc(c.name)}</b><span>Смотреть кейс</span></span></button>`).join('')}
      </div>
      <h2 class="t-h2">Полезное</h2>
      ${C.articles.map((a, i) => `
        <article class="article collapsed" data-article="${i}">
          <h3 class="t-h3">${esc(a.title)}</h3>
          <img class="article__img" src="${a.img}" alt="" loading="lazy" />
          <div class="article__body">${a.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
          <div class="article__foot"><button class="article__more" data-more="${i}">Читать полностью</button><span class="t-small">${esc(a.date)}</span></div>
        </article>`).join('')}
    `);
  }

  function pageShop() {
    shell(`
      ${head()}
      <h1 class="t-h1">Магазин</h1>
      ${C.shop.map((sec) => `
        <h2 class="t-h2">${esc(sec.title)}</h2>
        <div class="shelf">
          ${sec.items.map((it) => `
            <button class="item" data-item="${it.id}">
              <span class="item__cover ${isPhoto(it.img) ? 'item__cover--photo' : ''}"><img src="${it.img}" alt="" loading="lazy" /></span>
              <span class="item__meta"><span class="item__name">${esc(it.name)}</span><span class="item__price ${it.price === 0 ? 'free' : ''}">${rub(it.price)}</span></span>
            </button>`).join('')}
        </div>`).join('')}
    `);
  }

  function pageMe() {
    const pending = store.get('pending', []);
    const all = [...C.shop.flatMap((s) => s.items), ...C.tariffs.map((t) => ({ id: 'tariff_' + t.id, name: 'Тариф ' + t.name, img: 'img/coins.webp' }))];
    const list = pending.map((id) => all.find((x) => x.id === id)).filter(Boolean);
    shell(`
      ${head()}
      <div class="cabinet on-dark">
        <span class="t-h1">Кабинет</span>
        <span class="t-lead">${firstName ? esc(firstName) + ', здесь' : 'Здесь'} ваши заказы и доступы</span>
        <img class="float" src="img/crm.webp" alt="" />
      </div>
      <button class="row-btn" data-contact>
        <span class="row-btn__icon row-btn__icon--red">${ic.chat}</span>
        <span><b>Написать менеджеру</b><span class="t-small">Вопросы по оплате и доступам</span></span>
      </button>
      <h2 class="t-h2">Мои покупки</h2>
      ${list.length ? list.map((it) => `
        <div class="row-btn">
          <span class="row-btn__icon"><img src="${it.img}" alt="" /></span>
          <span><b>${esc(it.name)}</b><span class="t-small">Доступ откроется после подтверждения оплаты — пришлём в бот</span></span>
        </div>`).join('') : `
        <div class="empty">
          <img class="float" src="img/folder.webp" alt="" />
          <p>Покупок пока нет. Гайды — от 790 ₽, а первый месяц работы агентства — бесплатно.</p>
          <button class="btn" data-tab="shop">Открыть магазин</button>
        </div>`}
    `);
  }

  function pagePromo(result) {
    const left = offerLeft();
    shell(`
      ${head()}
      <h1 class="t-h1">Акции</h1>
      <div class="row-btn">
        <span class="row-btn__icon">${ic.key}</span>
        <span><b>Промокод</b><span class="t-small">Код из канала HUMA или от менеджера</span></span>
      </div>
      <form class="field" id="promoForm">
        <input id="promoInput" placeholder="Например, HUMA10" aria-label="Промокод" autocomplete="off" />
        <button class="btn btn--red" type="submit">Применить</button>
      </form>
      ${result || ''}
      <button class="row-btn" data-go="${left ? 'offerApp' : 'chat'}">
        <span class="row-btn__icon"><img src="img/coins.webp" alt="" /></span>
        <span><b>${left ? 'Персональная скидка' : 'Получить персональную скидку'}</b>
        <span class="t-small">${left ? `До −${maxDiscount()}%, осталось <span data-timer>${fmtLeft(left)}</span>` : '3 вопроса ассистенту — и скидка на 48 часов'}</span></span>
      </button>
      <button class="row-btn" data-item="free_month">
        <span class="row-btn__icon"><img src="img/trial.webp" alt="" /></span>
        <span><b>Стартовый месяц digital — 0 ₽</b><span class="t-small">Понравился результат — продолжаем. Нет — вы ничем не обязаны.</span></span>
      </button>
    `);
    document.getElementById('promoForm').onsubmit = (e) => {
      e.preventDefault();
      const code = document.getElementById('promoInput').value.trim().toUpperCase();
      if (!code) return;
      const ok = C.promo[code];
      haptic(ok ? 'medium' : 'light');
      store.set('promoCode', ok ? code : null);
      pagePromo(ok
        ? `<div class="promo-result ok">Промокод ${esc(code)} активирован: ${esc(ok)}. Назовите его менеджеру при оплате.</div>`
        : `<div class="promo-result">Промокод ${esc(code)} не найден. Проверьте написание.</div>`);
    };
  }

  // ---------- шторка ----------
  const $sheet = document.getElementById('sheet');
  const $sheetBody = document.getElementById('sheetBody');
  function sheet(html) {
    $sheetBody.innerHTML = `<div class="sheet__content">${html}</div>`;
    $sheet.hidden = false;
    $sheet.querySelector('.sheet__close').focus();
  }
  $sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) $sheet.hidden = true;
    const b = e.target.closest('[data-buy]');
    if (b) {
      const it = C.shop.flatMap((s) => s.items).find((x) => x.id === b.dataset.buy);
      buy(it.id, it.payUrl);
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $sheet.hidden = true; });

  function openItem(id) {
    const it = C.shop.flatMap((s) => s.items).find((x) => x.id === id);
    if (!it) return;
    const label = it.payUrl ? `Оплатить ${rub(it.price)}` : it.price ? 'Оформить заказ' : 'Оставить заявку';
    sheet(`
      <div class="sheet__hero ${isPhoto(it.img) ? 'sheet__hero--photo' : ''}"><img class="${isPhoto(it.img) ? '' : 'float'}" src="${it.img}" alt="" /></div>
      <h2 class="t-h1">${esc(it.name)}</h2>
      <div class="sheet__price ${it.price === 0 ? 'red' : ''}">${rub(it.price)}</div>
      <p class="t-lead">${esc(it.text)}</p>
      <button class="btn btn--red btn--shine" data-buy="${it.id}">${label}</button>
      <p class="t-small">${it.payUrl ? 'Оплата откроется в браузере. Доступ пришлём в бот.' : 'Откроется чат с ботом — менеджер свяжется с вами.'}</p>
    `);
  }

  function openStory(id) {
    const s = C.stories.find((x) => x.id === id);
    const seen = store.get('seenStories', []);
    if (!seen.includes(id)) store.set('seenStories', [...seen, id]);
    sheet(`
      <div class="sheet__hero sheet__hero--photo"><img src="${s.img}" alt="" /></div>
      <h2 class="t-h1">${esc(s.title)}</h2>
      <p class="t-lead">${esc(s.body)}</p>
      <button class="btn" data-close>Понятно</button>`);
    document.querySelector(`[data-story="${id}"].story`)?.classList.add('seen');
  }

  // ---------- навигация ----------
  function go(where) {
    window.scrollTo(0, 0);
    $app.onclick = route;
    switch (where) {
      case 'welcome': return screenWelcome();
      case 'products': return screenProducts();
      case 'bonus': return screenBonus();
      case 'chat': return screenChat();
      case 'offer': return screenOffer(false);
      case 'offerApp': return screenOffer(true);
      case 'app':
        store.set('onboarded', true);
        return showTab(tab);
    }
  }

  function showTab(t) {
    tab = t;
    window.scrollTo(0, 0);
    $app.onclick = route;
    ({ home: pageHome, shop: pageShop, me: pageMe, promo: () => pagePromo() })[t]();
  }

  function route(e) {
    const el = e.target.closest('[data-go],[data-tab],[data-item],[data-story],[data-more],[data-contact]');
    if (!el) return;
    if (el.dataset.go) { haptic(); return go(el.dataset.go); }
    if (el.dataset.tab) { haptic(); return showTab(el.dataset.tab); }
    if (el.dataset.item) return openItem(el.dataset.item);
    if (el.dataset.story) return openStory(el.dataset.story);
    if (el.dataset.more !== undefined) {
      const a = document.querySelector(`[data-article="${el.dataset.more}"]`);
      const collapsed = a.classList.toggle('collapsed');
      el.textContent = collapsed ? 'Читать полностью' : 'Свернуть';
      return;
    }
    if (el.hasAttribute('data-contact')) return open(botLink('buy_contact'));
  }

  // ---------- старт ----------
  try { WA?.ready?.(); } catch {}
  try { TG?.expand?.(); TG?.setHeaderColor?.('#ffffff'); TG?.setBackgroundColor?.('#ffffff'); } catch {}
  try { WA?.BackButton?.onClick?.(() => { if (!$sheet.hidden) $sheet.hidden = true; else go('app'); }); } catch {}
  $app.onclick = route;
  go(store.get('onboarded', false) ? 'app' : 'welcome');
})();
