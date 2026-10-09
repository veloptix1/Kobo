import { NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';

export async function POST(req) {
  const { username, password } = await req.json();
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Identifiants invalides' }, { status: 401 });
  }
  const token = await createToken({ username, role: 'admin' });
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
