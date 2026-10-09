import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from './lib/auth';

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    pathname === '/admin' ||
    pathname === '/admin/' ||
    pathname.startsWith('/admin/api/login') ||
    pathname.startsWith('/admin/api/logout')
  ) {
    return NextResponse.next();
  }

  const token = getTokenFromCookies(req.headers.get('cookie'));
  if (!token) return NextResponse.redirect(new URL('/admin', req.url));

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.redirect(new URL('/admin', req.url));

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
