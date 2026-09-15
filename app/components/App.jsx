'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AVA,
  IMGP,
  cacheComment,
  clearState,
  fmt,
  hostPhoto,
  hydrateComment,
  loadCommentCache,
  loadState,
  persistState,
} from '@/lib/client-store';
import { FlameBurst, StoriesRail, StoryViewer } from './Stories';
import CommentSheet from './Comments';
import StatusComposer from './StatusComposer';
import Chats from './Chats';
import { Sticker } from './Stickers';
import { ProfileSheet, RichText } from './Social';
import { db, isConfigured } from '@/lib/db';
import { rowToForm } from '@/lib/db/supabase';
import { toComment } from '@/lib/db/supabase';
import { useAuth } from '@/lib/auth';
import { rankFeed } from '@/lib/rank';

function deriveNotifs(forms) {
  const up = forms
    .filter((f) => f.live || f.tonight)
    .slice(0, 6)
    .map((f) => ({ t: f.title, seed: f.seed, img: f.img, s: f.live ? 'Live now' : f.startsShort, id: f.id }));
  const past = forms
    .filter((f) => !f.live && !f.tonight)
    .slice(0, 6)
    .map((f) => ({ t: f.title, seed: f.seed, img: f.img, s: f.startsShort || 'Ended', id: f.id }));
  return { up, past };
}

const ThreeHero = dynamic(() => import('./ThreeHero'), { ssr: false });

/* ---------- tiny icons ---------- */
const I = {
  search: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></svg>
  ),
  bell: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10.3 21a2 2 0 003.4 0" /></svg>
  ),
  gear: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
  ),
  back: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
  ),
  close: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
  ),
  plus: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
  ),
  pin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.1 7-11a7 7 0 10-14 0c0 5.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
  ),
  save: (
    <svg width="17" height="17" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M6 4h12v17l-6-4-6 4z" /></svg>
  ),
  flame: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z" /><path d="M12 22a7 7 0 01-7-7c0-1.5.5-2.5 1-3.5C9 8 10 5 10 2c3 2 8 6 8 12a8 8 0 01-6 8z" opacity=".45" /></svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  share: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" /></svg>
  ),
};

function ago(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function DescBlock({ text, onUser, onTag }) {
  const [more, setMore] = useState(false);
  const long = text.length > 220;
  return (
    <p className="desc">
      {more || !long ? <RichText text={text} onUser={onUser} onTag={onTag} /> : <RichText text={text.slice(0, 220) + '...'} onUser={onUser} onTag={onTag} />}
      {long && (
        <button className="morelink" onClick={() => setMore(!more)}>
          {more ? ' Read less' : ' Read more'}
        </button>
      )}
    </p>
  );
}

/* ---------- card with single-tap open + double-tap hype ---------- */
function Card({ f, saved, hyped, me, cc, latest, top, onOpen, onSave, onHype, onHost, onShare, onComments, onUser, onTag }) {
  const tapTimer = useRef(null);
  const [burst, setBurst] = useState(null);
  const [more, setMore] = useState(false);

  const tap = (e) => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      const r = e.currentTarget.getBoundingClientRect();
      setBurst({ x: e.clientX - r.left, y: e.clientY - r.top, k: Date.now() });
      setTimeout(() => setBurst(null), 750);
      onHype(f.id, null);
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      onOpen(f.id);
    }, 260);
  };

  const badge = f.live ? (
    <><i className="dot" />LIVE</>
  ) : (
    <><i className="dot mute" />{f.startsShort || 'Starting soon'}</>
  );

  return (
    <article className="card" onClick={tap}>
      <div className="card-img">
        <Image src={f.img} alt="" fill sizes="360px" style={{ objectFit: 'cover' }} />
        <span className="chip-badge">{badge}</span>
        {top && <span className="top-pick">Top pick</span>}
        <button
          className={`icon-save ${saved ? 'on' : ''}`}
          aria-label="Save"
          onClick={(e) => {
            e.stopPropagation();
            onSave(f.id);
          }}
        >
          {I.save}
        </button>
        {f.live && (
          <span className="viewers-pill"><i className="vdot" />{fmt(f.viewers)}&nbsp;watching</span>
        )}
        <div className={`img-chips ${f.live ? 'has-live' : ''}`}>
          <span>{f.km} km</span><span>{f.eta}</span>
        </div>
        {burst && <FlameBurst key={burst.k} x={burst.x} y={burst.y} />}
      </div>
      <div className="card-body">
        <h3>{f.title}</h3>
        {f.host && (
          <div
            className="hostline"
            onClick={(e) => {
              e.stopPropagation();
              onHost?.(f.host.handle);
            }}
          >
            <img src={hostPhoto(f.host)} alt="" />
            <span>{f.host.name} · {f.host.handle}</span>
          </div>
        )}
        <div className="avs">
          {(f.avs || []).slice(0, 4).map((n) => (
            <img key={n} src={AVA(n)} alt="" />
          ))}
          {me && <img src={me} alt="you" />}
          <span>{f.going} going</span>
        </div>
        {f.capacity && f.going / f.capacity >= 0.6 && (
          <div className="capbar" onClick={(e) => e.stopPropagation()}>
            <i style={{ width: `${Math.min(100, Math.round((f.going / f.capacity) * 100))}%` }} />
            <span>{f.going}/{f.capacity} in</span>
          </div>
        )}
        {f.desc && (
          <p className={`cdesc ${more ? '' : 'clamp'}`}>
            <RichText text={f.desc} onUser={onUser} onTag={onTag} />
            {' '}
            <button
              className="morelink"
              onClick={(e) => {
                e.stopPropagation();
                setMore(!more);
              }}
            >
              {more ? 'less' : 'more'}
            </button>
          </p>
        )}
        <div className="card-foot">
          <button
            className={`hype-chip ${hyped ? 'on' : ''}`}
            aria-label="Hype this plan"
            onClick={(e) => {
              e.stopPropagation();
              onHype(f.id, e.currentTarget);
            }}
          >
            {I.flame}<span>{fmt(f.hype)}</span>
          </button>
          <button
            className="iconbtn mini"
            aria-label="Share"
            onClick={(e) => {
              e.stopPropagation();
              onShare?.(f);
            }}
          >
            {I.share}
          </button>
          <span className="going-note">{f.live ? 'Happening now' : f.startsShort === 'Just now' ? 'Starting now' : `Starts ${f.startsShort || 'soon'}`}</span>
        </div>
        <div
          className="comment-row"
          onClick={(e) => {
            e.stopPropagation();
            onComments?.(f.id);
          }}
        >
          <span className="ccount">{cc > 0 ? `View all ${cc} comment${cc === 1 ? '' : 's'}` : 'Add the first comment'}</span>
          {latest && (
            <span className="cprev">
              {latest.user?.handle} {String(latest.body).slice(0, 60)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ================= APP ================= */
export default function App() {
  // First render is always splash (server and client agree — no hydration
  // mismatch). Deep links are applied in a mount effect below.
  const [screen, setScreen] = useState({ name: 'splash', param: null });
  const [forms, setForms] = useState([]);
  const [meta, setMeta] = useState({ notifs: { up: [], past: [] }, taken: [], tags: [], recents: [] });
  const [feedState, setFeedState] = useState(isConfigured() ? 'loading' : 'error');
  const [st, setSt] = useState(() => loadState());
  const [filter, setFilter] = useState('all');
  const [sfilter, setSfilter] = useState('all');
  const [nTab, setNTab] = useState('up');
  const [lastTab, setLastTab] = useState('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [gate, setGate] = useState(false);
  const [gateReason, setGateReason] = useState('');
  const [settings, setSettings] = useState(false);
  const [edit, setEdit] = useState(false);
  const [toast, setToast] = useState(null);
  const [activity, setActivity] = useState([]);
  const [unread, setUnread] = useState(0);
  const [storyIdx, setStoryIdx] = useState(null);
  const [seen, setSeen] = useState([]);
  const [handle, setHandle] = useState('');
  const [handleMsg, setHandleMsg] = useState({ text: '3+ characters, no spaces.', kind: '' });
  const [name, setName] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cLoc, setCLoc] = useState('');
  const [cMap, setCMap] = useState('');
  const [cPhoto, setCPhoto] = useState(null);
  const [cTags, setCTags] = useState(['Rooftop']);
  const [em, setEm] = useState('');
  const [emPw, setEmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [emMode, setEmMode] = useState('in');
  const [emErr, setEmErr] = useState('');
  const [emBusy, setEmBusy] = useState(false);
  const doEmail = async () => {
    if (!em.includes('@') || emPw.length < 6) {
      setEmErr('Enter a valid email and a 6+ character password.');
      return;
    }
    setEmBusy(true);
    setEmErr('');
    try {
      if (emMode === 'up') {
        const { session } = await auth.signUpEmail(em.trim(), emPw, name || 'Someone');
        if (!session) setEmErr('Check your email to confirm, then log in.');
      } else {
        await auth.signInEmail(em.trim(), emPw);
        const fn = pending.current;
        pending.current = null;
        if (fn) fn();
        else go('home');
      }
    } catch (e) {
      setEmErr(e.message || 'Could not log in, try again');
    } finally {
      setEmBusy(false);
    }
  };  const [offline, setOffline] = useState(false);
  const [deferred, setDeferred] = useState(null);
  const [notifOn, setNotifOn] = useState(true);
  const [when, setWhen] = useState(0);
  const [statuses, setStatuses] = useState([]);
  const [statusIdx, setStatusIdx] = useState(null);
  const [composer, setComposer] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [profTab, setProfTab] = useState('attended');  const [profEvents, setProfEvents] = useState({ attended: [], hosted: [] });
  const [profEventsState, setProfEventsState] = useState('idle');
  const [chHypes, setChHypes] = useState({}); // commentId -> count
  const [chMine, setChMine] = useState(new Set());
  const [waInfo, setWaInfo] = useState({ count: 0, joined: false, link: null, editing: false, url: '' });
  const [chatsOpen, setChatsOpen] = useState(false);
  const [chatThreadWith, setChatThreadWith] = useState(null); // profile id
  const [conversations, setConversations] = useState([]);
  const [threadMsgs, setThreadMsgs] = useState([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [theme, setTheme] = useState('light');
  const [acct, setAcct] = useState(false);
  const [pwCur, setPwCur] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [emNew, setEmNew] = useState('');
  const [pubProfile, setPubProfile] = useState(null);
  const [sheet, setSheet] = useState(null); // formId with open comment sheet
  const [profSheet, setProfSheet] = useState(null); // handle with open profile sheet
  const [comments, setComments] = useState({}); // formId -> list // [BACKEND]

  const pending = useRef(null);
  const obSwipe = useRef(null);
  const toastTimer = useRef(null);
  const user = st.user;
  const auth = useAuth();
  const SB = auth.active;
  const profId = auth.profile?.id || null;

  const showToast = useCallback((msg) => {
    setToast({ msg, k: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const go = useCallback((name, param = null) => {
    setScreen({ name, param });
    // URL-based routing with history.pushState
    try {
      let p = '';
      if (name === 'form' && param) p = `/form/${param}`;
      else if (name === 'profile' && param) p = `/@${String(param).replace(/^@/, '')}`;
      else if (['home', 'saved', 'profile', 'chat', 'notifs'].includes(name)) p = `/${name}`;
      if (p && window.location.pathname !== p) history.pushState({ screen: name, param }, '', p);
    } catch {}
  }, []);

  const doShare = useCallback(
    async ({ title, text, path }) => {
      const url = `${window.location.origin}${path}`;
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
        } catch {}
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard');
      } catch {
        showToast(url);
      }
    },
    [showToast]
  );
  const sharePlan = useCallback((f) => doShare({ title: f.title, text: `${f.title}, only on Form Ni Gani?`, path: `/form/${f.id}` }), [doShare]);
  const shareProfile = useCallback(
    (handle, name) => doShare({ title: `${name} on Form Ni Gani?`, text: `Follow ${name} on Form Ni Gani?`, path: `/@${String(handle).replace(/^@/, '')}` }),
    [doShare]
  );

  /* ----- persistence ----- */
  useEffect(() => {
    persistState(st);
  }, [st]);

  /* ----- theme (dark / light) ----- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fng_theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('fng_theme', theme); } catch {}
  }, [theme]);

  /* ----- backend feed (Supabase is the only source — no fallback) ----- */
  const loadFeed = useCallback(() => {
    if (!isConfigured()) {
      setFeedState('error');
      return;
    }
    setFeedState((s) => (s === 'ready' ? s : 'loading'));
    db.feed()
      .then((j) => {
        if (!j?.forms?.length) {
          setFeedState('empty');
          return;
        }
        setForms(j.forms);
        setMeta({ notifs: j.meta.notifs || deriveNotifs(j.forms), taken: j.meta.taken, tags: j.meta.tags, recents: j.meta.recents });
        setFeedState('ready');
      })
      .catch(() => setFeedState('error'));
  }, []);
  useEffect(() => {
    loadFeed();
    const t = setInterval(loadFeed, 30000); // gentle consistency sweep; interactions merge in realtime
    return () => clearInterval(t);
  }, [loadFeed]);

  /* ----- statuses (user stories) ----- */
  const loadStatuses = useCallback(() => {
    db.listStatuses(profId)
      .then((list) => setStatuses(list))
      .catch(() => {});
  }, [profId]);
  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  /* ----- profile events (attended / hosted) ----- */
  const loadProfEvents = useCallback((handle, pid) => {
    if (!handle) return;
    setProfEventsState('loading');
    Promise.all([db.hostedEvents(handle), pid ? db.attendedEvents(pid) : Promise.resolve([])])
      .then(([hosted, attended]) => {
        setProfEvents({ hosted, attended });
        setProfEventsState('ready');
      })
      .catch(() => setProfEventsState('error'));
  }, []);

  /* ----- comment hypes (comment section only, never on profiles) ----- */
  const loadChHypes = useCallback(() => {
    if (!profId) return;
    db.commentHypesFor(sheetRef.current, profId).then(({ mine }) => setChMine(new Set(mine))).catch(() => {});
  }, [profId]);
  const hypeOf = (commentId) => chHypes[commentId] || 0;
  const onHypeComment = async (commentId) => {
    if (!user) return openGate(() => {}, 'hype comments');
    const mine = chMine.has(commentId);
    const optimistic = Math.max(0, (chHypes[commentId] || 0) + (mine ? -1 : 1));
    setChHypes((h) => ({ ...h, [commentId]: optimistic }));
    setChMine((m) => {
      const n = new Set(m);
      if (mine) n.delete(commentId); else n.add(commentId);
      return n;
    });
    try {
      const count = await db.hypeComment(commentId, mine ? 'remove' : 'add', profId);
      setChHypes((h) => ({ ...h, [commentId]: count }));
    } catch {
      showToast('Sync failed, kept on this device');
    }
  };

  /* ----- whatsapp group ----- */
  const loadWa = useCallback((f) => {
    if (!f) return;
    db.waJoinedCount(f.id).then((count) => setWaInfo((w) => ({ ...w, count, link: f.waLink || null }))).catch(() => {});
    if (profId) {
      db.conversations(profId).catch(() => {});
    }
  }, [profId]);
  const saveWaLink = async () => {
    if (!cur) return;
    try {
      await db.setWaLink(cur.id, waInfo.url.trim());
      setWaInfo((w) => ({ ...w, link: waInfo.url.trim(), editing: false }));
      showToast('Group link saved');
    } catch (e) {
      showToast(e.message || 'Could not save, try again');
    }
  };
  const openWaLink = async () => {
    if (!cur || !waInfo.link) return;
    if (!st.joins.includes(cur.id)) {
      showToast("Join the plan first to get the group link");
      return;
    }
    if (profId) {
      db.waJoin(cur.id, profId).then((count) => setWaInfo((w) => ({ ...w, count }))).catch(() => {});
    }
    window.open(waInfo.link, '_blank', 'noopener');
  };
  const confirmWaJoined = async () => {
    if (!cur || !profId) return;
    const count = await db.waJoin(cur.id, profId).catch(() => null);
    if (count != null) {
      setWaInfo((w) => ({ ...w, count }));
      showToast('Marked as joined. See you there.');
    }
  };

  /* ----- chats ----- */
  const loadConversations = useCallback(() => {
    if (!profId) return;
    db.conversations(profId).then((list) => setConversations(list)).catch(() => {});
  }, [profId]);
  const openThread = (otherId) => {
    setChatThreadWith(otherId);
    if (!profId) return;
    db.threadWith(profId, otherId).then((list) => setThreadMsgs(list)).catch(() => {});
  };
  const sendMessage = async ({ recipient, body, sticker }) => {
    if (!profId) return;
    // Optimistic: renders instantly, syncs under the cursor.
    const temp = { id: 'tmp' + Date.now(), sender: profId, recipient, body, sticker, created_at: new Date().toISOString() };
    setThreadMsgs((m) => [...m, temp]);
    try {
      const saved = await db.sendMessage({ sender: profId, recipient, body, sticker });
      setThreadMsgs((m) => m.map((x) => (x.id === temp.id ? saved : x)));
    } catch {
      showToast('Message not sent, try again');
    }
  };

  /* ----- deep-link validation once the backend answers ----- */
  useEffect(() => {
    if (feedState !== 'ready' && feedState !== 'empty') return;
    if (screen.name === 'form' && !forms.some((f) => f.id === screen.param)) go('home');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedState]);

  /* ----- supabase session -> local user mirror + server state -----
     Runs only on session/profile transitions (never on screen changes), so
     the app never snaps the user around mid-editing. */
  const setupDone = useRef(false);
  const prevSbUser = useRef(null);
  useEffect(() => {
    if (!SB || auth.loading) return;
    const sbu = auth.sbUser;
    const p = auth.profile;
    const justLoggedIn = !!sbu && !prevSbUser.current;
    prevSbUser.current = sbu || null;
    if (sbu && p) {
      if (!String(p.handle).startsWith('@user_')) {
        setupDone.current = true;
        setSt((s) => ({
          ...s,
          user: { name: p.name, handle: p.handle, photo: db.profilePhoto(p) },
          ob: true,
        }));
        db.myState(p.id)
          .then((m) => setSt((s) => ({ ...s, saves: m.saves, joins: m.joins, hypes: m.hypes })))
          .catch(() => {});
        // Resume the action the user was attempting before sign-in (comment, join, save...).
        if (justLoggedIn && pending.current) {
          const fn = pending.current;
          pending.current = null;
          setGate(false);
          fn();
        }
      } else if (justLoggedIn && !setupDone.current) {
        // fresh account: one-time username setup (resumes pending after save)
        setupDone.current = true;
        setName(p.name || '');
        go('handle');
      }
    }
  }, [SB, auth.loading, auth.sbUser, auth.profile]);

  /* ----- guest consistency: local mirror follows the real session ----- */
  useEffect(() => {
    if (!SB || auth.loading) return;
    if (!auth.sbUser && st.user) setSt((s) => ({ ...s, user: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SB, auth.loading, auth.sbUser]);

  /* ----- deep links applied on mount (client only, no hydration mismatch) ----- */
  const deepLinked = useRef(false);
  useEffect(() => {
    try {
      const p = window.location.pathname;
      let m = p.match(/^\/form\/([\w-]+)/);
      if (m) {
        deepLinked.current = true;
        setScreen({ name: 'form', param: m[1] });
        return;
      }
      m = p.match(/^\/@([\w]+)/);
      if (m) {
        deepLinked.current = true;
        setScreen({ name: 'profile', param: '@' + m[1].toLowerCase() });
        return;
      }
      m = p.match(/^\/(home|saved|profile|chat|notifs)$/);
      if (m) {
        deepLinked.current = true;
        setScreen({ name: m[1], param: null });
        return;
      }
    } catch {}
  }, []);

  /* ----- splash flow ----- */
  useEffect(() => {
    if (screen.name !== 'splash') return;
    if (deepLinked.current) return;
    const t = setTimeout(() => go(st.ob ? 'home' : 'ob1'), st.ob ? 800 : 1600);
    return () => clearTimeout(t);
  }, [screen.name, st.ob, go]);

  /* ----- PWA + online + auto-update ----- */
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
        // Listen for update notifications from the service worker
        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data?.type === 'UPDATE_AVAILABLE') setUpdateReady(true);
        });
        // Periodically check for updates
        setInterval(() => {
          navigator.serviceWorker.controller?.postMessage({ type: 'CHECK_UPDATE' });
        }, 60000);
      });
    }
    const on = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) showToast('Back online');
    };
    setOffline(!navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    const bip = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', bip);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
      window.removeEventListener('beforeinstallprompt', bip);
    };
  }, [showToast]);

  /* ----- scroll reveal: IntersectionObserver for card entrance animations ----- */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    const timer = setTimeout(() => {
      document.querySelectorAll('.card, .prow').forEach((el) => obs.observe(el));
    }, 300);
    return () => { clearTimeout(timer); obs.disconnect(); };
  }, [screen.name]);

  /* ----- realtime: targeted merges only (no refetch = minimal egress) ----- */
  const pushActivity = useCallback((text) => {
    setActivity((a) => [{ id: Date.now() + Math.random(), text, ts: Date.now() }, ...a].slice(0, 15));
    setUnread((u) => u + 1);
  }, []);

  const mergeFormRow = useCallback((row) => {
    const next = rowToForm(row, null);
    setForms((prev) => {
      const cur = prev.find((f) => f.id === next.id);
      if (!cur) return [next, ...prev];
      return prev.map((f) => (f.id === next.id ? { ...next, img: next.img || f.img, commentCount: f.commentCount } : f));
    });
    return next;
  }, []);

  const liveStatus = 'live';
  useEffect(() => {
    const unsub = db.subscribe((ev) => {
      if (ev.kind === 'comment' && ev.row) {
        const c = toComment(ev.row);
        mergeComment(c);
        const fs = formsRef.current;
        const u = userRef.current;
        const f = fs.find((x) => x.id === c.formId);
        pushActivity(`${c.user?.name || 'Someone'} commented on ${f?.title || 'a Form'}`);
        const me = String(u?.handle || '').toLowerCase();
        if (u && f?.host && f.host.handle.toLowerCase() === me && String(c.user?.handle || '').toLowerCase() !== me) {
          showToast(`${c.user?.name || 'Someone'} commented on your Form`);
        }
      } else if (ev.kind === 'forms' && ev.row) {
        if (ev.type === 'INSERT') {
          const next = mergeFormRow(ev.row);
          pushActivity(`New plan near you: ${next.title}`);
          setNewCount((c) => c + 1);
        } else {
          mergeFormRow(ev.row);
        }
      } else if (ev.kind === 'status') {
        loadStatuses();
      } else if (ev.kind === 'comment-hype' && ev.row) {
        setChHypes((h) => ({ ...h, [ev.row.comment_id]: (h[ev.row.comment_id] || 0) + (ev.type === 'DELETE' ? -1 : 1) }));
      } else if (ev.kind === 'message' && ev.row) {
        const u = userRef.current;
        if (u && profIdRef.current) {
          const mine = ev.row.sender === profIdRef.current;
          if (mine) {
            setThreadMsgs((m) => (m.some((x) => x.id === ev.row.id) ? m : [...m, ev.row]));
          } else {
            const me = String(u.handle || '').toLowerCase();
            pushActivity(`New message from someone`);
            setChatUnread((c) => c + 1);
            loadConversations();
            if (chatThreadRef.current === ev.row.sender) setThreadMsgs((m) => (m.some((x) => x.id === ev.row.id) ? m : [...m, ev.row]));
          }
        }
      } else if (ev.kind === 'hype' && ev.row) {
        const d = ev.type === 'DELETE' ? -1 : 1;
        setForms((prev) => prev.map((f) => (f.id === ev.row.form_id ? { ...f, hype: Math.max(0, f.hype + d) } : f)));
      } else if (ev.kind === 'rsvp' && ev.row) {
        if (ev.row.status === 'going') {
          const d = ev.type === 'DELETE' ? -1 : 1;
          setForms((prev) => prev.map((f) => (f.id === ev.row.form_id ? { ...f, going: Math.max(0, f.going + d) } : f)));
        }
      }
    });
    return unsub;
  }, []);

  /* ----- auth ----- */
  const [ePhoto, setEPhoto] = useState(null);
  const [eVibes, setEVibes] = useState([]);
  const [eBio, setEBio] = useState('');
  const fileRef = useRef(null);
  const openEdit = () => {
    if (!user) return openGate();
    setName(user.name);
    setEPhoto(user.photo);
    setEVibes(auth.profile?.vibes || []);
    setEBio(auth.profile?.bio || '');
    setSettings(false);
    setEdit(true);
  };
  const onPhotoFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please pick an image file');
      return;
    }
    // Downscale to 256px JPEG — keeps avatars tiny for DB + egress.
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const s = Math.min(1, 256 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * s));
        c.height = Math.max(1, Math.round(img.height * s));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        setEPhoto(c.toDataURL('image/jpeg', 0.82));
      } catch {
        showToast('Could not read that photo');
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('Could not read that photo');
    };
    img.src = url;
  };
  const openGate = (fn, reason) => {
    pending.current = fn || null;
    // Already on the auth page? No popup — focus there and let sign-in resume.
    if (screen.name === 'auth') return;
    setGateReason(reason || '');
    setGate(true);
  };
  const guestSkip = () => {
    pending.current = null;
    setGate(false);
    if (['saved', 'profile'].includes(screen.name)) go(lastTab || 'home');
  };
  const googleGo = async () => {
    try {
      await auth.signInGoogle();
    } catch (e) {
      showToast('Google sign-in is not enabled yet, use email instead');
    }
  };

  /* ----- actions ----- */
  const trySave = (id) => {
    if (!user) return openGate(() => trySave(id), 'save this plan');
    const on = !st.saves.includes(id);
    setSt((s) => ({
      ...s,
      saves: on ? [...s.saves, id] : s.saves.filter((x) => x !== id),
    }));
    showToast(on ? 'Saved' : 'Removed from Saved');
    if (profId) db.save(id, on, profId).catch(() => showToast('Sync failed, kept on this device'));
  };

  const tryJoin = (id, el) => {
    if (!user) return openGate(() => tryJoin(id), 'join this plan');
    const f = forms.find((x) => x.id === id);
    const leaving = st.joins.includes(id);
    setSt((s) => ({
      ...s,
      joins: leaving ? s.joins.filter((x) => x !== id) : [...s.joins, id],
    }));
    setForms((prev) => prev.map((x) => (x.id === id ? { ...x, going: Math.max(0, x.going + (leaving ? -1 : 1)) } : x)));
    if (profId) {
      db.join(id, leaving ? 'leave' : 'join', profId)
        .then((going) => setForms((prev) => prev.map((x) => (x.id === id ? { ...x, going } : x))))
        .catch(() => showToast('Sync failed, kept on this device'));
    }
    if (!leaving) {
      showToast("You're in! See you there");
      if (el) {
        const r = el.getBoundingClientRect();
        burstConfetti(r.left + r.width / 2, r.top, true);
      }
    } else showToast('Maybe next time');
  };

  const doHype = (id, el, remove) => {
    setSt((s) => ({
      ...s,
      hypes: remove ? s.hypes.filter((x) => x !== id) : [...s.hypes, id],
    }));
    setForms((prev) => prev.map((x) => (x.id === id ? { ...x, hype: Math.max(0, x.hype + (remove ? -1 : 1)) } : x)));
    if (profId) {
      db.hype(id, remove ? 'remove' : 'add', profId)
        .then((hype) => setForms((prev) => prev.map((x) => (x.id === id ? { ...x, hype } : x))))
        .catch(() => showToast('Sync failed, kept on this device'));
    }
    if (!remove) {
      showToast('Hyped! The host sees the love');
      if (el) {
        const r = el.getBoundingClientRect();
        floatPlus(r.left + r.width / 2 - 10, r.top - 6);
      }
    }
  };
  const hypeLock = useRef({});
  const tryHype = (id, el) => {
    if (!user) return openGate(() => tryHype(id, null), 'hype this plan');
    // One toggle per tap: rapid/double taps inside the lock window are ignored
    // so the count can never jump twice.
    const now = Date.now();
    if (hypeLock.current[id] && now - hypeLock.current[id] < 700) return;
    hypeLock.current[id] = now;
    doHype(id, el, st.hypes.includes(id));
  };

  const requirePage = (name, param = null) => {
    if (!user) return openGate(() => go(name, param));
    go(name, param);
  };

  /* ----- comments // [BACKEND] swap fetch/POST for DB-backed endpoints ----- */
  const ccount = (f) => Math.max(f.commentCount || 0, (comments[f.id] || []).length);
  const latestComment = (f) => {
    const top = (comments[f.id] || []).filter((c) => !c.parentId);
    return top[top.length - 1] || null;
  };
  const mergeComment = useCallback((c) => {
    const h = hydrateComment(c);
    setComments((prev) => {
      const list = prev[h.formId] || [];
      if (list.some((x) => x.id === h.id)) return prev;
      return { ...prev, [h.formId]: [...list, h] };
    });
    cacheComment(h);
  }, []);
  const openComments = (formId) => {
    setSheet(formId);
    const merge = (server) => {
      const cached = loadCommentCache()[formId] || [];
      const merged = [...(server || []).map(hydrateComment), ...cached.map(hydrateComment)];
      const dedup = [...new Map(merged.map((c) => [c.id, c])).values()].sort((a, b) => a.ts - b.ts);
      setComments((prev) => ({ ...prev, [formId]: dedup }));
    };
    db.comments(formId).then(merge).catch(() => merge([]));
  };
  const postComment = async (body, parentId) => {
    if (!user) {
      const fid = sheet;
      openGate(() => {
        if (fid) setSheet(fid);
      });
      return;
    }
    if (!profId) {
      showToast('Syncing your profile, try again in a moment');
      return;
    }
    try {
      const c = await db.postComment({
        formId: sheet,
        body,
        parentId,
        profile: { id: profId, name: user.name, handle: user.handle, avatar_url: user.photo.startsWith('data:') ? null : user.photo },
      });
      mergeComment(c);
    } catch (e) {
      showToast(e.message || 'Could not post, try again');
    }
  };

  const openTab = (t) => {
    if (!user && (t === 'saved' || t === 'profile')) return requirePage(t);
    go(t);
  };

  // Sync chatsOpen with URL-based chat screen
  useEffect(() => {
    if (screen.name === 'chat' && user) {
      setChatsOpen(true);
      loadConversations();
      setChatUnread(0);
    } else if (screen.name !== 'chat') {
      setChatsOpen(false);
    }
  }, [screen.name, user]);

  /* ----- derived ----- */
  const cur = useMemo(() => forms.find((f) => f.id === screen.param), [forms, screen.param]);
  const vibes = auth.profile?.vibes || [];

  /* ----- unified story items: statuses first, then form stories ----- */
  const storyItems = useMemo(() => {
    const statusItems = statuses.map((s) => ({ ...s, kind: s.trackUrl ? 'music' : 'status' }));
    const formItems = [...forms]
      .sort((a, b) => Number(b.live ?? false) - Number(a.live ?? false))
      .map((f) => ({ ...f, kind: 'form' }));
    return [...statusItems, ...formItems];
  }, [statuses, forms]);

  const postStatus = async (payload) => {
    if (!profId) {
      showToast('Syncing your profile, try again in a moment');
      return;
    }
    try {
      await db.addStatus(payload, profId);
      showToast('Status is live');
      loadStatuses();
    } catch (e) {
      showToast(e.message || 'Could not post, try again');
    }
  };

  const feed = useMemo(() => {
    const list = forms.filter(
      (f) =>
        filter === 'all' ||
        (filter === 'tonight' && f.tonight) ||
        (filter === 'free' && f.free) ||
        (filter === 'nearby' && Number(f.km) <= 3)
    );
    return rankFeed(list, vibes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms, filter, auth.profile?.vibes]);
  const savedList = useMemo(
    () =>
      forms
        .filter((f) => st.saves.includes(f.id))
        .filter((f) => sfilter === 'all' || (sfilter === 'live' && f.live) || (sfilter === 'soon' && !f.live)),
    [forms, st.saves, sfilter]
  );
  const searchRes = useMemo(() => {
    const raw = searchQ.trim().toLowerCase();
    const q = raw.startsWith('#') ? raw.slice(1) : raw;
    return forms.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.area.toLowerCase().includes(q) ||
        (f.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [forms, searchQ]);
  const searchPeople = useMemo(() => {
    const raw = searchQ.trim().toLowerCase();
    if (!raw.startsWith('@')) return null;
    const q = raw.slice(1);
    const seen = new Map();
    forms.forEach((f) => {
      if (f.host) seen.set(f.host.handle.toLowerCase(), f.host);
    });
    return [...seen.values()].filter(
      (h) => h.handle.toLowerCase().includes(q) || h.name.toLowerCase().includes(q)
    );
  }, [forms, searchQ]);
  const sheetForm = sheet ? forms.find((f) => f.id === sheet) : null;

  const tabbed = ['home', 'saved', 'profile', 'chat'].includes(screen.name);
  useEffect(() => {
    if (tabbed) setLastTab(screen.name);
  }, [screen.name, tabbed]);

  /* ----- auth tab sync (gate routes here with up/in) ----- */
  useEffect(() => {
    if (screen.name === 'auth') {
      setEmMode(screen.param === 'up' ? 'up' : 'in');
      setEmErr('');
    }
  }, [screen]);

  /* ----- deep-link hash sync (/#/form/:id and /#/@handle) ----- */
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const userRef = useRef(null);
  userRef.current = st.user;
  const formsRef = useRef(forms);
  formsRef.current = forms;
  const profIdRef = useRef(null);
  profIdRef.current = profId;
  const chatThreadRef = useRef(null);
  chatThreadRef.current = chatThreadWith;
  useEffect(() => {
    // URL stays in sync via go()'s history.pushState — nothing to do here.
  }, [screen]);
  useEffect(() => {
    const onPop = () => {
      const s = screenRef.current;
      const u = userRef.current;
      const p = window.location.pathname;
      let m = p.match(/^\/form\/([\w-]+)/);
      if (m) {
        if (!(s.name === 'form' && s.param === m[1])) setScreen({ name: 'form', param: m[1] });
        return;
      }
      m = p.match(/^\/@([\w]+)/);
      if (m) {
        const handle = '@' + m[1].toLowerCase();
        if (!(s.name === 'profile' && s.param === handle)) setScreen({ name: 'profile', param: handle });
        return;
      }
      m = p.match(/^\/(home|saved|profile|chat|notifs)$/);
      if (m) {
        const t = m[1];
        if (s.name === t && !s.param) return;
        if ((t === 'saved' || t === 'profile') && !u) {
          setScreen({ name: 'home', param: null });
          return;
        }
        setScreen({ name: t, param: null });
      } else if (p === '/' || p === '') {
        if (s.name !== 'home') setScreen({ name: 'home', param: null });
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* ----- public profile (@handle links) ----- */
  const viewingHandle = screen.name === 'profile' ? screen.param : null;
  const isOwnProfile =
    !viewingHandle || (user && viewingHandle.toLowerCase() === String(user.handle || '').toLowerCase());
  const pubHost =
    !isOwnProfile && viewingHandle
      ? forms.map((f) => f.host).find((h) => h && h.handle.toLowerCase() === viewingHandle.toLowerCase()) || null
      : null;
  const pubBio = pubProfile?.bio || '';

  /* ----- whatsapp info loads with the detail page ----- */
  useEffect(() => {
    if (screen.name !== 'form' || !cur) return;
    loadWa(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.name, screen.param, cur?.id, cur?.waLink]);

  /* ----- profile events load when the profile screen opens ----- */
  useEffect(() => {
    if (screen.name !== 'profile') return;
    if (isOwnProfile && user) {
      setProfTab('attended');
      loadProfEvents(user.handle, profId);
      return;
    }
    if (!isOwnProfile && viewingHandle) {
      setProfTab('hosted'); // others' profiles open on Hosted
      let cancelled = false;
      db.profileByHandle(viewingHandle).then((p) => {
        if (cancelled) return;
        setPubProfile(p || null);
        loadProfEvents(viewingHandle, p?.id || null);
      }).catch(() => loadProfEvents(viewingHandle, null));
      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.name, screen.param, isOwnProfile, user?.handle, profId]);

  /* ----- create ----- */
  const postForm = () => {
    const title = cTitle.trim();
    if (title.length < 3) return showToast('Describe your plan first');
    if (!user) return openGate(postForm, 'share a plan');
    const tags = cTags.join(', ');
    const img = cPhoto ? IMGP(cPhoto, 800, 600) : IMGP('fng-default' + (Date.now() % 7), 800, 600);
    const desc = tags ? `Tags: ${tags}. You are hosting this one. Details in the chat.` : 'You are hosting this one. Details in the chat.';
    if (!profId) {
      showToast('Syncing your profile, try again in a moment');
      return;
    }
    db.createForm(
      { title, area: cLoc.trim() || 'Near you', desc, img, mapLink: cMap.trim() || null },
      { id: profId, name: user.name, handle: user.handle, avatar_url: user.photo.startsWith('data:') ? null : user.photo }
    )
      .then((f) => {
        setForms((prev) => [f, ...prev]);
        setSt((s) => ({ ...s, joins: [...s.joins, f.id] }));
      })
      .catch((e) => showToast(e.message || 'Could not publish, try again'));
    setCTitle('');
    setCLoc('');
    setCMap('');
    setCPhoto(null);
    setCTags(['Rooftop']);
    go('home');
    showToast('Your plan is live!');
    burstConfetti(window.innerWidth / 2, window.innerHeight * 0.4, true);
  };

  /* ----- handle setup ----- */
  const onHandleInput = (v) => {
    const bare = v.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '');
    setHandle(bare ? '@' + bare : '');
    if (bare.length < 3) return setHandleMsg({ text: '3+ characters, no spaces.', kind: '' });
    if ((meta.taken || []).includes(bare)) return setHandleMsg({ text: `@${bare} is taken`, kind: 'bad' });
    setHandleMsg({ text: `@${bare} is available`, kind: 'ok' });
  };
  const submitHandle = async () => {
    const bare = handle.replace(/^@/, '');
    if (bare.length < 3) return;
    if (!auth.sbUser) {
      showToast('Log in first, then pick your username');
      return;
    }
      try {
        const taken = await db.profileByHandle('@' + bare);
        if (taken && taken.id !== auth.sbUser.id) {
          setHandleMsg({ text: `@${bare} is taken`, kind: 'bad' });
          return;
        }
        await auth.saveProfile({ name: name.trim() || auth.profile?.name || 'Someone', handle: '@' + bare });
        showToast(`Welcome, ${(name.trim() || 'friend').split(' ')[0]}`);
        setSt((s) => ({ ...s, ob: true }));
        const fn = pending.current;
        pending.current = null;
        if (fn) fn();
        else go('home');
      } catch (e) {
        showToast(e.message || 'Could not save, try again');
      }
  };

  const installApp = async () => {
    setSettings(false);
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      setDeferred(null);
    } else showToast('Open the browser menu, then Install or Add to Home Screen');
  };

  const on = (id) => id === screen.name || `scr-${screen.name}` === id;

  return (
    <div className="app-root" id="phone">

        <div className="screens">
          {/* SPLASH */}
          <section className={`screen s-splash ${on('splash') ? 'on' : ''}`}>
            <div className="scr splash-scr">
              <ThreeHero className="splash-three" />
              <div className="logo-lock">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="splash-flame">
                  <path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z" />
                  <path d="M12 22a7 7 0 01-7-7c0-1.5.5-2.5 1-3.5C9 8 10 5 10 2c3 2 8 6 8 12a8 8 0 01-6 8z" opacity=".45" />
                </svg>
                <b>Form Ni Gani?</b>
              </div>
            </div>
          </section>

          {/* ONBOARD 1 */}
          <section
            className={`screen s-ob ${on('ob1') ? 'on' : ''}`}
            onPointerDown={(e) => { obSwipe.current = { x: e.clientX }; }}
            onPointerUp={(e) => {
              const s = obSwipe.current;
              obSwipe.current = null;
              if (s && s.x - e.clientX > 50) go('ob2');
            }}
          >
            <div className="scr">
              <div className="blob b1" />
              <div className="blob b2" />
              <div className="brandmini"><BrandMark /><b>Form Ni Gani?</b></div>
              <div className="stack tilt">
                <img className="p1" src="https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=600&h=720&fit=crop&q=80" alt="" />
                <img className="p2" src="https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=600&h=720&fit=crop&q=80" alt="" />
                <span className="float-chip fc1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z" /></svg>
                  Real people, real plans
                </span>
              </div>
              <h1>There's always<br /><em className="hl">a plan near you.</em></h1>
              <p>The best nights in the city are happening right now. Don't miss out.</p>
              <div className="dots">
                <button className="dotbtn on" aria-label="Screen 1" onClick={() => go('ob1')}><i /></button>
                <button className="dotbtn" aria-label="Screen 2" onClick={() => go('ob2')}><i /></button>
              </div>
              <div className="ob-pad" />
              <button className="btn-black ob-cta" onClick={() => go('ob2')}>Continue</button>
              <span className="swipe-hint">swipe</span>
            </div>
          </section>

          {/* ONBOARD 2 */}
          <section
            className={`screen s-ob ${on('ob2') ? 'on' : ''}`}
            onPointerDown={(e) => { obSwipe.current = { x: e.clientX }; }}
            onPointerUp={(e) => {
              const s = obSwipe.current;
              obSwipe.current = null;
              if (s && e.clientX - s.x > 50) go('ob1');
            }}
          >
            <div className="scr">
              <div className="blob b1" />
              <div className="blob b2" />
              <div className="brandmini"><BrandMark /><b>Form Ni Gani?</b></div>
              <div className="stack tilt">
                <img className="p1" src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=720&fit=crop&q=80" alt="" />
                <img className="p2" src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=720&fit=crop&q=80" alt="" />
                <span className="chip-badge float-chip fc2"><i className="dot" />LIVE</span>
                <span className="chip-badge chip-l float-chip fc3"><i className="dot mute" />Ending soon</span>
                <span className="float-chip fc4">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z" /><path d="M12 22a7 7 0 01-7-7c0-1.5.5-2.5 1-3.5C9 8 10 5 10 2c3 2 8 6 8 12a8 8 0 01-6 8z" opacity=".45" /></svg>
                  Hype what you love
                </span>
              </div>
              <h1>They post it. You<br /><em className="hl">show up.</em></h1>
              <p>Discover plans around you and join the moments that matter.</p>
              <div className="dots">
                <button className="dotbtn" aria-label="Screen 1" onClick={() => go('ob1')}><i /></button>
                <button className="dotbtn on" aria-label="Screen 2" onClick={() => go('ob2')}><i /></button>
              </div>
              <div className="ob-pad" />
              <button className="btn-black ob-cta" onClick={() => go('auth')}>Continue</button>
              <span className="swipe-hint">swipe</span>
            </div>
          </section>

          {/* AUTH */}
          <section className={`screen s-auth ${on('auth') ? 'on' : ''}`}>
            <div className="scr">
              <div className="bgimg" />
              <ThreeHero className="auth-three" />
              <div className="veil" />
              <div className="inner">
                <div className="brandmini"><BrandMark /><b>Form Ni Gani?</b></div>
                <h1>Every day has<br /><em style={{ color: '#F07BE8', fontStyle: 'normal' }}>a plan.</em></h1>
                {SB && (
                  <div className="pillrow auth-tabs">
                    <button className={`pill ${emMode === 'up' ? 'on' : ''}`} onClick={() => { setEmMode('up'); setEmErr(''); }}>Sign up</button>
                    <button className={`pill ${emMode === 'in' ? 'on' : ''}`} onClick={() => { setEmMode('in'); setEmErr(''); }}>Sign in</button>
                  </div>
                )}
                {SB && (
                  <form className="emailbox" onSubmit={(e) => { e.preventDefault(); doEmail(); }} autoComplete="on">
                    <input className="input" name="email" value={em} onChange={(e) => setEm(e.target.value)} placeholder="Email address" inputMode="email" autoComplete="email" onKeyDown={(e) => { if (e.key === 'Enter') doEmail(); }} />
                    <div className="pw-wrap">
                      <input className="input" name="password" type={showPw ? 'text' : 'password'} value={emPw} onChange={(e) => setEmPw(e.target.value)} placeholder="Password (6+ characters)" autoComplete={emMode === 'up' ? 'new-password' : 'current-password'} onKeyDown={(e) => { if (e.key === 'Enter') doEmail(); }} />
                      <button type="button" className="pw-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                        {showPw ? (
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><path d="M14.12 14.12a3 3 0 11-4.24-4.24" /><path d="M1 1l22 22" /></svg>
                        ) : (
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                    {emErr ? <div className="hmsg bad">{emErr}</div> : <div className="hmsg" />}
                    <button className="btn-go" onClick={doEmail} disabled={emBusy}>
                      {emBusy ? 'One moment...' : emMode === 'up' ? 'Create account' : 'Log in'}
                    </button>
                    <div className="ordiv"><i />or<i /></div>
                  </form>
                )}
                <GoogleButton id="auth" onClick={googleGo} />
                <button className="guest-btn" onClick={() => go('home')}>Continue as guest</button>
              </div>
            </div>
          </section>

          {/* HANDLE */}
          <section className={`screen s-handle ${on('handle') ? 'on' : ''}`}>
            <div className="scr">
              <button className="iconbtn back" onClick={() => go('auth')} aria-label="Back">{I.back}</button>
              <img className="ava" src="https://i.pravatar.cc/120?img=12" alt="" />
              <h2>Pick your username</h2>
              <p className="sub">Pick a handle, that&apos;s how people find you.</p>
              <div className="hcard">
                <label>Your name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="off" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && handleMsg.kind === 'ok') submitHandle(); }} />
                <label>Your handle</label>
                <input className="input" value={handle} onChange={(e) => onHandleInput(e.target.value)} placeholder="@nightowl" autoComplete="off" spellCheck="false" onKeyDown={(e) => { if (e.key === 'Enter' && handleMsg.kind === 'ok') submitHandle(); }} />
                <div className={`hmsg ${handleMsg.kind}`}>{handleMsg.text}</div>
              </div>
              <button className="btn-black" disabled={handleMsg.kind !== 'ok'} onClick={submitHandle}>Continue</button>
              <div className="hnote">You can change this later in settings.</div>
            </div>
          </section>

          {/* HOME */}
          <section className={`screen s-home ${on('home') ? 'on' : ''}`}>
            <div className="scr">
              <div className="pagehead">
                <div>
                  <h1>{I.flame} Form ni gani? <LiveDot status={liveStatus} /></h1>
                </div>
                <div className="acts">
                  <button className="iconbtn" aria-label="Search" onClick={() => { setSearchQ(''); setSearchOpen(true); }}>{I.search}</button>
                  <button className="iconbtn bellwrap" aria-label="Notifications" onClick={() => { setUnread(0); requirePage('notifs'); }}>
                    {I.bell}{unread > 0 && <i className="bell-dot">{unread > 9 ? '9+' : unread}</i>}
                  </button>
                </div>
              </div>
              <StoriesRail
                statuses={statuses}
                forms={forms}
                seen={new Set(seen)}
                meHandle={user?.handle}
                onOpen={(kind, id) => {
                  const items = storyItems;
                  const i = items.findIndex((x) => x.id === id);
                  if (i >= 0) setStoryIdx(i);
                }}
                onAdd={() => {
                  if (!user) return openGate(() => { setComposer(true); }, 'post a status');
                  setComposer(true);
                }}
              />
              {newCount > 0 && (
                <button
                  className="newchip"
                  onClick={() => {
                    setNewCount(0);
                    const scr = document.querySelector('#scr-home .scr') || document.querySelector('.s-home .scr');
                    if (scr) scr.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <i className="vdot" />{newCount} new plan{newCount === 1 ? '' : 's'}, tap to view
                </button>
              )}
              <div className="pillrow page">
                {[['all', 'All'], ['tonight', 'Tonight'], ['free', 'Free'], ['nearby', 'Nearby']].map(([v, l]) => (
                  <button key={v} className={`pill ${filter === v ? 'on' : ''}`} onClick={() => setFilter(v)}>{l}</button>
                ))}
              </div>
              <div className="cards">
                {feed.length ? feed.map((f, i) => (
                  <Card key={f.id} f={f} top={i === 0} saved={st.saves.includes(f.id)} hyped={st.hypes.includes(f.id)} me={st.joins.includes(f.id) && user ? user.photo : null} onOpen={(id) => go('form', id)} onSave={trySave} onHype={tryHype} onHost={(h) => go('profile', h)} onShare={sharePlan} cc={ccount(f)} latest={latestComment(f)} onComments={openComments} onUser={(h) => setProfSheet(h)} onTag={(t) => { setSearchQ('#' + t); setSearchOpen(true); }} />
                )) : feedState === 'loading' ? (
                  <div className="cards"><div className="skel" /><div className="skel" /><div className="skel" /></div>
                ) : feedState === 'error' ? (
                  <div className="feed-error">
                    <h3>Couldn&apos;t reach the backend</h3>
                    <p>Check your connection and try again.</p>
                    <button className="btn-black" onClick={loadFeed}>Retry</button>
                  </div>
                ) : <p className="empty">No plans match this filter, try &quot;All&quot;.</p>}
              </div>
            </div>
          </section>

          {/* SAVED */}
          <section className={`screen s-saved ${on('saved') ? 'on' : ''}`}>
            <div className="scr">
              <div className="pagehead">
                <h1>Saved</h1>
                <div className="acts">
                  <button className="iconbtn" aria-label="Search" onClick={() => { setSearchQ(''); setSearchOpen(true); }}>{I.search}</button>
                </div>
              </div>
              <div className="pillrow page">
                {[['all', 'All'], ['live', 'Live now'], ['soon', 'Starting soon']].map(([v, l]) => (
                  <button key={v} className={`pill ${sfilter === v ? 'on' : ''}`} onClick={() => setSfilter(v)}>{l}</button>
                ))}
              </div>
              <div className="cards">
                {savedList.length ? savedList.map((f) => (
                  <Card key={f.id} f={f} saved hyped={st.hypes.includes(f.id)} me={st.joins.includes(f.id) && user ? user.photo : null} onOpen={(id) => go('form', id)} onSave={trySave} onHype={tryHype} onHost={(h) => go('profile', h)} onShare={sharePlan} cc={ccount(f)} latest={latestComment(f)} onComments={openComments} onUser={(h) => setProfSheet(h)} onTag={(t) => { setSearchQ('#' + t); setSearchOpen(true); }} />
                )) : <p className="empty">Nothing saved yet. Tap the bookmark on any plan to keep it here.</p>}
              </div>
            </div>
          </section>

          {/* PROFILE */}
          <section className={`screen s-profile ${on('profile') ? 'on' : ''}`}>
            <div className="scr">
              <div className="pagehead">
                <h1>{isOwnProfile ? 'Profile' : viewingHandle}</h1>
                <div className="acts">
                  {user && (
                    <button
                      className="iconbtn"
                      aria-label="Share profile"
                      onClick={() => {
                        if (isOwnProfile) shareProfile(user.handle, user.name);
                        else if (pubHost) shareProfile(pubHost.handle, pubHost.name);
                      }}
                    >
                      {I.share}
                    </button>
                  )}
                  {isOwnProfile && user && (
                    <button className="iconbtn" aria-label="Settings" onClick={() => setSettings(true)}>{I.gear}</button>
                  )}
                </div>
              </div>
              {isOwnProfile && !user && (
                <div className="guest-prompt">
                  <h3>This is your space</h3>
                  <p>Log in to see your profile, your plans, and your hype.</p>
                  <button className="btn-black" onClick={() => openGate(() => go('profile'))}>Log in</button>
                </div>
              )}
              {isOwnProfile && user && (
                <>
                  <div className="prof-top">
                    <div className="ava-wrap">
                      <img className="ava" src={user.photo} alt="" />
                      <button className="pen" onClick={openEdit} aria-label="Edit profile">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                      </button>
                    </div>
                    <div className="nrow"><h3>{user.name}</h3></div>
                    <div className="hdl">{user.handle}</div>
                    {auth.profile?.bio ? (
                      <p className="prof-bio">{auth.profile.bio}</p>
                    ) : (
                      <button className="prof-bio placeholder" onClick={openEdit}>
                        Type anything about yourself...
                      </button>
                    )}
                  </div>
                  <ProfileEvents
                    tab={profTab}
                    onTab={setProfTab}
                    events={profEvents}
                    state={profEventsState}
                    onOpen={(id) => go('form', id)}
                    st={st}
                    user={user}
                    cards
                  />
                </>
              )}
              {!isOwnProfile && !pubHost && (
                <div className="guest-prompt">
                  <h3>No one here yet</h3>
                  <p>{viewingHandle} hasn't posted a plan. Explore what's live instead.</p>
                  <button className="btn-black" onClick={() => go('home')}>Explore plans</button>
                </div>
              )}
              {!isOwnProfile && pubHost && (
                <>
                  <div className="prof-top">
                    <div className="ava-wrap">
                      <img className="ava" src={hostPhoto(pubHost)} alt="" />
                    </div>
                    <div className="nrow"><h3>{pubHost.name}</h3></div>
                    <div className="hdl">{pubHost.handle}</div>
                    {pubBio ? <p className="prof-bio">{pubBio}</p> : null}
                  </div>
                  <div className="pub-cta">
                    <button className="hype-btn" onClick={() => {
                      if (!profId || !pubProfile?.id) { showToast('Syncing profiles, try again in a moment'); return; }
                      openThread(pubProfile.id);
                      setChatsOpen(true);
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
                      Message
                    </button>
                  </div>
                  <div className="pub-cta">
                    <button className="hype-btn" onClick={() => {
                      if (!profId || !pubProfile?.id) { showToast('Syncing profiles, try again in a moment'); return; }
                      openThread(pubProfile.id);
                      setChatsOpen(true);
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
                      Message
                    </button>
                  </div>
                  <ProfileEvents
                    tab={profTab}
                    onTab={setProfTab}
                    events={profEvents}
                    state={profEventsState}
                    onOpen={(id) => go('form', id)}
                    st={st}
                    user={user}
                    cards
                  />
                </>
              )}
            </div>
          </section>

          {/* MAP — parked until the radar ships. Uncomment to restore.
          <section className={`screen s-map ${on('map') ? 'on' : ''}`}>
            <div className="scr">
              <svg className="mapsvg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <rect width="400" height="800" fill="#EDEFF1" />
                <g stroke="#FFFFFF" fill="none" strokeLinecap="round">
                  <path d="M-20 120 H420" strokeWidth="12" /><path d="M-20 300 H420" strokeWidth="7" /><path d="M-20 470 H420" strokeWidth="9" /><path d="M-20 640 H420" strokeWidth="6" />
                  <path d="M70 -20 V820" strokeWidth="9" /><path d="M180 -20 V820" strokeWidth="6" /><path d="M290 -20 V820" strokeWidth="11" /><path d="M355 -20 V820" strokeWidth="5" />
                  <path d="M-20 210 L420 190" strokeWidth="4" /><path d="M-20 560 L420 540" strokeWidth="4" />
                </g>
                <ellipse cx="330" cy="215" rx="42" ry="30" fill="#DDEFDC" /><ellipse cx="120" cy="520" rx="34" ry="26" fill="#DDEFDC" />
                <path d="M60 60 V200 Q60 230 90 230 H180 Q210 230 210 260 V560 Q210 590 240 590 H310 Q335 590 335 620 V655" fill="none" stroke="#49AAFF" strokeWidth="7" strokeLinecap="round" />
                <circle cx="60" cy="60" r="6" fill="#FF4D4D" stroke="#fff" strokeWidth="2.5" />
                <circle className="pulse" cx="335" cy="655" r="20" fill="#49AAFF" opacity=".4" />
                <circle cx="335" cy="655" r="9" fill="#1E90FF" stroke="#fff" strokeWidth="3.5" />
                <g fill="#9AA0A6" fontFamily="'Plus Jakarta Sans',sans-serif" fontSize="12" fontWeight="600">
                  <text x="84" y="245">Chiromo Lane</text>
                  <text x="296" y="140" transform="rotate(90 296 140)">Rhapta Road</text>
                  <text x="20" y="480">Mpaka Road</text>
                  <text x="230" y="112">Ring Rd Westlands</text>
                </g>
              </svg>
              <div className="map-search" onClick={() => { setSearchQ(''); setSearchOpen(true); }}>
                {I.search} Search this area
              </div>
              <div className="map-card" onClick={() => go('form', 'f1')}>
                <img src="https://picsum.photos/seed/fng-bonfire/400/400" alt="" />
                <div>
                  <h4>Bonfire + acoustic night</h4>
                  <span className="darkpill"><i className="dot" />{f1 ? `${f1.km} km • Live • ${fmt(f1.viewers)} watching` : '1.2 km • Live'}</span>
                  <div className="more">+22 more plans near you</div>
                </div>
              </div>
            </div>
          </section>
          */}

          {/* DETAIL */}
          <section className={`screen s-form ${on('form') ? 'on' : ''}`}>
            <div className="scr" style={{ position: 'relative' }}>
              <div className="hero">
                {cur && <Image src={cur.img} alt="" fill sizes="400px" style={{ objectFit: 'cover' }} priority />}
                <button className="back" onClick={() => go(lastTab || 'home')} aria-label="Back">{I.back}</button>
                <button className="share-btn" onClick={() => cur && sharePlan(cur)} aria-label="Share this plan">{I.share}</button>
                <span className="chip-badge">
                  {cur?.live ? <><i className="dot" />LIVE</> : <><i className="dot mute" />{cur?.startsShort || 'Starting soon'}</>}
                </span>
              </div>
              <div className="sheet">
                <h2>{cur?.title || ''}</h2>
                {cur?.host && (
                  <div className="hostline big" onClick={() => go('profile', cur.host.handle)}>
                    <img src={hostPhoto(cur.host)} alt="" />
                    <span>Hosted by {cur.host.name} · {cur.host.handle}</span>
                  </div>
                )}
                {cur?.live && (
                  <div className="livebar">
                    <span className="live-eye">{I.eye}<b>{fmt(cur.viewers)}</b>&nbsp;watching now</span>
                    <button className={`hype-btn ${st.hypes.includes(cur.id) ? 'on' : ''}`} onClick={(e) => tryHype(cur.id, e.currentTarget)}>
                      {I.flame}<b>{fmt(cur.hype)}</b>&nbsp;hype
                    </button>
                  </div>
                )}
                <div className="avs">
                  {(cur?.avs || []).slice(0, 4).map((n) => (
                    <img key={n} src={AVA(n)} alt="" />
                  ))}
                  {cur && st.joins.includes(cur.id) && user && <img src={user.photo} alt="you" />}
                  <span>{cur ? `${cur.going} already here` : ''}</span>
                </div>
                <div className="meta">
                  <div>{I.pin}<span>{cur ? `${cur.km} km away` : ''}</span></div>
                  <div>{I.clock}<span>{cur?.ends || ''}</span></div>
                </div>
                <button
                  className="dirbtn"
                  onClick={() => {
                    const q = cur ? `${cur.title} ${cur.area}` : '';
                    window.open(cur?.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank', 'noopener');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.1 7-11a7 7 0 10-14 0c0 5.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                  Directions
                  {cur?.mapLink ? <span className="dir-note">exact pin</span> : <span className="dir-note">approximate</span>}
                </button>
                <hr />
                {cur?.desc && (
                  <DescBlock text={cur.desc} onUser={(h) => setProfSheet(h)} onTag={(t) => { setSearchQ('#' + t); setSearchOpen(true); }} />
                )}
                {cur?.tags?.length > 0 && (
                  <div className="tagrow">
                    {cur.tags.map((t) => (
                      <button key={t} className="tagchip" onClick={() => { setSearchQ('#' + t); setSearchOpen(true); }}>
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
                {cur && st.joins.includes(cur.id) && (
                  <div className="wa-box">
                    <div className="wa-head">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
                      <b>Group chat</b>
                      <span className="wa-count">{waInfo.count} joined</span>
                    </div>
                    {cur.host && user && cur.host.handle.toLowerCase() === String(user.handle || '').toLowerCase() ? (
                      waInfo.editing ? (
                        <div className="wa-edit">
                          <input className="input" value={waInfo.url} onChange={(e) => setWaInfo((w) => ({ ...w, url: e.target.value }))} placeholder="Paste the WhatsApp group invite link" />
                          <button className="btn-go wa-save" onClick={saveWaLink}>Save</button>
                        </div>
                      ) : (
                        <button className="wa-btn host" onClick={() => setWaInfo((w) => ({ ...w, editing: true, url: w.link || '' }))}>
                          {waInfo.link ? 'Edit group link' : 'Add the WhatsApp group link'}
                        </button>
                      )
                    ) : waInfo.link ? (
                      <>
                        <button className="wa-btn" onClick={openWaLink}>Open the WhatsApp group</button>
                        <button className="wa-confirm" onClick={confirmWaJoined}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                          I clicked and joined
                        </button>
                      </>
                    ) : (
                      <p className="wa-none">The host has not added a group link yet.</p>
                    )}
                  </div>
                )}
                <div className="crow-entry" onClick={() => cur && openComments(cur.id)}>
                  <span>Comments ({cur ? ccount(cur) : 0})</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
                </div>
                {cur && !cur.live && (
                  <button className={`hype-btn ${st.hypes.includes(cur.id) ? 'on' : ''}`} onClick={(e) => tryHype(cur.id, e.currentTarget)} style={{ marginTop: 14 }}>
                    {I.flame}<b>{fmt(cur.hype)}</b>&nbsp;hype this plan
                  </button>
                )}
              </div>
              <div className="form-actions">
                <button className="btn-ghost" onClick={() => go(lastTab || 'home')}>Can&apos;t make it</button>
                <button className={`btn-primary ${cur && st.joins.includes(cur.id) ? 'joined' : ''}`} onClick={(e) => cur && tryJoin(cur.id, e.currentTarget)}>
                  {cur && st.joins.includes(cur.id) ? "You're In" : "I'm In!"}
                </button>
              </div>
            </div>
          </section>

          {/* CREATE */}
          <section className={`screen s-create ${on('create') ? 'on' : ''}`}>
            <div className="scr">
              <div className="cre-head">
                <button className="xbtn" onClick={() => go('home')} aria-label="Close">{I.close}</button>
                <h2>New Plan</h2>
                <button className="post" disabled={cTitle.trim().length < 3} onClick={postForm}>Post</button>
              </div>
              <button
                className={`photo ${cPhoto ? 'has' : ''}`}
                style={cPhoto ? { backgroundImage: `url(${IMGP(cPhoto, 800, 500)})` } : undefined}
                onClick={() => setCPhoto('fng-post-' + Math.floor(Math.random() * 9999))}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5A2.5 2.5 0 015.5 6h1.6L8.6 4h6.8l1.5 2h1.6A2.5 2.5 0 0121 8.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5z" /><circle cx="12" cy="13" r="3.4" /></svg>
                <span id="cPhotoTxt" style={cPhoto ? { background: 'rgba(0,0,0,.45)', color: '#fff', padding: '6px 14px', borderRadius: 999 } : undefined}>
                  {cPhoto ? 'Change photo' : 'Add photo'}
                </span>
              </button>
              <label className="flabel">What&apos;s the plan?</label>
              <input className="input" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Rooftop hang, bring snacks..." autoComplete="off" />
              <label className="flabel">Where?</label>
              <input className="input" value={cLoc} onChange={(e) => setCLoc(e.target.value)} placeholder="Location, e.g. Kileleshwa rooftop" autoComplete="off" />
              <label className="flabel">Map link (optional)</label>
              <input className="input" value={cMap} onChange={(e) => setCMap(e.target.value)} placeholder="Paste a Google Maps link for directions" inputMode="url" />
              <div className="checkrow">
                {['Right now', 'Later today'].map((label, i) => (
                  <label key={label} className="check">
                    <input type="checkbox" checked={when === i} onChange={() => setWhen(i)} />
                    <span className="box"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
                    {label}
                  </label>
                ))}
              </div>
              <div className="tags">
                {(meta.tags || []).map((t) => (
                  <button key={t} className={`tag ${cTags.includes(t) ? 'on' : ''}`} onClick={() => setCTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}>{t}</button>
                ))}
              </div>
              <button className="btn-go" onClick={postForm}>Share the Plan
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          </section>

          {/* NOTIFICATIONS */}
          <section className={`screen s-notifs ${on('notifs') ? 'on' : ''}`}>
            <div className="scr">
              <div className="n-head">
                <button className="xbtn" onClick={() => go('home')} aria-label="Back">{I.back}</button>
                <h2>Notifications</h2>
              </div>
              <div className="pillrow page">
                {[['up', 'Upcoming'], ['past', 'Past']].map(([v, l]) => (
                  <button key={v} className={`pill ${nTab === v ? 'on' : ''}`} onClick={() => setNTab(v)}>{l}</button>
                ))}
              </div>
              {nTab === 'up' && activity.length > 0 && (
                <div className="activity">
                  <h4><i className="vdot" /> Live activity</h4>
                  {activity.slice(0, 5).map((a) => (
                    <div key={a.id} className="arow"><span>{a.text}</span><em>{ago(a.ts)}</em></div>
                  ))}
                </div>
              )}
              <div className="nlist">
                {(meta.notifs?.[nTab] || []).map((n, i) => (
                  <div key={i} className="nrow" onClick={() => { setSearchOpen(false); go('form', n.id); }}>
                    <img src={IMGP(n.seed, 300, 300)} alt="" />
                    <div><h4>{n.t}</h4><span className={`darkpill ${nTab === 'past' ? 'mute' : ''}`}>{n.s}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* NAV */}
        <div className={`nav-wrap ${tabbed ? '' : 'hide'}`}>
          <nav className="nav">
            <a className={screen.name === 'home' ? 'on' : ''} onClick={() => openTab('home')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></svg>Home</a>
            {/* Map tab — parked until the radar ships.
            <a className={screen.name === 'map' ? 'on' : ''} onClick={() => openTab('map')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.1 7-11a7 7 0 10-14 0c0 5.9 7 11 7 11z" /><circle className="hole" cx="12" cy="10" r="2.5" /></svg>Map</a>
            */}
            <a className={screen.name === 'saved' ? 'on' : ''} onClick={() => openTab('saved')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v17l-6-4-6 4z" /></svg>Saved</a>
            <a className={screen.name === 'chat' ? 'on' : ''} onClick={() => { if (!user) return openGate(() => {}, 'chat'); go('chat'); go('chat'); setChatsOpen(true); loadConversations(); setChatUnread(0); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v9a2.5 2.5 0 01-2.5 2.5H9l-5 4z" /><path d="M8 8.5h8M8 12h5" /></svg>Chats{chatUnread > 0 ? ` (${chatUnread})` : ''}
            </a>
            <a className={screen.name === 'profile' ? 'on' : ''} onClick={() => openTab('profile')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>Profile</a>
          </nav>
          <button className="fab" aria-label="Create" onClick={() => {
            if (!user) return openGate(() => go('create'));
            go('create');
          }}>{I.plus}</button>
        </div>

        {/* INSTALL BANNER */}
        {deferred && tabbed && screen.name === 'home' && (
          <div className="install-banner" onClick={installApp}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
            <span>Install Form Ni Gani?</span>
            <button className="install-dismiss" onClick={(e) => { e.stopPropagation(); setDeferred(null); }} aria-label="Dismiss">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* SEARCH */}
        {searchOpen && (
          <div className="search-ov on">
            <div className="so-head">
              <input className="input" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search Forms, spots, tags" autoComplete="off" autoFocus />
              <button className="iconbtn" aria-label="Close" onClick={() => setSearchOpen(false)}>{I.close}</button>
            </div>
            <div className="recent">
              {(meta.recents || []).map((r) => (
                <span key={r} className="pill" onClick={() => setSearchQ(r)}>{r}</span>
              ))}
            </div>
            <div className="so-res">
              {searchPeople ? (
                searchPeople.length ? searchPeople.map((h) => (
                  <div key={h.handle} className="res-row" onClick={() => { setSearchOpen(false); setProfSheet(h.handle); }}>
                    <img src={hostPhoto(h)} alt="" />
                    <div><b>{h.name}</b><span>{h.handle}</span></div>
                  </div>
                )) : <p className="empty">No people found, try another name.</p>
              ) : searchRes.length ? searchRes.map((f) => (
                <div key={f.id} className="res-row" onClick={() => { setSearchOpen(false); go('form', f.id); }}>
                  <img src={f.img} alt="" />
                  <div><b>{f.title}</b><span>{f.area} · {f.km} km · {f.live ? 'LIVE' : f.startsShort}</span></div>
                </div>
              )) : <p className="empty">No matches, try &quot;rooftop&quot; or &quot;karaoke&quot;.</p>}
            </div>
          </div>
        )}

        {/* CHATS */}
        {chatsOpen && user && (
          <Chats
            me={auth.profile || { id: profId }}
            conversations={conversations}
            thread={chatThreadWith ? threadMsgs : null}
            threadWith={chatThreadWith ? conversations.find((c) => c.id === chatThreadWith)?.other || { id: chatThreadWith } : null}
            onOpenThread={openThread}
            onCloseThread={() => { setChatThreadWith(null); setThreadMsgs([]); }}
            onSend={sendMessage}
            onClose={() => { setChatsOpen(false); setChatThreadWith(null); setChatUnread(0); go('home'); }}
            onProfile={(h) => { setChatsOpen(false); go('profile', h); }}
          />
        )}

        {/* GATE — mid-action sign-in prompt */}
        {gate && (
          <div className="modal on gate-modal" onClick={(e) => { if (e.target === e.currentTarget) guestSkip(); }}>
            <div className="gate-card">
              <div className="gate-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 118 0v4" /></svg>
              </div>
              <h3>You need an account for that</h3>
              <p className="psub">
                {gateReason
                  ? `Sign in to ${gateReason}, it takes a few seconds.`
                  : 'Sign in to join plans, hype, comment, and save your favourites.'}
              </p>
              <button className="btn-black" onClick={() => { setGate(false); go('auth', 'up'); }}>Sign up</button>
              <button className="btn-ghost" onClick={() => { setGate(false); go('auth', 'in'); }}>Sign in</button>
              <button className="guest-skip" onClick={guestSkip}>Maybe later</button>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {settings && (
          <div className="modal on" onClick={(e) => { if (e.target === e.currentTarget) setSettings(false); }}>
            <div className="panel">
              <div className="grab" />
              <h3>Settings</h3>
              <p className="psub">{user ? `${user.name} · ${user.handle}` : 'Guest'}</p>
              <div className="setrow" onClick={openEdit}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
                Edit profile<span className="spacer" />
              </div>
              <div className="setrow">
                Theme<span className="spacer" />
                <div className="themeseg">
                  <button className={`tseg ${theme === 'light' ? 'on' : ''}`} onClick={() => setTheme('light')}>Light</button>
                  <button className={`tseg ${theme === 'dark' ? 'on' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
                </div>
              </div>
              <div className="setrow" onClick={() => {
                setNotifOn((v) => !v);
                showToast(notifOn ? 'Notifications off' : 'Notifications on');
              }}>
                Notifications<span className="spacer" /><span className={`switch ${notifOn ? 'on' : ''}`} />
              </div>
              {SB && user && (
                <div className="setrow" onClick={() => { setSettings(false); setAcct(true); }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  Account & security<span className="spacer" />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
                </div>
              )}
              <div className="setrow" onClick={installApp}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
                <span>Install App</span><span className="spacer" />
                {deferred && <span className="pill-mini">New</span>}
              </div>
              <div className="setrow danger" onClick={() => {
                if (SB) auth.signOut();
                clearState();
                setSt({ user: null, saves: [], joins: [], hypes: [], ob: false });
                pending.current = null;
                setSettings(false);
                go('splash');
              }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
                Log out
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT & SECURITY */}
        {acct && user && (
          <div className="modal on" onClick={(e) => { if (e.target === e.currentTarget) setAcct(false); }}>
            <div className="panel">
              <div className="grab" />
              <h3>Account & security</h3>
              <p className="psub">{user.name} · {user.handle}</p>
              <label className="flabel" style={{ marginTop: 0 }}>Change password</label>
              <input className="input" type="password" value={pwCur} onChange={(e) => setPwCur(e.target.value)} placeholder="Current password" autoComplete="current-password" />
              <input className="input" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="New password (6+ characters)" autoComplete="new-password" style={{ marginTop: 10 }} />
              <button className="btn-black" style={{ width: '100%', marginTop: 12 }} onClick={async () => {
                try {
                  await auth.changePassword(pwNew);
                  setPwCur(''); setPwNew('');
                  showToast('Password changed');
                  setAcct(false);
                } catch (e) {
                  showToast(e.message || 'Could not change password');
                }
              }} disabled={pwNew.length < 6}>Update password</button>
              <label className="flabel" style={{ marginTop: 18 }}>Change email</label>
              <input className="input" value={emNew} onChange={(e) => setEmNew(e.target.value)} placeholder={auth.sbUser?.email || 'New email'} inputMode="email" />
              <button className="btn-black" style={{ width: '100%', marginTop: 12 }} onClick={async () => {
                if (!emNew.includes('@')) { showToast('Enter a valid email'); return; }
                try {
                  await auth.changeEmail(emNew.trim());
                  setEmNew('');
                  showToast('Check your inbox to confirm the new email');
                  setAcct(false);
                } catch (e) {
                  showToast(e.message || 'Could not change email');
                }
              }}>Update email</button>
              <p className="acct-note">Signed in as {auth.sbUser?.email}</p>
            </div>
          </div>
        )}

        {/* EDIT */}
        {edit && user && (
          <div className="modal on" onClick={(e) => { if (e.target === e.currentTarget) setEdit(false); }}>
            <div className="panel">
              <div className="grab" />
              <h3>Edit profile</h3>
              <p className="psub">Your photo, name, and handle is how people find you.</p>
              <div className="ava-edit">
                <img src={ePhoto || user.photo} alt="profile" />
                <div>
                  <button className="edit" onClick={() => fileRef.current?.click()}>Change photo</button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhotoFile} />
                  <span className="ava-hint">Auto-resized to save data. Updates everywhere instantly.</span>
                </div>
              </div>
              <div className="ava-presets">
                {[12, 32, 47, 5, 59, 44].map((n) => (
                  <img key={n} src={AVA(n)} alt="" className={ePhoto === AVA(n) ? 'on' : ''} onClick={() => setEPhoto(AVA(n))} />
                ))}
              </div>
              <label className="flabel">Bio</label>
              <textarea
                className="input"
                value={eBio}
                onChange={(e) => setEBio(e.target.value)}
                placeholder="Tell people what you're about..."
                maxLength={160}
                rows={2}
              />
              <label className="flabel">Your vibes</label>
              <div className="tags">
                {(meta.tags || []).map((t) => (
                  <button key={t} className={`tag ${eVibes.includes(t) ? 'on' : ''}`} onClick={() => setEVibes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}>{t}</button>
                ))}
              </div>
              <label className="flabel">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <label className="flabel">Handle</label>
              <input className="input" value={user.handle || ''} onChange={(e) => {
                const v = e.target.value.trim();
                setSt((s) => ({ ...s, user: { ...s.user, handle: v.startsWith('@') ? v : '@' + v } }));
              }} />
              <button className="btn-black" style={{ width: '100%', marginTop: 22 }} onClick={async () => {
                if (SB && auth.sbUser) {
                  try {
                    const h = st.user?.handle || user?.handle || '';
                    const existing = await db.profileByHandle(h);
                    if (existing && existing.id !== auth.sbUser.id) {
                      showToast('That handle is taken');
                      return;
                    }
                    await auth.saveProfile({ name: name.trim() || undefined, handle: h || undefined, avatar_url: ePhoto || user?.photo, vibes: eVibes, bio: eBio.trim() });
                    setEdit(false);
                    showToast('Profile saved');
                  } catch (e) {
                    showToast(e.message || 'Could not save, try again');
                  }
                  return;
                }
                setSt((s) => ({ ...s, user: { ...s.user, name: name.trim() || s.user.name, photo: ePhoto || s.user.photo } }));
                setEdit(false);
                showToast('Profile saved');
              }}>Save</button>
            </div>
          </div>
        )}

        {/* STORY VIEWER */}
        {storyIdx != null && (
          <StoryViewer
            items={storyItems}
            index={storyIdx}
            onClose={() => setStoryIdx(null)}
            onIndex={setStoryIdx}
            onSeen={(id) => setSeen((s) => (s.includes(id) ? s : [...s, id]))}
            isHyped={(id) => st.hypes.includes(id)}
            onHype={tryHype}
            onProfile={(h) => {
              setStoryIdx(null);
              go('profile', h);
            }}
          />
        )}

        {/* STATUS COMPOSER */}
        {composer && (
          <StatusComposer
            onClose={() => setComposer(false)}
            onPost={postStatus}
          />
        )}

        {/* COMMENT SHEET */}
        {sheetForm && (
          <CommentSheet
            key={sheetForm.id}
            form={sheetForm}
            comments={comments[sheetForm.id] || []}
            user={user}
            onClose={() => setSheet(null)}
            onPost={postComment}
            onUser={(h) => {
              setSheet(null);
              setProfSheet(h);
            }}
            onTag={(t) => {
              setSheet(null);
              setSearchQ('#' + t);
              setSearchOpen(true);
            }}
          />
        )}

        {/* PROFILE SHEET */}
        {profSheet && (
          <ProfileSheet
            handle={profSheet}
            forms={forms}
            onClose={() => setProfSheet(null)}
            onFullProfile={(h) => {
              setProfSheet(null);
              go('profile', h);
            }}
          />
        )}

        {toast && <div className="toast on">{toast.msg}</div>}
        {updateReady && (
          <div className="update-bar" onClick={() => {
            navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
            New version available — tap to update
          </div>
        )}
        {offline && <div className="offline-bar on">You&apos;re offline. Saved plans still work</div>}
    </div>
  );
}

function ProfileEvents({ tab, onTab, events, state, onOpen, onHost, st, user, cards, defaultTab }) {
  const hosted = useMemo(
    () => [...events.hosted].sort((a, b) => Number(b.live || false) - Number(a.live || false)),
    [events.hosted]
  );
  const list = tab === 'hosted' ? hosted : events.attended;
  return (
    <>
      <div className="stats">
        <div className="stat"><b>{events.hosted.length}</b><span>Hosted</span></div>
        <div className="stat"><b>{events.attended.length}</b><span>Attended</span></div>
        <div className="stat"><b>{fmt(events.hosted.reduce((a, f) => a + (f.hype || 0), 0))}</b><span>Hype</span></div>
      </div>
      <div className="ptabs">
        <button className={`ptab ${tab === 'attended' ? 'on' : ''}`} onClick={() => onTab('attended')}>Attended</button>
        <button className={`ptab ${tab === 'hosted' ? 'on' : ''}`} onClick={() => onTab('hosted')}>Hosted</button>
      </div>
      {state === 'loading' && (
        <div className="plist">
          <div className="skel slim" />
          <div className="skel slim" />
        </div>
      )}
      {state !== 'loading' && list.length === 0 && (
        <p className="empty">{tab === 'hosted' ? 'No plans hosted yet.' : 'No events attended yet. Join one from the feed.'}</p>
      )}
      {tab === 'hosted' && cards ? (
        <div className="cards pcards">
          {list.map((f) => (
            <Card key={f.id} f={f} saved={st.saves.includes(f.id)} hyped={st.hypes.includes(f.id)} me={st.joins.includes(f.id) && user ? user.photo : null} onOpen={onOpen} onSave={(id) => onHost?.('save', id)} onHype={(id, el) => onHost?.('hype', id, el)} onHost={(h) => onHost?.('profile', h)} onShare={(f) => onHost?.('share', f)} cc={0} onComments={(id) => onHost?.('comments', id)} onUser={(h) => onHost?.('profile', h)} />
          ))}
        </div>
      ) : (
        <div className="plist">
          {list.map((f) => {
            const isHosted = tab === 'hosted';
            const badge = f.live ? 'Live now' : f.startsShort || 'Starting soon';
            return (
              <div key={f.id} className="prow" onClick={() => onOpen(f.id)}>
                <div className="prow-main">
                  <b>{f.title}</b>
                  <span>{f.area} · {f.going} going</span>
                </div>
                <span className={`rolebadge ${f.live ? 'live' : ''}`}>{isHosted ? 'Hosted' : 'Went'} · {badge}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="brandmark">
      <path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z" />
      <path d="M12 22a7 7 0 01-7-7c0-1.5.5-2.5 1-3.5C9 8 10 5 10 2c3 2 8 6 8 12a8 8 0 01-6 8z" opacity=".45" />
    </svg>
  );
}

function GoogleButton({ onClick }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setBusy(false), 1600);
    return () => clearTimeout(t);
  }, [busy]);
  return (
    <button className="btn-google" onClick={() => { setBusy(true); onClick(); }}>
      <svg width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" /><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5l-3.8 2.9C3.4 21.3 7.4 24 12 24z" /><path fill="#FBBC05" d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4L1.5 6.7C.5 8.3 0 10.1 0 12s.5 3.7 1.5 5.3l3.8-2.9z" /><path fill="#EA4335" d="M12 4.6c2.2 0 3.7 1 4.6 1.8l3.4-3.3C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.5 6.7l3.8 2.9c.9-2.9 3.6-5 6.7-5z" /></svg>
      <span>{busy ? 'Connecting...' : 'Continue with Google'}</span>
    </button>
  );
}

function LiveDot({ status }) {
  return <span className={`live-dot ${status}`} title={status === 'live' ? 'Live updates on' : 'Connecting...'} />;
}

/* ---------- dom fx (ported) ---------- */
function burstConfetti(x, y, big = false) {
  const colors = ['#A21CAF', '#D637C0', '#F07BE8', '#FFC83D', '#22C55E', '#38BDF8'];
  const n = big ? 34 : 18;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = x + (Math.random() * 40 - 20) + 'px';
    c.style.top = y + (Math.random() * 10 - 5) + 'px';
    c.style.background = colors[i % colors.length];
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
