'use client';

import { useRef, useState } from 'react';
import { TRACKS } from '@/lib/tracks';
import { db } from '@/lib/db';
import { StickerPicker, STICKERS } from './Stickers';

const BGS = ['#A21CAF', '#571263', '#101014', '#1D4ED8', '#047857', '#B45309'];

export default function StatusComposer({ onClose, onPost, onUpload }) {
  const [text, setText] = useState('');
  const [bg, setBg] = useState(BGS[0]);
  const [track, setTrack] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [img, setImg] = useState(null);
  const [sticker, setSticker] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const audio = useRef(null);
  const fileRef = useRef(null);

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setImg(file);
  };

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
    if (!text.trim() && !track && !img && !sticker) return;
    if (audio.current) audio.current.pause();
    setBusy(true);
    try {
      let imgUrl = null;
      if (img) {
        imgUrl = await db.uploadImage(img, { max: 720, quality: 0.76 });
      }
      await onPost({ body: text.trim(), trackName: track?.name || null, trackUrl: track?.url || null, bg, img: imgUrl, sticker });
      onClose();
    } catch (e) {
      alert(e.message || 'Could not post, try again');
    } finally {
      setBusy(false);
    }
  };

  const hasContent = text.trim() || track || img || sticker;

  return (
    <div className="modal on sheet-modal" onClick={(e) => { if (e.target === e.currentTarget) { if (audio.current) audio.current.pause(); onClose(); } }}>
      <div className="panel sheet-panel composer-panel">
        <div className="grab" />
        <h3>New status</h3>
        <p className="psub">Visible for 12 hours.</p>
        {sticker && (
          <div className="status-sticker-preview">
            <Sticker id={sticker} size={72} />
            <span>{STICKERS.find((s) => s.id === sticker)?.name}</span>
          </div>
        )}
        {img ? (
          <div className="status-img-preview" style={{ backgroundImage: `url(${URL.createObjectURL(img)})` }}>
            <button className="xbtn" onClick={() => setImg(null)} aria-label="Remove photo">✕</button>
          </div>
        ) : (
          <div className="status-preview" style={{ background: bg }}>
            <p>{text.trim() || 'Your status...'}</p>
            {track && (
              <span className="status-track">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg>
                {track.name}
              </span>
            )}
          </div>
        )}
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
        <div className="composer-tools">
          <button className="tool" onClick={() => fileRef.current?.click()} aria-label="Add photo">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5A2.5 2.5 0 015.5 6h1.6L8.6 4h6.8l1.5 2h1.6A2.5 2.5 0 0121 8.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5z" /><circle cx="12" cy="13" r="3.4" /></svg>
            Photo
          </button>
          <button className="tool" onClick={() => setPickerOpen(true)} aria-label="Add sticker">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14c1.5 2 5.5 2 7 0" /><circle cx="9" cy="9.5" r="0.5" /><circle cx="15" cy="9.5" r="0.5" /></svg>
            Sticker
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
        </div>
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
        <button className="btn-black" style={{ width: '100%', marginTop: 16 }} disabled={busy || !hasContent} onClick={post}>
          {busy ? 'Posting...' : 'Share status'}
        </button>
      </div>
      {pickerOpen && <StickerPicker onPick={(id) => setSticker(sticker === id ? null : id)} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

