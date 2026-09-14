'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { AVA, fmt } from '@/lib/client-store';

const DURATION = 5000;

export function StoriesRail({ forms, seen, onOpen }) {
  const ordered = [...forms].sort((a, b) => Number(b.live ?? false) - Number(a.live ?? false));
  if (!ordered.length) return null;
  return (
    <div className="stories">
      {ordered.map((f, i) => (
        <button key={f.id} className="story" onClick={() => onOpen(i)}>
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
    </div>
  );
}

export function StoryViewer({ stories, index, onClose, onIndex, onSeen, isHyped, onHype }) {
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [burst, setBurst] = useState(0);
  const raf = useRef(0);
  const start = useRef(Date.now());
  const story = stories[index];
  const held = useRef(false);

  useEffect(() => {
    onSeen?.(story.id);
    setProgress(0);
    start.current = Date.now();
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (paused) {
      start.current = Date.now() - progress * DURATION;
      return;
    }
    const step = () => {
      const p = (Date.now() - start.current) / DURATION;
      if (p >= 1) {
        if (index < stories.length - 1) onIndex(index + 1);
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
      if (e.key === 'ArrowRight' && index < stories.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, stories.length, onClose, onIndex]);

  if (!story) return null;
  const hyped = isHyped(story.id);

  const zone = (e) => {
    if (held.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x < 0.3 && index > 0) onIndex(index - 1);
    else if (x > 0.7 && index < stories.length - 1) onIndex(index + 1);
    else if (x > 0.7) onClose();
  };

  const hype = (e) => {
    e.stopPropagation();
    onHype(story.id, e.currentTarget);
    setBurst((b) => b + 1);
  };

  return (
    <div className="story-ov" onClick={zone}>
      <div className="story-bg">
        <Image src={story.img} alt="" fill sizes="400px" style={{ objectFit: 'cover' }} priority />
      </div>
      <div className="story-veil" />
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
          {stories.map((s, i) => (
            <span key={s.id} className="seg">
              <i style={{ transform: `scaleX(${i < index ? 1 : i > index ? 0 : progress})` }} />
            </span>
          ))}
        </div>
        <div className="story-head">
          <img src={AVA(story.avs?.[0] ?? 12)} alt="" />
          <div>
            <b>{story.title}</b>
            <span>
              {story.area} · {story.live ? `${fmt(story.viewers)} watching` : story.startsShort}
            </span>
          </div>
          <button className="iconbtn light" onClick={onClose} aria-label="Close">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
      <div className="story-foot">
        <button className={`hype-btn big ${hyped ? 'on' : ''}`} onClick={hype}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z" /><path d="M12 22a7 7 0 01-7-7c0-1.5.5-2.5 1-3.5C9 8 10 5 10 2c3 2 8 6 8 12a8 8 0 01-6 8z" opacity=".45" /></svg>
          {fmt(story.hype)} hype
        </button>
      </div>
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
