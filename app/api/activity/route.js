import { getForms, randomSimEvent, subscribe } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const enc = new TextEncoder();
  let timer;
  let unsubscribe = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (line) => controller.enqueue(enc.encode(line));
      unsubscribe = subscribe(send);
      send('data: {"type":"hello"}\n\n');
      send(`data: ${JSON.stringify({ type: 'tick', forms: getForms().map((f) => ({ id: f.id, viewers: f.viewers, going: f.going, hype: f.hype })) })}\n\n`);
      // Live loop while the connection is open: viewer ticks + simulated crowd.
      timer = setInterval(() => {
        try {
          send(`data: ${JSON.stringify({ type: 'tick', forms: getForms().map((f) => ({ id: f.id, viewers: f.viewers, going: f.going, hype: f.hype })) })}\n\n`);
          if (Math.random() < 0.65) {
            const sim = randomSimEvent();
            send(`data: ${JSON.stringify(sim)}\n\n`);
          }
        } catch {
          clearInterval(timer);
        }
      }, 4000);
    },
    cancel() {
      clearInterval(timer);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
