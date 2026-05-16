import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/signup', '/shared', '/api/auth', '/api/shared', '/_next', '/favicon'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Root redirect is handled by page.tsx
  if (pathname === '/') return NextResponse.next();

  // Check auth token
  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete('auth_token');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
