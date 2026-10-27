/* Мини-приложение Huma Marketing для MAX */
(function () {
  const C = HUMA_CONFIG;
  const WA = window.WebApp; // мост MAX (нет в обычном браузере)
  const $app = document.getElementById('app');

  // ---------- хранилище (может быть недоступно — тогда просто не запоминаем) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('huma:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('huma:' + k, JSON.stringify(v)); } catch {} },
  };

  // ---------- утилиты ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => (n === 0 ? 'Бесплатно' : n == null ? 'По запросу' : n.toLocaleString('ru-RU') + ' ₽');
  const user = WA?.initDataUnsafe?.user || null;
  const firstName = user?.first_name || '';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function haptic(type = 'light') {
    try { WA?.HapticFeedback?.impactOccurred?.(type); } catch {}
  }

  // Открыть ссылку: оплата — во внешнем браузере, бот — внутри MAX
  function open(url) {
    try {
      if (/^https:\/\/max\.ru\//.test(url) && WA?.openMaxLink) return WA.openMaxLink(url);
      if (WA?.openLink) return WA.openLink(url);
    } catch {}
    window.open(url, '_blank', 'noopener');
  }

  // Купить: есть ссылка на оплату — идём платить, нет — в бота оставить заявку
  function buy(id, payUrl) {
    haptic('medium');
    const pending = store.get('pending', []);
    if (!pending.includes(id)) store.set('pending', [...pending, id]);
    open(payUrl || `https://max.ru/${C.botUsername}?start=buy_${id}`);
  }

  const icons = {
    club: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5M15 14.3c2.3-.2 4.6 1.2 5.3 4.2"/></svg>',
    library: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z"/><path d="M13 4h5.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H13z"/><path d="M7 8h1.5M16 8h1.5"/></svg>',
    agency: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/></svg>',
    home: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/></svg>',
    shop: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 8h14l-1.2 11a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    me: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.8 3.6-5.5 7-5.5s6.2 1.7 7 5.5" stroke-linecap="round"/></svg>',
    promo: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 12.5V5a1 1 0 0 1 1-1h7.5L20 11.5 12.5 19z"/><circle cx="8.5" cy="8.5" r="1.4"/></svg>',
    key: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 5h14v10H10l-4 4v-4H5z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 8h14l-1.2 11a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    gift2: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v7h14v-7M12 9v11"/><path d="M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/></svg>',
    gift: '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v7h14v-7M12 9v11"/><path d="M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/></svg>',
  };

  // ---------- таймер персонального предложения ----------
  const offerEnd = () => {
    const start = store.get('offerStart', null);
    return start ? start + C.offerHours * 3600e3 : null;
  };
  const offerLeft = () => { const e = offerEnd(); return e ? Math.max(0, e - Date.now()) : 0; };
  const fmtLeft = (ms) => {
    const s = Math.floor(ms / 1000);
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
  };
  setInterval(() => {
    document.querySelectorAll('[data-timer]').forEach((el) => (el.textContent = fmtLeft(offerLeft())));
    const pill = document.querySelector('.offer-pill');
    if (pill && !offerLeft()) pill.remove();
  }, 1000);

  // ---------- онбординг ----------
  const STEPS = ['welcome', 'products', 'bonus', 'chat', 'offer'];
  const progress = (i, brand) =>
    `<div class="progress" aria-hidden="true">${STEPS.map((_, j) => `<span class="${j <= i ? 'on' : ''}"></span>`).join('')}</div>`;

  function screenWelcome() {
    $app.innerHTML = `
      <section class="screen screen--brand">
        ${progress(0)}
        <div class="hero">
          <div class="wordmark">HUMA<small>marketing</small></div>
          <span class="metric metric--up">Заявки <b>↑</b></span>
          <span class="metric metric--down">Цена заявки <b>↓</b></span>
          <span class="metric metric--up">Продажи <b>↑</b></span>
        </div>
        <div class="welcome-text">
          <h1 class="h1">${firstName ? `Привет, ${esc(firstName)}!` : 'Привет!'}</h1>
          <p class="lead">Здесь продукты команды HUMA: клуб, гайды и услуги агентства. Маркетинг, который приносит деньги.</p>
        </div>
        <div class="screen__foot"><button class="btn btn--light" data-go="products">Продолжить</button></div>
      </section>`;
  }

  function screenProducts() {
    $app.innerHTML = `
      <section class="screen">
        ${progress(1)}
        <div class="screen__body">
          <h1 class="h2">Наши продукты</h1>
          <p class="lead">От готовых инструментов до работы команды под ключ</p>
          ${C.products.map((p) => `
            <article class="prod">
              <div class="prod__icon">${icons[p.icon]}</div>
              <div>
                <h2 class="h3">${esc(p.title)}</h2>
                <p>${esc(p.text)}</p>
                <span class="prod__tag">${esc(p.tag)}</span>
              </div>
            </article>`).join('')}
        </div>
        <div class="screen__foot"><button class="btn btn--brand" data-go="bonus">Продолжить</button></div>
      </section>`;
  }

  function screenBonus() {
    $app.innerHTML = `
      <section class="screen">
        ${progress(2)}
        <div class="bonus">
          <div class="bonus__card">
            <div class="bonus__gift">${icons.gift}</div>
            <h1 class="h2">Забери бонус новичка</h1>
            <p class="lead">Ответь на 3 вопроса ассистента HUMA — он подберёт продукт под твою задачу и даст персональную скидку на ${C.offerHours} часа.</p>
          </div>
        </div>
        <div class="screen__foot">
          <button class="btn btn--brand" data-go="chat">Поехали</button>
          <button class="btn btn--ghost" data-go="app">Пропустить</button>
        </div>
      </section>`;
  }

  async function screenChat() {
    $app.innerHTML = `
      <section class="screen">
        ${progress(3)}
        <div class="chat">
          <div class="chat__head">
            <div class="avatar">H</div>
            <div><b>Ассистент HUMA</b><div class="small">подбирает продукт под задачу</div></div>
          </div>
          <div class="chat__log" id="log" aria-live="polite"></div>
          <div class="chat__answers" id="answers"></div>
        </div>
      </section>`;
    const log = document.getElementById('log');
    const answers = document.getElementById('answers');

    const say = async (html, delay = 700) => {
      const t = document.createElement('div');
      t.className = 'msg msg--bot';
      t.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
      log.appendChild(t);
      log.scrollTop = log.scrollHeight;
      await sleep(reduced ? 0 : delay);
      t.innerHTML = html;
      log.scrollTop = log.scrollHeight;
    };
    const me = (text) => {
      const m = document.createElement('div');
      m.className = 'msg msg--me';
      m.textContent = text;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    };
    const ask = (options) =>
      new Promise((resolve) => {
        answers.innerHTML = options.map((o) => `<button class="btn btn--ghost" data-v="${esc(o.v)}">${esc(o.t)}</button>`).join('');
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

    const res = {};
    for (const step of C.quiz) {
      if (step.intro) await say(esc(firstName ? `${firstName}, ${step.intro.charAt(0).toLowerCase()}${step.intro.slice(1)}` : step.intro), 600);
      await say(esc(step.q) + (step.hint ? `<span class="hint">${esc(step.hint)}</span>` : ''), 800);
      res[step.id] = await ask(step.options);
    }

    await say('Принято. Секунду, подбираю вариант…', 600);
    const rec = recommend(res);
    store.set('quiz', res);
    store.set('recommended', rec.tariff);
    await say(rec.text, 1400);
    await say(`Для тебя персональная скидка до −${maxDiscount()}%. Она действует ${C.offerHours} часа — забирай.`, 900);
    if (!store.get('offerStart', null)) store.set('offerStart', Date.now());
    answers.innerHTML = `<button class="btn btn--brand" data-go="offer">Забрать предложение</button>`;
  }

  function recommend(r) {
    if (r.budget === 'big' || (r.role === 'owner' && r.goal === 'system')) {
      return { tariff: 'ultra', text: '<strong>Тебе подойдёт Ultra.</strong> При таком масштабе быстрее всего окупится работа с командой: стратегия-сессия, аудит воронки и клуб на полгода, чтобы держать руку на пульсе.' };
    }
    if (r.role === 'marketer' || r.goal === 'cheaper' || r.budget === 'mid') {
      return { tariff: 'pro', text: '<strong>Тебе подойдёт Pro.</strong> Разберём твой рекламный кабинет, а библиотека шаблонов и клуб помогут снизить стоимость заявки своими силами.' };
    }
    return { tariff: 'basic', text: '<strong>Начни с Basic.</strong> Клуб на месяц и три гайда дадут базу: как запускать рекламу, считать окупаемость и не сливать бюджет.' };
  }
  const maxDiscount = () => Math.max(...C.tariffs.map((t) => Math.round((1 - t.price / t.old) * 100)));

  function screenOffer(fromApp) {
    const rec = store.get('recommended', 'pro');
    let selected = rec;
    const render = () => {
      $app.innerHTML = `
        <section class="screen">
          ${fromApp ? '' : progress(4)}
          <div class="screen__body">
            <h1 class="h2">Персональное предложение</h1>
            <div class="timer"><span>Скидка действует ещё</span><span class="timer__time" data-timer>${fmtLeft(offerLeft())}</span></div>
            <div role="radiogroup" aria-label="Тарифы" style="display:grid;gap:10px">
              ${C.tariffs.map((t) => {
                const off = Math.round((1 - t.price / t.old) * 100);
                const badge = t.id === rec ? 'Рекомендуем тебе' : t.badge;
                return `
                <button class="tariff" role="radio" aria-checked="${t.id === selected}" data-tariff="${t.id}">
                  <div class="tariff__top">
                    <span class="h3">${esc(t.name)}</span>
                    ${badge ? `<span class="tariff__badge">${esc(badge)}</span>` : ''}
                    <span class="radio"></span>
                  </div>
                  <div class="tariff__price">
                    <span class="tariff__now">${rub(t.price)}</span>
                    <span class="tariff__old">${rub(t.old)}</span>
                    <span class="tariff__off">−${off}%</span>
                  </div>
                  <ul>${t.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
                </button>`;
              }).join('')}
            </div>
          </div>
          <div class="screen__foot">
            <button class="btn btn--brand" data-buy-tariff>Оформить ${esc(C.tariffs.find((t) => t.id === selected).name)}</button>
            <button class="btn btn--ghost" data-go="app">${fromApp ? 'Назад' : 'Посмотреть все продукты'}</button>
          </div>
        </section>`;
    };
    render();
    $app.onclick = (e) => {
      const t = e.target.closest('[data-tariff]');
      if (t) { haptic(); selected = t.dataset.tariff; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
      if (e.target.closest('[data-buy-tariff]')) {
        const tar = C.tariffs.find((x) => x.id === selected);
        buy('tariff_' + tar.id, tar.payUrl);
        return;
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
      ${left && (tab === 'shop' || tab === 'me') ? `<button class="offer-pill" data-go="offerApp"><b>Ваша скидка</b><span data-timer>${fmtLeft(left)}</span></button>` : ''}
      <nav class="tabbar" aria-label="Разделы">
        ${tabs.map(([id, name]) => `<button class="tab" data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}>${icons[id]}<span>${name}</span></button>`).join('')}
      </nav>`;
  }

  function pageHome() {
    const seen = store.get('seenStories', []);
    const left = offerLeft();
    shell(`
      <div class="page__head"><span class="logo">HUMA</span>${firstName ? `<span class="small">${esc(firstName)}</span>` : ''}</div>
      <div class="stories">
        ${C.stories.map((s) => `
          <button class="story ${seen.includes(s.id) ? 'seen' : ''}" data-story="${s.id}">
            <span class="story__ring"><span>${icons[s.icon] || icons.club}</span></span>${esc(s.title)}
          </button>`).join('')}
      </div>
      ${left ? `
        <button class="banner" data-go="offerApp">
          <span class="h3">Ваше персональное предложение</span>
          <span class="lead">Скидка до −${maxDiscount()}% на тарифы с клубом и разбором рекламы</span>
          <span class="banner__time" data-timer>${fmtLeft(left)}</span>
        </button>` : `
        <button class="banner" data-go="chat">
          <span class="h3">Подобрать продукт за минуту</span>
          <span class="lead">Ответь на 3 вопроса ассистента и получи персональную скидку</span>
        </button>`}
      <h2 class="h2 section-title">Статьи</h2>
      ${C.articles.map((a, i) => `
        <article class="article collapsed" data-article="${i}">
          <h3 class="h3">${esc(a.title)}</h3>
          <div class="article__body">${a.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
          <button class="article__more" data-more="${i}">Читать полностью</button>
          <span class="small">${esc(a.date)}</span>
        </article>`).join('')}
    `);
  }

  function pageShop() {
    shell(`
      <h1 class="h2">Магазин</h1>
      ${C.shop.map((sec) => `
        <h2 class="h3 section-title">${esc(sec.title)}</h2>
        <div class="shelf">
          ${sec.items.map((it) => `
            <button class="item" data-item="${it.id}">
              <span><span class="item__name">${esc(it.name)}</span><span class="item__text">${esc(it.text)}</span></span>
              <span class="item__price ${it.price === 0 ? 'free' : ''}">${rub(it.price)}</span>
            </button>`).join('')}
        </div>`).join('')}
    `);
  }

  function pageMe() {
    const pending = store.get('pending', []);
    const all = [...C.shop.flatMap((s) => s.items), ...C.tariffs.map((t) => ({ id: 'tariff_' + t.id, name: 'Тариф ' + t.name }))];
    const list = pending.map((id) => all.find((x) => x.id === id)).filter(Boolean);
    shell(`
      <h1 class="h2">Кабинет</h1>
      <button class="row-btn" data-contact>
        <span class="row-btn__icon">${icons.chat}</span>
        <span><b>Написать менеджеру</b><span class="small">Вопросы по оплате и доступам</span></span>
      </button>
      <h2 class="h3 section-title">Мои покупки</h2>
      ${list.length ? list.map((it) => `
        <div class="row-btn">
          <span class="row-btn__icon">${icons.bag}</span>
          <span><b>${esc(it.name)}</b><span class="small">Доступ откроется после подтверждения оплаты — пришлём в бот</span></span>
        </div>`).join('') : `
        <div class="empty">
          <div class="empty__icon">${icons.bag}</div>
          <p>Покупок пока нет. Гайды начинаются от 790 ₽, а первый месяц работы агентства — бесплатно.</p>
          <button class="btn btn--brand" data-tab="shop">Открыть магазин</button>
        </div>`}
    `);
  }

  function pagePromo(result) {
    const left = offerLeft();
    shell(`
      <h1 class="h2">Акции</h1>
      <div class="row-btn" style="grid-template-columns:44px 1fr">
        <span class="row-btn__icon">${icons.key}</span>
        <span><b>Промокод</b><span class="small">Введите код из канала или от менеджера</span></span>
      </div>
      <form class="field" id="promoForm">
        <input id="promoInput" placeholder="Например, HUMA10" aria-label="Промокод" autocomplete="off" />
        <button class="btn btn--brand" type="submit">Применить</button>
      </form>
      ${result || ''}
      <button class="row-btn" data-go="${left ? 'offerApp' : 'chat'}">
        <span class="row-btn__icon">${icons.promo}</span>
        <span><b>${left ? 'Персональная скидка' : 'Получить персональную скидку'}</b>
        <span class="small">${left ? `До −${maxDiscount()}%, осталось <span data-timer>${fmtLeft(left)}</span>` : '3 вопроса ассистенту — и скидка на 48 часов'}</span></span>
      </button>
      <button class="row-btn" data-item="free_month">
        <span class="row-btn__icon">${icons.agency}</span>
        <span><b>Стартовый месяц digital — 0 ₽</b><span class="small">Понравился результат — продолжаем. Нет — вы ничем не обязаны.</span></span>
      </button>
    `);
    document.getElementById('promoForm').onsubmit = (e) => {
      e.preventDefault();
      const code = document.getElementById('promoInput').value.trim().toUpperCase();
      if (!code) return;
      const ok = C.promo[code];
      store.set('promoCode', ok ? code : null);
      pagePromo(ok
        ? `<div class="promo-result">Промокод ${esc(code)} активирован: ${esc(ok)}. Назовите его менеджеру при оплате.</div>`
        : `<div class="promo-result bad">Промокод ${esc(code)} не найден. Проверьте написание.</div>`);
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
      <h2 class="h2">${esc(it.name)}</h2>
      <div class="sheet__price">${rub(it.price)}</div>
      <p>${esc(it.text)}</p>
      <button class="btn btn--brand" data-buy="${it.id}">${label}</button>
      <p class="small">${it.payUrl ? 'Оплата откроется в браузере. Доступ пришлём в бот.' : 'Откроется чат с ботом — менеджер свяжется с вами.'}</p>
    `);
  }

  function openStory(id) {
    const s = C.stories.find((x) => x.id === id);
    const seen = store.get('seenStories', []);
    if (!seen.includes(id)) store.set('seenStories', [...seen, id]);
    sheet(`<h2 class="h2">${esc(s.title)}</h2><p>${esc(s.body)}</p>`);
    document.querySelector(`[data-story="${id}"]`)?.classList.add('seen');
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
    if (el.hasAttribute('data-contact')) return open(`https://max.ru/${C.botUsername}?start=buy_contact`);
  }

  // ---------- старт ----------
  try { WA?.ready?.(); } catch {}
  try {
    WA?.BackButton?.onClick?.(() => { if (!$sheet.hidden) $sheet.hidden = true; else go('app'); });
  } catch {}
  $app.onclick = route;
  go(store.get('onboarded', false) ? 'app' : 'welcome');
})();
