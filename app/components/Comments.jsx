'use client';

import { useEffect, useRef, useState } from 'react';
import { AVA } from '@/lib/client-store';
import { RichText, commentTime } from './Social';

function avatarOf(u) {
  if (!u) return AVA(12);
  if (u.photo) return u.photo;
  return AVA(u.ava ?? 12);
}

export default function CommentSheet({ form, comments, user, onClose, onPost, onUser, onTag, hypeOf, onHypeComment }) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const isHost = (handle) => form.host && handle && form.host.handle.toLowerCase() === handle.toLowerCase();

  const top = comments.filter((c) => !c.parentId);
  const replies = (id) => comments.filter((c) => c.parentId === id);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 250);
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    await onPost(body, replyTo?.id || null);
    setBusy(false);
    setText('');
    setReplyTo(null);
  };

  const row = (c, nested = false) => (
    <div key={c.id} className={`crow ${nested ? 'nested' : ''}`}>
      <img src={avatarOf(c.user)} alt="" />
      <div className="cbody">
        <div className="chead">
          <b>{c.user?.name || 'Someone'}</b>
          {isHost(c.user?.handle) && <span className="hostpill">Host</span>}
          <em>{commentTime(c.ts)}</em>
        </div>
        <p>
          <RichText text={c.body} onUser={onUser} onTag={onTag} />
        </p>
        <div className="cacts">
          <button
            className={`chipyp ${hypeOf?.(c.id) ? 'on' : ''}`}
            onClick={() => onHypeComment?.(c.id)}
            aria-label="Hype comment"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2.5 2C14 7 13 4.5 12 2z" /><path d="M12 22a7 7 0 01-7-7c0-1.5.5-2.5 1-3.5C9 8 10 5 10 2c3 2 8 6 8 12a8 8 0 01-6 8z" opacity=".45" /></svg>
            {hypeOf?.(c.id) || ''}
          </button>
          {!nested && (
            <button className="creply" onClick={() => { setReplyTo(c); inputRef.current?.focus(); }}>
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal on sheet-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="panel sheet-panel comments-panel">
        <div className="grab" />
        <h3>Comments ({comments.length})</h3>
        <p className="psub">{form.title}</p>
        <div className="clist">
          {top.length === 0 && <p className="empty">No comments yet — start the conversation.</p>}
          {top.map((c) => (
            <div key={c.id}>
              {row(c)}
              {replies(c.id).map((r) => row(r, true))}
            </div>
          ))}
        </div>
        {replyTo && (
          <div className="replybar">
            <span>Replying to {replyTo.user?.handle || 'comment'}</span>
            <button onClick={() => setReplyTo(null)} aria-label="Cancel reply">✕</button>
          </div>
        )}
        <div className="cinput">
          <img src={user ? user.photo : AVA(12)} alt="" />
          <input
            ref={inputRef}
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={user ? 'Add a comment...' : 'Log in to comment...'}
            maxLength={280}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          />
          <button className="csend" onClick={send} aria-label="Send" disabled={!text.trim() || busy}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
