'use client';

import { useEffect, useRef, useState } from 'react';
import { AVA } from '@/lib/client-store';
import { Sticker, STICKERS, StickerPicker } from './Stickers';

function ago(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

// Chats: the follow-up chatbox. WhatsApp stays for groups.
export default function Chats({ me, conversations, thread, threadWith, onOpenThread, onCloseThread, onSend, onClose, onProfile }) {
  const [text, setText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const endRef = useRef(null);
  const other = threadWith;

  useEffect(() => {
    if (thread) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !other) return;
    setText('');
    await onSend({ recipient: other.id, body });
  };

  const otherOf = (c) => c.other || {};

  if (thread) {
    return (
      <div className="screen s-chat on">
        <div className="scr chat-scr">
          <div className="chat-head">
            <button className="iconbtn" onClick={onCloseThread} aria-label="Back">{Iback}</button>
            <img src={other.photo || AVA(other.ava ?? 12)} alt="" onClick={() => onProfile?.(other.handle)} />
            <div>
              <b>{other.name || 'Someone'}</b>
              <span>{other.handle}</span>
            </div>
            <button className="iconbtn" onClick={onClose} aria-label="Close chats">{Iclose}</button>
          </div>
          <div className="chat-list">
            {thread.length === 0 && <p className="empty">Say hi. Follow-ups live here, groups live on WhatsApp.</p>}
            {thread.map((m) => {
              const mine = m.sender === me.id;
              return (
                <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
                  {m.sticker ? (
                    <span className="msg-stk"><Sticker id={m.sticker} size={64} /></span>
                  ) : (
                    <span className="msg-body">{m.body}</span>
                  )}
                  <em>{ago(new Date(m.created_at).getTime())}</em>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="chat-input">
            <button className="tool" onClick={() => setPickerOpen(true)} aria-label="Stickers">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14c1.5 2 5.5 2 7 0" /><circle cx="9" cy="9.5" r="0.5" /><circle cx="15" cy="9.5" r="0.5" /></svg>
            </button>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message..." maxLength={400} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <button className="csend" onClick={send} aria-label="Send" disabled={!text.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
        {pickerOpen && (
          <StickerPicker
            onPick={(id) => { onSend({ recipient: other.id, sticker: id }); setPickerOpen(false); }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="screen s-chat on">
      <div className="scr chat-scr">
        <div className="chat-head">
          <span />
          <div className="chat-title">Chats</div>
          <button className="iconbtn" onClick={onClose} aria-label="Close chats">{Iclose}</button>
        </div>
        <div className="chat-list">
          {conversations.length === 0 && <p className="empty">No chats yet. Open someone's profile and hit Message.</p>}
          {conversations.map((c) => {
            const o = otherOf(c);
            const mine = c.last?.sender === me.id;
            return (
              <div key={c.id} className="conv-row" onClick={() => onOpenThread(c.id)}>
                <img src={o.photo || AVA(o.ava ?? 12)} alt="" />
                <div>
                  <b>{o.name || 'Someone'}</b>
                  <span>{mine ? 'You: ' : ''}{c.last?.sticker ? 'sent a sticker' : c.last?.body || ''}</span>
                </div>
                <em>{c.last ? ago(new Date(c.last.created_at).getTime()) : ''}</em>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const Iback = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
);
const Iclose = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
