'use client';

import { useEffect, useRef, useState } from 'react';

// Subscribes to the SSE live stream (/api/activity) and forwards events.
// EventSource auto-reconnects; we surface connection status for the UI.
export function useLiveFeed({ onTick, onEvent, enabled = true }) {
  const [status, setStatus] = useState('connecting');
  const handlers = useRef({ onTick, onEvent });
  handlers.current = { onTick, onEvent };

  useEffect(() => {
    if (!enabled) {
      setStatus('standby');
      return;
    }
    let es;
    try {
      es = new EventSource('/api/activity');
    } catch {
      setStatus('offline');
      return;
    }
    es.onopen = () => setStatus('live');
    es.onerror = () => setStatus('reconnecting');
    es.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === 'tick') handlers.current.onTick?.(msg.forms);
      else if (msg.type && msg.type !== 'hello') handlers.current.onEvent?.(msg);
    };
    return () => es.close();
  }, []);

  return status;
}
