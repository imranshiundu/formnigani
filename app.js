/* ============================================================
   FormNiGani — front-end prototype (no backend yet).
   Data lives in data/forms.json (fetched at boot, with an
   inline FALLBACK for file:// testing).
   Swap points when wiring a real API are marked // [BACKEND]
   ============================================================ */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const IMGP = (seed, w, h) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const AVA = (n) => `https://i.pravatar.cc/64?img=${n}`;
const HYPE_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z"/><path d="M12 22a7 7 0 01-7-7c0-1.5.5-2.5 1-3.5C9 8 10 5 10 2c3 2 8 6 8 12a8 8 0 01-6 8z" opacity=".45"/></svg>';

/* ---------- seed data (FALLBACK) // [BACKEND] replace with API fetch ---------- */
const FALLBACK = {
  forms: [
    { id: 'f1', title: 'Bonfire + acoustic night', area: 'Karen', seed: 'fng-bonfire', live: true, viewers: 128, hype: 214, km: 1.2, eta: '20 min', ends: 'Ends in 2h', going: 32, tonight: true, free: true, avs: [5, 9, 15, 32], desc: 'Speakers, city views, and whoever shows up. No dress code, no fixed plan — just come through. Bring your own snacks, we will handle the fire.' },
    { id: 'f2', title: 'Rooftop sunset hang', area: 'Westlands', seed: 'fng-rooftop', live: true, viewers: 86, hype: 167, km: 0.4, eta: '10 min', ends: 'Ends in 1h 40m', going: 12, tonight: true, free: true, avs: [8, 25, 44, 12], desc: 'Sunset, good music, cold drinks. We are meeting at 6pm — everyone is welcome. Entry is free, just bring good vibes.' },
    { id: 'f3', title: '5-a-side pickup — Go Down', area: 'Industrial Area', seed: 'fng-football', live: false, hype: 89, startsShort: 'Tomorrow 4pm', km: 6.2, eta: '25 min', ends: 'Tomorrow 4pm', going: 14, tonight: false, free: true, avs: [3, 22, 52, 16], desc: 'The pitch is booked. Bring boots and water — we will sort teams on site. Ball provided.' },
    { id: 'f4', title: 'Nyama choma Sunday', area: 'Kilimani', seed: 'fng-nyama', live: false, hype: 143, startsShort: 'Sunday 1pm', km: 2.8, eta: '15 min', ends: 'Sunday 1pm', going: 21, tonight: false, free: true, avs: [11, 30, 45, 20], desc: 'Grilled meat, music, and big banter. Everyone brings their crew, the grill is on us. All are welcome.' },
    { id: 'f5', title: 'Karaoke night — Kile', area: 'Kileleshwa', seed: 'fng-karaoke', live: false, hype: 112, startsShort: 'Today 9pm', km: 2.4, eta: '12 min', ends: 'Today 9pm', going: 18, tonight: true, free: true, avs: [7, 18, 28, 36], desc: 'The mic is open and the crowd is warm. Come sing or come laugh — either way it is a great night.' },
    { id: 'f6', title: 'Sunrise hike — Ngong Hills', area: 'Ngong', seed: 'fng-hike', live: false, hype: 198, startsShort: 'Sat 5:30am', km: 22, eta: '40 min', ends: 'Sat 5:30am', going: 26, tonight: false, free: false, avs: [2, 14, 40, 23], desc: 'We leave the CBD at 5am sharp. Bring water, a jacket, and stamina — the views at the top are worth it. KES 500 covers transport.' },
  ],
  notifs: {
    up: [
      { t: 'Bonfire + acoustic night', seed: 'fng-bonfire', s: 'Starts in 2h 10m', id: 'f1' },
      { t: 'Sunday pickup run — Karura', seed: 'fng-run', s: 'Starts in 1h 05m', id: 'f3' },
      { t: 'Rooftop movie night — Kile', seed: 'fng-movie', s: 'Starts tomorrow', id: 'f2' },
      { t: 'Karaoke night — Haveli', seed: 'fng-karaoke', s: 'Starts in 2h 15m', id: 'f5' },
    ],
    past: [
      { t: 'Nyama choma Sunday', seed: 'fng-nyama', s: 'Ended yesterday', id: 'f4' },
      { t: 'Sunrise hike — Ngong', seed: 'fng-hike', s: 'Ended Saturday', id: 'f6' },
      { t: 'Bonfire + acoustic night', seed: 'fng-bonfire', s: 'Ended', id: 'f1' },
    ],
  },
  taken: ['nairobi', 'admin', 'formnigani', 'sheng', 'queen', 'king', 'sunset'],
};

let FORMS = FALLBACK.forms.map(hydrate);
let NOTIFS = structuredClone(FALLBACK.notifs);
let TAKEN = [...FALLBACK.taken];

function hydrate(f) {
  return { hype: 0, viewers: 0, ...f, img: f.img || IMGP(f.seed || 'fng-default', 800, 600) };
}
function hydrateNotif(n) {
  return { ...n, img: n.img || IMGP(n.seed || 'fng-default', 300, 300) };
}

/* ---------- state // [BACKEND] sessions move to real auth ---------- */
let state = Object.assign(
  { user: null, saves: [], joins: [], hypes: [], ob: false },
  JSON.parse(localStorage.getItem('fng_v1') || '{}')
);
if (!Array.isArray(state.hypes)) state.hypes = [];
const save = () => localStorage.setItem('fng_v1', JSON.stringify(state));
let pendingFn = null;
let pendingPage = null;
let curFilter = 'all';
let curSFilter = 'all';
let nTab = 'up';
let curForm = null;
let timer = null;
let liveTimer = null;
let notifOn = true;
let lastTab = 'home';
let deferredPrompt = null;

/* ---------- helpers ---------- */
function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('on'), 2200);
}
function go(r) {
  location.hash = '#/' + r;
}
function goPage(p) {
  if ('#/' + p === location.hash) render();
  else go(p);
}
const isSaved = (id) => state.saves.includes(id);
const isJoined = (id) => state.joins.includes(id);
const isHyped = (id) => state.hypes.includes(id);
function formById(id) {
  return FORMS.find((f) => f.id === id);
}
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

function confetti(x, y, big = false) {
  const colors = ['#A21CAF', '#D637C0', '#F07BE8', '#FFC83D', '#22C55E', '#38BDF8'];
  const n = big ? 34 : 18;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = x + (Math.random() * 40 - 20) + 'px';
    c.style.top = y + (Math.random() * 10 - 5) + 'px';
    c.style.background = colors[i % colors.length];
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    c.style.animationDelay = Math.random() * 0.15 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1400);
  }
}
function floatPlus(x, y, text = '+1') {
  const s = document.createElement('b');
  s.className = 'float-plus';
  s.textContent = text;
  s.style.left = x + 'px';
  s.style.top = y + 'px';
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 850);
}

function avsHTML(f, detail = false) {
  let s = (f.avs || []).slice(0, 4).map((n) => `<img src="${AVA(n)}" alt="">`).join('');
  if (isJoined(f.id) && state.user) s += `<img src="${state.user.photo}" alt="">`;
  return s + `<span>${f.going} ${detail ? 'already here' : 'going'}</span>`;
}
function cardHTML(f, i = 0) {
  const badge = f.live ? '<i class="dot"></i>LIVE' : `<i class="dot mute"></i>${f.startsShort || 'Starting soon'}`;
  const livePill = f.live
    ? `<span class="viewers-pill"><i class="vdot"></i><span data-viewers="${f.id}">${fmt(f.viewers)}</span>&nbsp;watching</span>`
    : '';
  return `<article class="card" data-open="${f.id}" style="animation-delay:${Math.min(i * 60, 300)}ms">
    <div class="card-img"><img src="${f.img}" alt="" loading="lazy">
      <span class="chip-badge">${badge}</span>
      <button class="icon-save ${isSaved(f.id) ? 'on' : ''}" data-save="${f.id}" aria-label="Save"><svg width="17" height="17" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v17l-6-4-6 4z"/></svg></button>
      ${livePill}
      <div class="img-chips ${f.live ? 'has-live' : ''}"><span>${f.km} km</span><span>${f.eta}</span></div>
    </div>
    <div class="card-body"><h3>${f.title}</h3><div class="avs">${avsHTML(f)}</div>
      <div class="card-foot">
        <button class="hype-chip ${isHyped(f.id) ? 'on' : ''}" data-hype="${f.id}" aria-label="Hype this plan">${HYPE_SVG}<span data-hypecount="${f.id}">${fmt(f.hype)}</span></button>
        <span class="going-note">${f.live ? 'Happening now' : f.startsShort || 'Starting soon'}</span>
      </div>
    </div>
  </article>`;
}

/* ---------- renders ---------- */
function renderFeed() {
  const list = FORMS.filter(
    (f) =>
      curFilter === 'all' ||
      (curFilter === 'tonight' && f.tonight) ||
      (curFilter === 'free' && f.free) ||
      (curFilter === 'nearby' && Number(f.km) <= 3)
  );
  $('#feed').innerHTML = list.length
    ? list.map(cardHTML).join('')
    : '<p style="text-align:center;color:var(--gray2);font-size:13.5px;padding:40px 20px">No plans match this filter — try "All".</p>';
}
function renderSaved() {
  const list = FORMS.filter((f) => isSaved(f.id)).filter(
    (f) => curSFilter === 'all' || (curSFilter === 'live' && f.live) || (curSFilter === 'soon' && !f.live)
  );
  $('#savedList').innerHTML = list.length
    ? list.map(cardHTML).join('')
    : '<p style="text-align:center;color:var(--gray2);font-size:13.5px;padding:40px 20px">Nothing saved yet — tap the bookmark on any plan to keep it here.</p>';
}
function renderProfile() {
  if (!state.user) return;
  $('#pAva').src = state.user.photo;
  $('#pName').textContent = state.user.name;
  $('#pHdl').textContent = state.user.handle;
  $('#pJoined').textContent = 47 + state.joins.length;
  $('#pHype').textContent = state.hypes.length;
  $('#moments').innerHTML = [...Array(9)]
    .map((_, i) => `<img src="${IMGP('fng-m' + i, 300, 300)}" alt="moment ${i + 1}" loading="lazy" data-moment="${i + 1}">`)
    .join('');
}
function renderDetail(id) {
  const f = formById(id);
  if (!f) return;
  curForm = f;
  $('#dImg').src = f.img;
  $('#dTitle').textContent = f.title;
  $('#dLivebar').style.display = f.live ? 'flex' : 'none';
  $('#dViewers').textContent = fmt(f.viewers);
  syncHypeBtn();
  $('#dAvs').innerHTML = avsHTML(f, true);
  $('#dKm').textContent = f.km + ' km away';
  $('#dEnds').textContent = f.ends;
  $('#dDesc').textContent = f.desc;
  $('#dBadge').innerHTML = f.live ? '<i class="dot"></i>LIVE' : `<i class="dot mute"></i>${f.startsShort || 'Starting soon'}`;
  $('#dBack').dataset.go = lastTab;
  syncDetailBtn();
}
function syncDetailBtn() {
  if (!curForm) return;
  const j = isJoined(curForm.id);
  const b = $('#dJoin');
  b.classList.toggle('joined', j);
  b.textContent = j ? "You're In" : "I'm In!";
}
function syncHypeBtn() {
  if (!curForm) return;
  const b = $('#dHype');
  b.classList.toggle('on', isHyped(curForm.id));
  $('#dHypeCount').textContent = fmt(curForm.hype);
}
function renderNotifs() {
  $('#nList').innerHTML = NOTIFS[nTab]
    .map(
      (n) => `<div class="nrow" data-open="${n.id}">
    <img src="${n.img}" alt=""><div><h4>${n.t}</h4>
    <span class="darkpill ${nTab === 'past' ? 'mute' : ''}">${n.s}</span></div></div>`
    )
    .join('');
}
function renderSearch(q) {
  const list = FORMS.filter((f) => f.title.toLowerCase().includes(q) || f.area.toLowerCase().includes(q));
  $('#soRes').innerHTML =
    list
      .map(
        (f) => `<div class="res-row" data-open="${f.id}">
    <img src="${f.img}" alt=""><div><b>${f.title}</b><span>${f.area} · ${f.km} km · ${f.live ? 'LIVE' : f.startsShort}</span></div></div>`
      )
      .join('') ||
    '<p style="text-align:center;color:var(--gray2);font-size:13px;padding:24px">No matches — try "rooftop" or "karaoke".</p>';
}

/* ---------- live simulation // [BACKEND] replace with socket/polling ---------- */
function tickLive() {
  let changed = false;
  FORMS.forEach((f) => {
    if (!f.live) return;
    f.viewers = Math.max(24, f.viewers + Math.round(Math.random() * 14 - 6));
    if (Math.random() < 0.25) {
      f.going += 1;
      changed = true;
    }
  });
  // Patch visible counters without full re-render (keeps scroll + feels live).
  $$('[data-viewers]').forEach((el) => {
    const f = formById(el.dataset.viewers);
    if (f) el.textContent = fmt(f.viewers);
  });
  const f1 = formById('f1');
  if (f1 && $('#mapLive')) $('#mapLive').textContent = `${f1.km} km • Live • ${fmt(f1.viewers)} watching`;
  if (curForm && curForm.live && $('#scr-form').classList.contains('on')) {
    $('#dViewers').textContent = fmt(curForm.viewers);
    if (changed) $('#dAvs').innerHTML = avsHTML(curForm, true);
  }
  if (changed && (location.hash || '').includes('home')) renderFeed();
}
function startLive() {
  clearInterval(liveTimer);
  liveTimer = setInterval(tickLive, 3500);
}

/* ---------- auth gate ---------- */
function openGate(fn) {
  pendingFn = fn || null;
  $('#gateModal').classList.add('on');
}
function closeGate() {
  $('#gateModal').classList.remove('on');
}
function guestSkip() {
  // Guest explicitly skips login: drop pending intents so the UI never gets stuck.
  pendingFn = null;
  pendingPage = null;
  closeGate();
  toast('Browsing as guest');
  const raw = (location.hash || '#/splash').slice(2).split('/')[0];
  if (['saved', 'profile'].includes(raw)) goPage(lastTab || 'home');
}
function simulateGoogle(btn) {
  // [BACKEND] replace with real OAuth (Firebase/Supabase/Java OIDC)
  const label = btn.querySelector('span');
  if (!label._orig) label._orig = label.textContent;
  label.innerHTML =
    '<svg class="spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3a9 9 0 109 9"/></svg> Connecting...';
  setTimeout(() => {
    label.textContent = label._orig;
    closeGate();
    state.user = { name: 'Brian Kimani', photo: AVA(12), handle: state.user ? state.user.handle : null };
    save();
    if (!state.user.handle) {
      goPage('handle');
    } else afterAuth();
  }, 900);
}
function afterAuth() {
  if (state.user && state.user.name) toast('Welcome, ' + state.user.name.split(' ')[0]);
  if (pendingFn) {
    const f = pendingFn;
    pendingFn = null;
    f();
  } else if (pendingPage) {
    const p = pendingPage;
    pendingPage = null;
    goPage(p);
  } else goPage('home');
}

/* ---------- actions ---------- */
function trySave(id) {
  if (!state.user) {
    openGate(() => trySave(id));
    return;
  }
  if (isSaved(id)) {
    state.saves = state.saves.filter((x) => x !== id);
    toast('Removed from saved');
  } else {
    state.saves.push(id);
    toast('Saved to your list');
  }
  save();
  renderFeed();
  if ((location.hash || '').includes('saved')) renderSaved();
}
function tryJoin(id, el) {
  if (!state.user) {
    openGate(() => tryJoin(id));
    return;
  }
  const f = formById(id);
  if (!f) return;
  if (isJoined(id)) {
    state.joins = state.joins.filter((x) => x !== id);
    f.going--;
    toast("You're out — maybe next time");
  } else {
    state.joins.push(id);
    f.going++;
    toast("You're in! See you there");
    if (el) {
      const r = el.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top, true);
    }
  }
  save();
  syncDetailBtn();
  renderFeed();
}
function tryHype(id, el) {
  if (!state.user) {
    openGate(() => tryHype(id));
    return;
  }
  const f = formById(id);
  if (!f) return;
  if (isHyped(id)) {
    state.hypes = state.hypes.filter((x) => x !== id);
    f.hype = Math.max(0, f.hype - 1);
  } else {
    state.hypes.push(id);
    f.hype += 1;
    toast('Hyped! The host sees the love');
    if (el) {
      const r = el.getBoundingClientRect();
      floatPlus(r.left + r.width / 2 - 10, r.top - 6);
      if (f.hype % 10 === 0) confetti(r.left + r.width / 2, r.top, false);
    }
  }
  save();
  // Patch counters in place for instant feedback.
  $$(`[data-hypecount="${id}"]`).forEach((n) => (n.textContent = fmt(f.hype)));
  $$(`[data-hype="${id}"]`).forEach((b) => {
    b.classList.toggle('on', isHyped(id));
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
  });
  if (curForm && curForm.id === id) syncHypeBtn();
}
function requirePage(p) {
  if (!state.user) {
    pendingPage = p;
    openGate();
    return;
  }
  goPage(p);
}

/* ---------- PWA install ---------- */
function refreshInstallUI() {
  const badge = $('#installBadge');
  const label = $('#installLabel');
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) {
    label.textContent = 'App installed';
    if (badge) badge.hidden = true;
  } else if (deferredPrompt) {
    label.textContent = 'Install App';
    if (badge) badge.hidden = false;
  } else {
    label.textContent = 'Install App';
    if (badge) badge.hidden = true;
  }
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  refreshInstallUI();
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  refreshInstallUI();
  toast('Installed! See you on the home screen');
});
async function installApp() {
  $('#setModal').classList.remove('on');
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    deferredPrompt = null;
    refreshInstallUI();
  } else {
    toast('Open the browser menu > Install / Add to Home Screen');
  }
}

/* ---------- offline indicator ---------- */
function refreshOnline() {
  $('#offlineBar').classList.toggle('on', !navigator.onLine);
}
window.addEventListener('online', () => {
  refreshOnline();
  toast('Back online');
});
window.addEventListener('offline', refreshOnline);

/* ---------- router ---------- */
const SB_LIGHT = { splash: 1, auth: 1, form: 1 };
const GUARDED = ['saved', 'profile'];
function render() {
  clearTimeout(timer);
  const raw = (location.hash || '#/splash').slice(2);
  const [page, param] = raw.split('/');
  const map = {
    splash: 'scr-splash',
    ob1: 'scr-ob1',
    ob2: 'scr-ob2',
    auth: 'scr-auth',
    handle: 'scr-handle',
    home: 'scr-home',
    saved: 'scr-saved',
    profile: 'scr-profile',
    map: 'scr-map',
    form: 'scr-form',
    create: 'scr-create',
    notifs: 'scr-notifs',
  };
  if (!map[page]) {
    go('home');
    return;
  }
  // Guests hitting guarded tabs bounce back instead of a blank screen.
  if (GUARDED.includes(page) && !state.user) {
    requirePage(page);
    $$('.screen').forEach((s) => s.classList.toggle('on', s.id === 'scr-' + lastTab));
    return;
  }
  const target = 'scr-' + page;
  $$('.screen').forEach((s) => s.classList.toggle('on', s.id === target));
  $('#phone').classList.toggle('sb-light', !!SB_LIGHT[page]);
  const tabbed = ['home', 'map', 'saved', 'profile'].includes(page);
  if (tabbed) lastTab = page;
  $('#navWrap').classList.toggle('hide', !tabbed);
  $$('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === page));
  if (page === 'home') renderFeed();
  if (page === 'saved') renderSaved();
  if (page === 'profile') renderProfile();
  if (page === 'form') {
    if (!formById(param)) {
      go('home');
      return;
    }
    renderDetail(param);
  }
  if (page === 'notifs') renderNotifs();
  if (page === 'handle') {
    if (!state.user) {
      go('auth');
      return;
    }
    if (state.user.handle) {
      go('home');
      return;
    }
  }
  if (page === 'create' && !state.user) {
    // Let guests see the composer, login is enforced on Post.
    toast('Log in to share a plan');
  }
  if (page === 'splash') {
    if (state.ob) timer = setTimeout(() => go('home'), 800);
    else timer = setTimeout(() => go('ob1'), 1600);
  }
}
window.addEventListener('hashchange', render);

/* ---------- global click delegation: every button does something ---------- */
document.addEventListener('click', (e) => {
  const hypeB = e.target.closest('[data-hype]');
  if (hypeB) {
    e.stopPropagation();
    tryHype(hypeB.dataset.hype, hypeB);
    return;
  }
  const saveB = e.target.closest('[data-save]');
  if (saveB) {
    e.stopPropagation();
    trySave(saveB.dataset.save);
    return;
  }
  const open = e.target.closest('[data-open]');
  if (open) {
    closeAll();
    goPage('form/' + open.dataset.open);
    return;
  }
  const moment = e.target.closest('[data-moment]');
  if (moment) {
    toast('Moment ' + moment.dataset.moment + ' — gallery coming soon');
    return;
  }
  const navA = e.target.closest('[data-nav]');
  if (navA) {
    const t = navA.dataset.nav;
    if (!state.user && GUARDED.includes(t)) {
      e.preventDefault();
      requirePage(t);
      return;
    }
    return; // let href navigate
  }
  const g = e.target.closest('[data-go]');
  if (g) {
    if (g.dataset.go === 'create' && !state.user) {
      pendingPage = 'create';
      openGate();
      return;
    }
    goPage(g.dataset.go);
    return;
  }
  const loc = e.target.closest('.pagehead .loc, .pagehead h1');
  if (loc && (location.hash || '').includes('home')) {
    toast('Westlands, Nairobi — more areas coming soon');
    return;
  }
  const filt = e.target.closest('[data-filter]');
  if (filt) {
    curFilter = filt.dataset.filter;
    $$('#homePills .pill').forEach((p) => p.classList.toggle('on', p === filt));
    renderFeed();
    return;
  }
  const sf = e.target.closest('[data-sfilter]');
  if (sf) {
    curSFilter = sf.dataset.sfilter;
    $$('#savedPills .pill').forEach((p) => p.classList.toggle('on', p === sf));
    renderSaved();
    return;
  }
  const nt = e.target.closest('[data-ntab]');
  if (nt) {
    nTab = nt.dataset.ntab;
    $$('#nPills .pill').forEach((p) => p.classList.toggle('on', p === nt));
    renderNotifs();
    return;
  }
  const tag = e.target.closest('#cTags .tag');
  if (tag) {
    // multi-select tags
    tag.classList.toggle('on');
    return;
  }
  const mapSearch = e.target.closest('.map-search');
  if (mapSearch) {
    $('#searchOv').classList.add('on');
    $('#soInput').value = '';
    renderSearch('');
    setTimeout(() => $('#soInput').focus(), 80);
    return;
  }
  const act = e.target.closest('[data-act]');
  if (!act) return;
  const a = act.dataset.act;
  if (a === 'search') {
    $('#searchOv').classList.add('on');
    $('#soInput').value = '';
    renderSearch('');
    setTimeout(() => $('#soInput').focus(), 80);
  }
  if (a === 'closeSearch') $('#searchOv').classList.remove('on');
  if (a === 'notifs') requirePage('notifs');
  if (a === 'settings') {
    $('#setWho').textContent = state.user ? `${state.user.name} · ${state.user.handle}` : 'Guest';
    refreshInstallUI();
    $('#setModal').classList.add('on');
  }
  if (a === 'toggleNotif') {
    notifOn = !notifOn;
    $('#notifSwitch').classList.toggle('on', notifOn);
    toast(notifOn ? 'Notifications on' : 'Notifications off');
  }
  if (a === 'install') installApp();
  if (a === 'aths') installApp(); // legacy alias
  if (a === 'logout') {
    localStorage.removeItem('fng_v1');
    state = { user: null, saves: [], joins: [], hypes: [], ob: false };
    pendingFn = null;
    pendingPage = null;
    closeAll();
    goPage('splash');
  }
  if (a === 'editProfile') {
    if (!state.user) {
      openGate();
      return;
    }
    $('#eName').value = state.user.name;
    $('#eHdl').value = state.user.handle;
    $('#setModal').classList.remove('on');
    $('#editModal').classList.add('on');
  }
  if (a === 'bail') goPage(lastTab || 'home');
  if (a === 'join' && curForm) tryJoin(curForm.id, act);
  if (a === 'hype' && curForm) tryHype(curForm.id, act);
  if (a === 'closeGate') guestSkip();
});
function closeAll() {
  $$('.modal').forEach((m) => m.classList.remove('on'));
  $('#searchOv').classList.remove('on');
}
$$('.modal').forEach((m) =>
  m.addEventListener('click', (e) => {
    if (e.target === m) {
      if (m.id === 'gateModal') guestSkip();
      else closeAll();
    }
  })
);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('#gateModal').classList.contains('on')) guestSkip();
    else closeAll();
  }
});

/* ---------- auth buttons ---------- */
$('#authGoogle').addEventListener('click', (e) => {
  pendingFn = null;
  pendingPage = null;
  simulateGoogle(e.currentTarget);
});
$('#gateGoogle').addEventListener('click', (e) => simulateGoogle(e.currentTarget));

/* ---------- username setup ---------- */
const hIn = $('#hHandle');
const hMsg = $('#hMsg');
const hGo = $('#hGo');
hIn.addEventListener('input', () => {
  const v = hIn.value.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '');
  hIn.value = v ? '@' + v : '';
  const bare = v.replace(/^@/, '');
  if (bare.length < 3) {
    hMsg.textContent = '3+ characters, no spaces.';
    hMsg.className = 'hmsg';
    hGo.disabled = true;
    hIn.classList.remove('err');
    return;
  }
  if (TAKEN.includes(bare)) {
    hMsg.textContent = '@' + bare + ' is taken';
    hMsg.className = 'hmsg bad';
    hIn.classList.add('err');
    hGo.disabled = true;
    return;
  }
  hMsg.textContent = '@' + bare + ' is available';
  hMsg.className = 'hmsg ok';
  hIn.classList.remove('err');
  hGo.disabled = false;
});
hGo.addEventListener('click', () => {
  const bare = hIn.value.trim().replace(/^@/, '');
  if (bare.length < 3 || !state.user) return;
  state.user.name = $('#hName').value.trim() || state.user.name;
  state.user.handle = '@' + bare;
  state.ob = true;
  save();
  afterAuth();
});

/* ---------- create form ---------- */
let photoSeed = null;
$('#cPhoto').addEventListener('click', () => {
  photoSeed = 'fng-post-' + Math.floor(Math.random() * 9999);
  const p = $('#cPhoto');
  p.classList.add('has');
  p.style.backgroundImage = `url(${IMGP(photoSeed, 800, 500)})`;
  $('#cPhotoTxt').textContent = 'Change photo';
  $('#cPhotoTxt').style.cssText = 'background:rgba(0,0,0,.45);color:#fff;padding:6px 14px;border-radius:999px';
});
// "Right now" / "Later today" are mutually exclusive
$$('.checkrow .check input').forEach((box) =>
  box.addEventListener('change', () => {
    if (box.checked) $$('.checkrow .check input').forEach((o) => { if (o !== box) o.checked = false; });
  })
);
$('#cTitle').addEventListener('input', (e) => {
  $('#cPost').disabled = e.target.value.trim().length < 3;
});
function postForm() {
  const title = $('#cTitle').value.trim();
  if (title.length < 3) {
    toast('Describe your plan first');
    return;
  }
  const tags = $$('#cTags .tag.on').map((t) => t.textContent.trim()).join(', ');
  const f = {
    id: 'u' + Date.now(),
    title,
    area: $('#cLoc').value.trim() || 'Nairobi CBD',
    img: photoSeed ? IMGP(photoSeed, 800, 600) : IMGP('fng-default' + (Date.now() % 7), 800, 600),
    live: false,
    hype: 0,
    viewers: 0,
    startsShort: 'Just now',
    km: (Math.random() * 3 + 0.3).toFixed(1),
    eta: '5 min',
    ends: 'Ending soon',
    going: 1,
    tonight: true,
    free: true,
    avs: [],
    desc: tags
      ? `Tags: ${tags}. You are hosting this one — details in the chat.`
      : 'You are hosting this one — details in the chat.',
  };
  FORMS.unshift(f);
  state.joins.push(f.id);
  save();
  $('#cTitle').value = '';
  $('#cLoc').value = '';
  $('#cPost').disabled = true;
  photoSeed = null;
  $('#cPhoto').classList.remove('has');
  $('#cPhoto').style.backgroundImage = '';
  $('#cPhotoTxt').textContent = 'Add photo';
  $('#cPhotoTxt').style.cssText = '';
  $$('#cTags .tag').forEach((t, i) => t.classList.toggle('on', i === 0));
  goPage('home');
  toast('Your plan is live!');
  confetti(window.innerWidth / 2, window.innerHeight * 0.4, true);
}
$('#cGo').addEventListener('click', () => {
  if (!state.user) {
    openGate(postForm);
    return;
  }
  postForm();
});
$('#cPost').addEventListener('click', () => {
  if (!state.user) {
    openGate(postForm);
    return;
  }
  postForm();
});

/* ---------- search ---------- */
$('#soInput').addEventListener('input', (e) => renderSearch(e.target.value.toLowerCase()));
$$('#soRecent .pill').forEach((p) =>
  p.addEventListener('click', () => {
    $('#soInput').value = p.textContent;
    renderSearch(p.textContent.toLowerCase());
  })
);

/* ---------- edit profile ---------- */
$('#eSave').addEventListener('click', () => {
  if (!state.user) return;
  state.user.name = $('#eName').value.trim() || state.user.name;
  const h = $('#eHdl').value.trim();
  if (h) state.user.handle = h.startsWith('@') ? h : '@' + h;
  save();
  $('#editModal').classList.remove('on');
  renderProfile();
  toast('Profile saved');
});

/* ---------- data boot: data/forms.json with file:// fallback ---------- */
async function loadData() {
  try {
    const res = await fetch('data/forms.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('http ' + res.status);
    const j = await res.json();
    if (Array.isArray(j.forms) && j.forms.length) FORMS = j.forms.map(hydrate);
    if (j.notifs) {
      NOTIFS = {
        up: (j.notifs.up || []).map(hydrateNotif),
        past: (j.notifs.past || []).map(hydrateNotif),
      };
    }
    if (Array.isArray(j.taken) && j.taken.length) TAKEN = j.taken;
  } catch {
    // file:// or offline — FALLBACK above keeps every page working
  }
  // Re-apply persisted hype (counts reset on each JSON load otherwise).
  state.hypes.forEach((id) => {
    const f = formById(id);
    if (f) f.hype += 1;
  });
  render();
  startLive();
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ---------- boot ---------- */
refreshOnline();
refreshInstallUI();
loadData();
