'use client';

import { useEffect, useState } from 'react';

// Our own animated sticker pack, colored brand purple. Inline SVG + CSS
// animations: zero bundle cost, on-brand, and they scale anywhere.
export const STICKERS = [
  { id: 'flame', name: 'Hype' },
  { id: 'party', name: 'Turn up' },
  { id: 'wave', name: 'Pull up' },
  { id: 'laugh', name: 'Funny' },
  { id: 'heart', name: 'Love it' },
  { id: 'vibe', name: 'Vibe' },
];

export function Sticker({ id, size = 56 }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', fill: 'none' };
  switch (id) {
    case 'flame':
      return (
        <svg {...common} className="stk stk-flame">
          <path d="M24 4c2.5 10-7.5 12.5-7.5 22.5a11.5 11.5 0 0023 0c0-4.5-2.3-8-4.6-10.3-1.2 3.4-3.4 4.6-5.7 4.6C26.9 18 24.9 12.3 24 4z" fill="url(#fngStkG)" stroke="#7C1087" strokeWidth="1.6" strokeLinejoin="round" />
          <defs><linearGradient id="fngStkG" x1="24" y1="4" x2="24" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="#F07BE8" /><stop offset="1" stopColor="#A21CAF" /></linearGradient></defs>
        </svg>
      );
    case 'party':
      return (
        <svg {...common} className="stk stk-party">
          <path d="M10 38l7-18 18-7-7 18-18 7z" fill="url(#fngStkP)" stroke="#7C1087" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="14" cy="12" r="2" fill="#F07BE8" className="stk-dot d1" />
          <circle cx="38" cy="16" r="2" fill="#A21CAF" className="stk-dot d2" />
          <circle cx="34" cy="40" r="2" fill="#F07BE8" className="stk-dot d3" />
          <defs><linearGradient id="fngStkP" x1="24" y1="13" x2="24" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="#F07BE8" /><stop offset="1" stopColor="#A21CAF" /></linearGradient></defs>
        </svg>
      );
    case 'wave':
      return (
        <svg {...common} className="stk stk-wave">
          <path d="M14 26c0-7 4.5-12 10-12s10 5 10 12-4.5 12-10 12-10-5-10-12z" fill="url(#fngStkW)" stroke="#7C1087" strokeWidth="1.6" />
          <path d="M8 20c2-3 5-3 7 0M33 20c2-3 5-3 7 0" stroke="#7C1087" strokeWidth="2" strokeLinecap="round" className="stk-arm" />
          <circle cx="20" cy="24" r="1.8" fill="#fff" /><circle cx="28" cy="24" r="1.8" fill="#fff" />
          <path d="M19 30c2 2 8 2 10 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <defs><linearGradient id="fngStkW" x1="24" y1="14" x2="24" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="#F07BE8" /><stop offset="1" stopColor="#A21CAF" /></linearGradient></defs>
        </svg>
      );
    case 'laugh':
      return (
        <svg {...common} className="stk stk-laugh">
          <circle cx="24" cy="24" r="14" fill="url(#fngStkL)" stroke="#7C1087" strokeWidth="1.6" />
          <path d="M17 20l4 2M31 20l-4 2" stroke="#7C1087" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M16 28c2 4 14 4 16 0-2 1.5-14 1.5-16 0z" fill="#7C1087" />
          <defs><linearGradient id="fngStkL" x1="24" y1="10" x2="24" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="#F07BE8" /><stop offset="1" stopColor="#A21CAF" /></linearGradient></defs>
        </svg>
      );
    case 'heart':
      return (
        <svg {...common} className="stk stk-heart">
          <path d="M24 40S8 30 8 19a8.5 8.5 0 0116-4 8.5 8.5 0 0116 4c0 11-16 21-16 21z" fill="url(#fngStkH)" stroke="#7C1087" strokeWidth="1.6" strokeLinejoin="round" />
          <defs><linearGradient id="fngStkH" x1="24" y1="11" x2="24" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#F07BE8" /><stop offset="1" stopColor="#A21CAF" /></linearGradient></defs>
        </svg>
      );
    case 'vibe':
      return (
        <svg {...common} className="stk stk-vibe">
          <path d="M24 6l4.2 10.4L38 21l-9.8 4.6L24 36l-4.2-10.4L10 21l9.8-4.6L24 6z" fill="url(#fngStkV)" stroke="#7C1087" strokeWidth="1.6" strokeLinejoin="round" className="stk-spin" />
          <circle cx="24" cy="21" r="3.4" fill="#fff" />
          <defs><linearGradient id="fngStkV" x1="24" y1="6" x2="24" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#F07BE8" /><stop offset="1" stopColor="#A21CAF" /></linearGradient></defs>
        </svg>
      );
    default:
      return null;
  }
}

export function StickerPicker({ onPick, onClose }) {
  return (
    <div className="sticker-ov" onClick={onClose}>
      <div className="sticker-card" onClick={(e) => e.stopPropagation()}>
        {STICKERS.map((s) => (
          <button key={s.id} className="stk-btn" onClick={() => { onPick(s.id); onClose(); }} aria-label={s.name}>
            <Sticker id={s.id} size={52} />
            <span>{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
