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

/* ---------- seed data (FALLBACK) // [BACKEND] replace with API fetch ---------- */
const FALLBACK = {
  forms: [
    { id: 'f1', title: 'Bonfire + acoustic night', area: 'Karen', seed: 'fng-bonfire', live: true, km: 1.2, eta: '20 min', ends: 'Ends in 2h', going: 32, tonight: true, free: true, avs: [5, 9, 15, 32], desc: 'Kuna speaker, kuna views, na whoever shows up. No dress code, no plan — just pull up. Kuja na snacks zako, sisi tunaanza moto.' },
    { id: 'f2', title: 'Rooftop sunset hang', area: 'Westlands', seed: 'fng-rooftop', live: true, km: 0.4, eta: '10 min', ends: 'Ends in 1h 40m', going: 12, tonight: true, free: true, avs: [8, 25, 44, 12], desc: 'Sunset, muziki poa, drinks baridi. Tuletane 6pm — mko wote welcome. Entrance ni free, tu bring good vibes.' },
    { id: 'f3', title: '5-a-side pickup — Go Down', area: 'Industrial Area', seed: 'fng-football', live: false, startsShort: 'Kesho 4pm', km: 6.2, eta: '25 min', ends: 'Kesho 4pm', going: 14, tonight: false, free: true, avs: [3, 22, 52, 16], desc: 'Pitch imereserved. Leta boots na water — teams tunaipanga huko. Mpira iko.' },
    { id: 'f4', title: 'Nyama choma Sunday', area: 'Kilimani', seed: 'fng-nyama', live: false, startsShort: 'Sunday 1pm', km: 2.8, eta: '15 min', ends: 'Sunday 1pm', going: 21, tonight: false, free: true, avs: [11, 30, 45, 20], desc: 'Choma, muziki, na banter kubwa. Kila mtu na crew yake, grill iko side yetu. Karibuni wote.' },
    { id: 'f5', title: 'Karaoke night — Kile', area: 'Kileleshwa', seed: 'fng-karaoke', live: false, startsShort: 'Leo 9pm', km: 2.4, eta: '12 min', ends: 'Leo 9pm', going: 18, tonight: true, free: true, avs: [7, 18, 28, 36], desc: 'Mic iko wazi, crowd iko warm. Kuja uimbe au uchekwe — vyote ni content.' },
    { id: 'f6', title: 'Sunrise hike — Ngong Hills', area: 'Ngong', seed: 'fng-hike', live: false, startsShort: 'Sat 5:30am', km: 22, eta: '40 min', ends: 'Sat 5:30am', going: 26, tonight: false, free: false, avs: [2, 14, 40, 23], desc: 'Tunatoka CBD 5am sharp. Leta water, jacket na stamina — views juu ni za kuambiwa tu. KES 500 inalipa transport.' },
  ],
  notifs: {
    up: [
      { t: 'Bonfire + acoustic night', seed: 'fng-bonfire', s: 'Inaanza 2h 10m', id: 'f1' },
      { t: 'Sunday pickup run — Karura', seed: 'fng-run', s: 'Inaanza 1h 05m', id: 'f3' },
      { t: 'Rooftop movie night — Kile', seed: 'fng-movie', s: 'Inaanza kesho', id: 'f2' },
      { t: 'Karaoke night — Haveli', seed: 'fng-karaoke', s: 'Inaanza 2h 15m', id: 'f5' },
    ],
    past: [
      { t: 'Nyama choma Sunday', seed: 'fng-nyama', s: 'Iliisha jana', id: 'f4' },
      { t: 'Sunrise hike — Ngong', seed: 'fng-hike', s: 'Iliisha Jumamosi', id: 'f6' },
      { t: 'Bonfire + acoustic night', seed: 'fng-bonfire', s: 'Iliisha', id: 'f1' },
    ],
  },
  taken: ['nairobi', 'admin', 'formnigani', 'sheng', 'queen', 'king', 'nani'],
};

let FORMS = FALLBACK.forms.map(hydrate);
let NOTIFS = structuredClone(FALLBACK.notifs);
let TAKEN = [...FALLBACK.taken];

function hydrate(f) {
  return { ...f, img: f.img || IMGP(f.seed || 'fng-default', 800, 600) };
}
function hydrateNotif(n) {
  return { ...n, img: n.img || IMGP(n.seed || 'fng-default', 300, 300) };
}

/* ---------- state // [BACKEND] sessions move to real auth ---------- */
let state = Object.assign(
  { user: null, saves: [], joins: [], ob: false },
  JSON.parse(localStorage.getItem('fng_v1') || '{}')
);
const save = () => localStorage.setItem('fng_v1', JSON.stringify(state));
let pendingFn = null;
let pendingPage = null;
let curFilter = 'all';
let curSFilter = 'all';
let nTab = 'up';
let curForm = null;
let timer = null;
let notifOn = true;
let lastTab = 'home';
let dataReady = false;

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
function formById(id) {
  return FORMS.find((f) => f.id === id);
}

function avsHTML(f, count) {
  let s = (f.avs || []).slice(0, 4).map((n) => `<img src="${AVA(n)}" alt="">`).join('');
  if (isJoined(f.id) && state.user) s += `<img src="${state.user.photo}" alt="">`;
  return s + `<span>${f.going} ${count ? 'wamefika already' : 'wako down'}</span>`;
}
function cardHTML(f) {
  const badge = f.live ? '<i class="dot"></i>LIVE' : `<i class="dot mute"></i>${f.startsShort || 'Inaanza soon'}`;
  return `<article class="card" data-open="${f.id}">
    <div class="card-img"><img src="${f.img}" alt="" loading="lazy">
      <span class="chip-badge">${badge}</span>
      <button class="icon-save ${isSaved(f.id) ? 'on' : ''}" data-save="${f.id}" aria-label="Save"><svg width="17" height="17" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v17l-6-4-6 4z"/></svg></button>
      <div class="img-chips"><span>${f.km} km</span><span>${f.eta}</span></div>
    </div>
    <div class="card-body"><h3>${f.title}</h3><div class="avs">${avsHTML(f)}</div></div>
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
    : '<p style="text-align:center;color:var(--gray2);font-size:13.5px;padding:40px 20px">Hakuna Form kwa filter hii — try "Yote".</p>';
}
function renderSaved() {
  const list = FORMS.filter((f) => isSaved(f.id)).filter(
    (f) => curSFilter === 'all' || (curSFilter === 'live' && f.live) || (curSFilter === 'soon' && !f.live)
  );
  $('#savedList').innerHTML = list.length
    ? list.map(cardHTML).join('')
    : '<p style="text-align:center;color:var(--gray2);font-size:13.5px;padding:40px 20px">Hakuna Form hapa bado — tap bookmark juu ya Form usave.</p>';
}
function renderProfile() {
  if (!state.user) return;
  $('#pAva').src = state.user.photo;
  $('#pName').textContent = state.user.name;
  $('#pHdl').textContent = state.user.handle;
  $('#pJoined').textContent = 47 + state.joins.length;
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
  $('#dAvs').innerHTML = avsHTML(f, true);
  $('#dKm').textContent = f.km + ' km away';
  $('#dEnds').textContent = f.ends;
  $('#dDesc').textContent = f.desc;
  $('#dBadge').innerHTML = f.live ? '<i class="dot"></i>LIVE' : `<i class="dot mute"></i>${f.startsShort || 'Inaanza soon'}`;
  $('#dBack').dataset.go = lastTab;
  syncDetailBtn();
}
function syncDetailBtn() {
  if (!curForm) return;
  const j = isJoined(curForm.id);
  const b = $('#dJoin');
  b.classList.toggle('joined', j);
  b.textContent = j ? 'Uko ndani' : 'Niko!';
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
    '<p style="text-align:center;color:var(--gray2);font-size:13px;padding:24px">Hakuna kitu — try "nyama" au "rooftop".</p>';
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
  toast('Browsing kama guest');
  const raw = (location.hash || '#/splash').slice(2).split('/')[0];
  if (['saved', 'profile'].includes(raw)) goPage(lastTab || 'home');
}
function simulateGoogle(btn) {
  // [BACKEND] replace with real OAuth (Firebase/Supabase/Java OIDC)
  const label = btn.querySelector('span');
  if (!label._orig) label._orig = label.textContent;
  label.innerHTML =
    '<svg class="spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3a9 9 0 109 9"/></svg> Inaconnect...';
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
  if (state.user && state.user.name) toast('Karibu, ' + state.user.name.split(' ')[0]);
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
    toast('Imetoka kwa saved');
  } else {
    state.saves.push(id);
    toast('Imesave');
  }
  save();
  renderFeed();
  if ((location.hash || '').includes('saved')) renderSaved();
}
function tryJoin(id) {
  if (!state.user) {
    openGate(() => tryJoin(id));
    return;
  }
  const f = formById(id);
  if (!f) return;
  if (isJoined(id)) {
    state.joins = state.joins.filter((x) => x !== id);
    f.going--;
    toast('Umebail');
  } else {
    state.joins.push(id);
    f.going++;
    toast('Niko! Tutaonana huko');
  }
  save();
  syncDetailBtn();
  renderFeed();
}
function requirePage(p) {
  if (!state.user) {
    pendingPage = p;
    openGate();
    return;
  }
  goPage(p);
}

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
    toast('Login ndio upost Form');
  }
  if (page === 'splash') {
    if (state.ob) timer = setTimeout(() => go('home'), 800);
    else timer = setTimeout(() => go('ob1'), 1600);
  }
}
window.addEventListener('hashchange', render);

/* ---------- global click delegation: every button does something ---------- */
document.addEventListener('click', (e) => {
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
    toast('Moment ' + moment.dataset.moment + ' — gallery inakuja');
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
    toast('Westlands, Nairobi — change location inakuja');
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
    $('#setModal').classList.add('on');
  }
  if (a === 'toggleNotif') {
    notifOn = !notifOn;
    $('#notifSwitch').classList.toggle('on', notifOn);
    toast(notifOn ? 'Notifications ON' : 'Notifications OFF');
  }
  if (a === 'aths') {
    toast('Browser menu > Add to Home Screen');
    $('#setModal').classList.remove('on');
  }
  if (a === 'logout') {
    localStorage.removeItem('fng_v1');
    state = { user: null, saves: [], joins: [], ob: false };
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
  if (a === 'join' && curForm) tryJoin(curForm.id);
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
    hMsg.textContent = 'Herufi 3+, hakuna nafasi.';
    hMsg.className = 'hmsg';
    hGo.disabled = true;
    hIn.classList.remove('err');
    return;
  }
  if (TAKEN.includes(bare)) {
    hMsg.textContent = '@' + bare + ' imechukuliwa';
    hMsg.className = 'hmsg bad';
    hIn.classList.add('err');
    hGo.disabled = true;
    return;
  }
  hMsg.textContent = '@' + bare + ' imepatikana';
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
// "Sasa hivi" / "Later today" are mutually exclusive
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
    toast('Andika Form kwanza');
    return;
  }
  const tags = $$('#cTags .tag.on').map((t) => t.textContent.trim()).join(', ');
  const f = {
    id: 'u' + Date.now(),
    title,
    area: $('#cLoc').value.trim() || 'Nairobi CBD',
    img: photoSeed ? IMGP(photoSeed, 800, 600) : IMGP('fng-default' + (Date.now() % 7), 800, 600),
    live: false,
    startsShort: 'Just now',
    km: (Math.random() * 3 + 0.3).toFixed(1),
    eta: '5 min',
    ends: 'Ends soon',
    going: 1,
    tonight: true,
    free: true,
    avs: [],
    desc: tags ? `Tags: ${tags}. Host: wewe. Form mpya — details zinafuata kwa chat.` : 'Host: wewe. Form mpya — details zinafuata kwa chat.',
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
  toast('Form imetoka');
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
  toast('Profile imesave');
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
    dataReady = true;
  } catch {
    // file:// or offline — FALLBACK above keeps every page working
    dataReady = false;
  }
  render();
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ---------- boot ---------- */
loadData();
