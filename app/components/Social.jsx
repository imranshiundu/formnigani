'use client';

import { useMemo } from 'react';
import { AVA, fmt, hostPhoto } from '@/lib/client-store';

// Renders @mentions and #tags as tappable brand-purple tokens.
export function RichText({ text, onUser, onTag }) {
  const parts = useMemo(() => String(text || '').split(/(@[\w]+|#[\w]+)/g), [text]);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('@') && p.length > 1)
          return (
            <button key={i} className="tok" onClick={(e) => { e.stopPropagation(); onUser?.(p); }}>
              {p}
            </button>
          );
        if (p.startsWith('#') && p.length > 1)
          return (
            <button key={i} className="tok" onClick={(e) => { e.stopPropagation(); onTag?.(p.slice(1)); }}>
              {p}
            </button>
          );
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function time(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Compact profile modal — keeps feed context, never navigates away.
export function ProfileSheet({ handle, forms, onClose, onFullProfile, onUser, onTag }) {
  const norm = String(handle || '').toLowerCase();
  const host = forms.map((f) => f.host).find((h) => h && h.handle.toLowerCase() === norm) || null;
  const hosted = forms.filter((f) => f.host && f.host.handle.toLowerCase() === norm);
  const hype = hosted.reduce((a, f) => a + (f.hype || 0), 0);
  const going = hosted.reduce((a, f) => a + (f.going || 0), 0);
  const upcoming = hosted.filter((f) => f.live || f.tonight).slice(0, 3);

  return (
    <div className="modal on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="panel sheet-panel">
        <div className="grab" />
        {!host && hosted.length === 0 ? (
          <div className="guest-prompt" style={{ padding: '20px 8px' }}>
            <h3>No one here yet</h3>
            <p>{handle} hasn&apos;t posted a plan.</p>
          </div>
        ) : (
          <>
            <div className="psheet-top">
              <img src={host ? hostPhoto(host) : AVA(12)} alt="" />
              <div>
                <b>{host?.name || handle}</b>
                <span>{host?.handle || handle}</span>
              </div>
              <button className="edit" onClick={() => onFullProfile?.(host?.handle || handle)}>Full profile</button>
            </div>
            <div className="stats mini-stats">
              <div className="stat"><b>{fmt(hype)}</b><span>Hypes</span></div>
              <div className="stat"><b>{hosted.length}</b><span>Hosted</span></div>
              <div className="stat"><b>{going}</b><span>Going</span></div>
            </div>
            {upcoming.length > 0 && (
              <div className="psheet-forms">
                {upcoming.map((f) => (
                  <div key={f.id} className="psheet-row">
                    <img src={f.img} alt="" />
                    <div>
                      <b>{f.title}</b>
                      <span>{f.live ? `LIVE · ${fmt(f.viewers)} watching` : f.startsShort}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { time as commentTime };
