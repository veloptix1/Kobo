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
EOE
cat > admin/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: #0A1F44;
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
}

input, select, textarea {
  @apply bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-orange-400;
}

.card {
  @apply bg-white/5 border border-white/10 rounded-2xl p-6;
}

.btn-primary {
  @apply bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-3 rounded-xl transition;
}

.btn-secondary {
  @apply bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg transition;
}

.btn-danger {
  @apply bg-red-500/80 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition;
}
