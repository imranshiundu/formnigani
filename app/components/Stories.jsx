'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { AVA, fmt } from '@/lib/client-store';
import { db } from '@/lib/db';

const FORM_DURATION = 5000;
const TEXT_DURATION = 4000;
const MUSIC_DURATION = 15000;

function durFor(item) {
  if (item.kind === 'music') return MUSIC_DURATION;
  if (item.kind === 'status') return TEXT_DURATION;
  return FORM_DURATION;
}

/* ---------- rail: add-status, user statuses, then form stories ---------- */
export function StoriesRail({ statuses, forms, seen, onOpen, onAdd, meHandle }) {
  const ordered = [...forms].sort((a, b) => Number(b.live ?? false) - Number(a.live ?? false));
  const own = meHandle ? statuses.filter((s) => s.profile?.handle?.toLowerCase() === meHandle.toLowerCase()) : [];
  const others = meHandle
    ? statuses.filter((s) => s.profile?.handle?.toLowerCase() !== meHandle.toLowerCase())
    : statuses;
  const hasAny = own.length > 0 || others.length > 0 || ordered.length > 0;

  return (
    <div className="stories">
      <button className="story add" onClick={onAdd} aria-label="Add status">
        <span className="ring add-ring">
          {own.length > 0 ? (
            <img src={AVA(own[0].profile?.ava ?? 12)} alt="" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          )}
          <i className="plus-badge">+</i>
        </span>
        <span className="s-title">{own.length > 0 ? 'Your status' : 'Add status'}</span>
      </button>
      {others.map((s) => (
        <button key={s.id} className="story" onClick={() => onOpen('status', s.id)}>
          <span className={`ring ${seen.has(s.id) ? 'seen' : ''}`}>
            <img src={AVA(s.profile?.ava ?? 12)} alt="" />
          </span>
          {s.kind === 'music' && (
            <span className="s-live music">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg>
            </span>
          )}
          <span className="s-title">{s.profile?.handle || 'Someone'}</span>
        </button>
      ))}
      {ordered.map((f) => (
        <button key={f.id} className="story" onClick={() => onOpen('form', f.id)}>
          <span className={`ring ${f.live ? 'live' : ''} ${seen.has(f.id) ? 'seen' : ''}`}>
            <Image src={f.img} alt="" width={64} height={64} />
          </span>
          {f.live && (
            <span className="s-live">
              <i />LIVE
            </span>
          )}
          <span className="s-title">{f.area}</span>
        </button>
      ))}
      {!hasAny && null}
    </div>
  );
}

/* ---------- viewer: handles form stories and text/music statuses ---------- */
export function StoryViewer({ items, index, onClose, onIndex, onSeen, isHyped, onHype, onProfile, onMute }) {
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [burst, setBurst] = useState(0);
  const raf = useRef(0);
  const start = useRef(Date.now());
  const item = items[index];
  const [muted, setMuted] = useState(() => item?.profile?.handle ? db.isMuted(item.profile.handle) : false);
  const held = useRef(false);
  const audioRef = useRef(null);
  const duration = item ? durFor(item) : FORM_DURATION;

  useEffect(() => {
    onSeen?.(item?.id);
    setProgress(0);
    start.current = Date.now();
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Music playback for music statuses.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (item?.kind === 'music' && item.trackUrl && !paused) {
      const a = new Audio(item.trackUrl);
      a.volume = 0.75;
      audioRef.current = a;
      a.play().catch(() => {});
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [item?.id, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (paused) {
      start.current = Date.now() - progress * duration;
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    if (item?.kind === 'music' && audioRef.current) audioRef.current.play().catch(() => {});
    const step = () => {
      const p = (Date.now() - start.current) / duration;
      if (p >= 1) {
        if (index < items.length - 1) onIndex(index + 1);
        else onClose();
        return;
      }
      setProgress(p);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [paused, index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;

  const isStatus = item.kind === 'status' || item.kind === 'music';
  const head = isStatus
    ? { name: item.profile?.name || 'Someone', handle: item.profile?.handle || '', sub: item.kind === 'music' ? item.trackName : 'Status', ava: AVA(item.profile?.ava ?? 12) }
    : { name: item.title, sub: item.live ? `${fmt(item.viewers)} watching` : item.startsShort, ava: AVA(item.avs?.[0] ?? 12) };

  const zone = (e) => {
    if (held.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x < 0.3 && index > 0) onIndex(index - 1);
    else if (x > 0.7 && index < items.length - 1) onIndex(index + 1);
    else if (x > 0.7) onClose();
  };

  const hype = (e) => {
    e.stopPropagation();
    onHype(item.id, e.currentTarget);
    setBurst((b) => b + 1);
  };

  return (
    <div className="story-ov" onClick={zone}>
      {isStatus ? (
        <div className="story-status" style={{ background: item.bg }}>
          <p>{item.body}</p>
          {item.kind === 'music' && (
            <span className="status-track">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg>
              {item.trackName}
            </span>
          )}
        </div>
      ) : (
        <>
          <div className="story-bg">
            <Image src={item.img} alt="" fill sizes="400px" style={{ objectFit: 'cover' }} priority />
          </div>
          <div className="story-veil" />
        </>
      )}
      <div
        className="story-hold"
        onPointerDown={() => {
          held.current = true;
          setPaused(true);
        }}
        onPointerUp={() => {
          held.current = false;
          setPaused(false);
        }}
        onPointerLeave={() => {
          held.current = false;
          setPaused(false);
        }}
      />
      <div className="story-top">
        <div className="segs">
          {items.map((s, i) => (
            <span key={s.id} className="seg">
              <i style={{ transform: `scaleX(${i < index ? 1 : i > index ? 0 : progress})` }} />
            </span>
          ))}
        </div>
        <div className="story-head">
          <img src={head.ava} alt="" />
          <div>
            <b>{head.name}</b>
            <span>{head.sub}</span>
          </div>
          {isStatus && item.profile?.handle ? (
            <button className="iconbtn light" onClick={(e) => { e.stopPropagation(); onProfile?.(item.profile.handle); }} aria-label="View profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
            </button>
          ) : null}
          {isStatus && item.profile?.handle ? (
            <button className="iconbtn light" onClick={(e) => {
              e.stopPropagation();
              if (muted) { db.unmuteUser(item.profile.handle); setMuted(false); onMute?.(item.profile.handle, false); }
              else { db.muteUser(item.profile.handle); setMuted(true); onMute?.(item.profile.handle, true); onClose(); }
            }} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M23 9l-6 6M17 9l6 6" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
              )}
            </button>
          ) : null}
          <button className="iconbtn light" onClick={onClose} aria-label="Close">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
      {!isStatus && (
        <div className="story-foot">
          <button className={`hype-btn big ${isHyped(item.id) ? 'on' : ''}`} onClick={hype}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z" /><path d="M12 22a7 7 0 01-7-7c0-1.5.5-2.5 1-3.5C9 8 10 5 10 2c3 2 8 6 8 12a8 8 0 01-6 8z" opacity=".45" /></svg>
            {fmt(item.hype)} hype
          </button>
        </div>
      )}
      {burst > 0 && <FlameBurst key={burst} />}
    </div>
  );
}

export function FlameBurst({ x, y }) {
  // Big centered flame pop (double-tap / story hype feedback).
  return (
    <span className="flame-burst" style={x != null ? { left: x, top: y } : undefined}>
      <svg width="72" height="72" viewBox="0 0 24 24" fill="#fff" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z" /><path d="M12 22a7 7 0 01-7-7c0-1.5.5-2.5 1-3.5C9 8 10 5 10 2c3 2 8 6 8 12a8 8 0 01-6 8z" opacity=".55" /></svg>
    </span>
  );
}
