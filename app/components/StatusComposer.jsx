'use client';

import { useEffect, useRef, useState } from 'react';
import { TRACKS } from '@/lib/tracks';

const BGS = ['#A21CAF', '#571263', '#101014', '#1D4ED8', '#047857', '#B45309'];

export default function StatusComposer({ onClose, onPost, audioRef }) {
  const [text, setText] = useState('');
  const [bg, setBg] = useState(BGS[0]);
  const [track, setTrack] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [busy, setBusy] = useState(false);
  const audio = useRef(null);

  useEffect(() => () => {
    if (audio.current) audio.current.pause();
  }, []);

  const preview = (t) => {
    if (audio.current) {
      audio.current.pause();
      audio.current = null;
    }
    if (playing === t.name && track?.name === t.name) {
      setPlaying(null);
      return;
    }
    setTrack(t);
    const a = new Audio(t.url);
    a.volume = 0.6;
    audio.current = a;
    a.play().then(() => setPlaying(t.name)).catch(() => setPlaying(null));
  };

  const post = async () => {
    if (busy) return;
    if (!text.trim() && !track) {
      return;
    }
    if (audio.current) audio.current.pause();
    setBusy(true);
    try {
      await onPost({ body: text.trim(), trackName: track?.name || null, trackUrl: track?.url || null, bg });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal on sheet-modal" onClick={(e) => { if (e.target === e.currentTarget) { if (audio.current) audio.current.pause(); onClose(); } }}>
      <div className="panel sheet-panel composer-panel">
        <div className="grab" />
        <h3>New status</h3>
        <p className="psub">Visible for 24 hours.</p>
        <div className="status-preview" style={{ background: bg }}>
          <p>{text.trim() || 'Your status...'}</p>
          {track && (
            <span className="status-track">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg>
              {track.name}
            </span>
          )}
        </div>
        <div className="bgdots">
          {BGS.map((c) => (
            <button key={c} className={`bgdot ${bg === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setBg(c)} aria-label={`Background ${c}`} />
          ))}
        </div>
        <textarea
          className="input status-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
          maxLength={180}
          rows={2}
        />
        <label className="flabel">Add music</label>
        <div className="tracklist">
          {TRACKS.map((t) => (
            <button key={t.name} className={`trackrow ${track?.name === t.name ? 'on' : ''}`} onClick={() => preview(t)}>
              <span className="tplay">
                {playing === t.name && track?.name === t.name ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </span>
              {t.name}
            </button>
          ))}
        </div>
        <button className="btn-black" style={{ width: '100%', marginTop: 16 }} disabled={busy || (!text.trim() && !track)} onClick={post}>
          {busy ? 'Posting...' : 'Share status'}
        </button>
      </div>
    </div>
  );
}
