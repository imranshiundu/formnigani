'use client';

import { useEffect, useRef, useState } from 'react';
import { AVA } from '@/lib/client-store';
import { Sticker, STICKERS, StickerPicker } from './Stickers';

function ago(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function EmptyState({ onHome }) {
  return (
    <div className="chat-empty">
      <div className="chat-empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      </div>
      <h3>No conversations yet</h3>
      <p>Find a plan, tap someone&apos;s profile, and start a conversation.</p>
      <button className="btn-black" onClick={onHome}>Find a plan</button>
    </div>
  );
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

  // Thread view
  if (thread) {
    return (
      <div className="screen s-chat on">
        <div className="scr chat-scr">
          <div className="chat-head">
            <button className="iconbtn" onClick={onCloseThread} aria-label="Back">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <div className="chat-avatar-wrap" onClick={() => onProfile?.(other.handle)}>
              <img className="chat-avatar" src={other.photo || AVA(other.ava ?? 12)} alt="" />
              <span className="chat-online-dot" />
            </div>
            <div className="chat-user-info">
              <b>{other.name || 'Someone'}</b>
              <span>{other.handle}</span>
            </div>
            <button className="iconbtn" onClick={onClose} aria-label="Close chats">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="chat-list">
            {thread.length === 0 && (
              <div className="chat-thread-empty">
                <span className="chat-wave">{"\u{1F44B}"}</span>
                <p>Say hi! Follow-ups live here.<br/>Groups live on WhatsApp.</p>
              </div>
            )}
            {thread.map((m, i) => {
              const mine = m.sender === me.id;
              const showAvatar = !mine && (i === 0 || thread[i - 1]?.sender !== m.sender);
              return (
                <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
                  {!mine && showAvatar && <img className="msg-ava" src={other.photo || AVA(other.ava ?? 12)} alt="" />}
                  {!mine && !showAvatar && <div className="msg-ava-spacer" />}
                  <div className="msg-bubble">
                    {m.sticker ? (
                      <span className="msg-stk"><Sticker id={m.sticker} size={64} /></span>
                    ) : (
                      <span className="msg-body">{m.body}</span>
                    )}
                    <em className="msg-time">{ago(new Date(m.created_at).getTime())}</em>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="chat-input">
            <button className="tool" onClick={() => setPickerOpen(true)} aria-label="Stickers">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14c1.5 2 5.5 2 7 0" /><circle cx="9" cy="9.5" r="0.5" /><circle cx="15" cy="9.5" r="0.5" /></svg>
            </button>
            <input className="chat-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." maxLength={400} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className={`csend ${text.trim() ? 'active' : ''}`} onClick={send} aria-label="Send" disabled={!text.trim()}>
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

  // Conversation list
  return (
    <div className="screen s-chat on">
      <div className="scr chat-scr">
        <div className="chat-head">
          <button className="iconbtn" onClick={() => { onClose(); }} aria-label="Back to home">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <div className="chat-title">Messages</div>
          <div style={{ width: 40 }} />
        </div>
        {conversations.length === 0 ? (
          <EmptyState onHome={onClose} />
        ) : (
          <div className="conv-list">
            {conversations.map((c) => {
              const o = otherOf(c);
              const mine = c.last?.sender === me.id;
              const lastText = c.last?.sticker ? 'Sent a sticker' : c.last?.body || '';
              return (
                <div key={c.id} className="conv-row" onClick={() => onOpenThread(c.id)}>
                  <div className="conv-avatar-wrap">
                    <img className="conv-avatar" src={o.photo || AVA(o.ava ?? 12)} alt="" />
                  </div>
                  <div className="conv-body">
                    <div className="conv-top">
                      <b>{o.name || 'Someone'}</b>
                      <span className="conv-time">{c.last ? ago(new Date(c.last.created_at).getTime()) : ''}</span>
                    </div>
                    <p className="conv-preview">
                      {mine && <span className="conv-you">You: </span>}
                      {lastText.length > 55 ? lastText.slice(0, 55) + '...' : lastText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
