import { NextResponse } from 'next/server';
import { addComment, findForm, getComments, publish } from '@/lib/server-store';

export async function GET(req) {
  const formId = new URL(req.url).searchParams.get('formId');
  if (!formId) return NextResponse.json({ error: 'formId required' }, { status: 400 });
  const res = NextResponse.json({ comments: getComments(formId) });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function POST(req) {
  const { formId, body, parentId, user } = await req.json().catch(() => ({}));
  const f = findForm(formId);
  if (!f) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!body || !body.trim()) return NextResponse.json({ error: 'Write a comment first' }, { status: 400 });
  if (!user?.handle) return NextResponse.json({ error: 'Log in to comment' }, { status: 401 });
  const comment = addComment({ formId, body: body.trim(), parentId, user });
  const isHost = f.host && user.handle.toLowerCase() === f.host.handle.toLowerCase();
  publish({ type: 'comment', formId, comment, title: f.title, hostHandle: f.host?.handle, isHost });
  return NextResponse.json({ comment }, { status: 201 });
}
