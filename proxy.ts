import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'

export async function proxy(request: NextRequest) {
  const publicPaths = ['/auth/login', '/' , '/auth/change-password' , '/auth/welcome' , '/auth/reset-password' , '/welcome'];
  const isPublic = publicPaths.includes(request.nextUrl.pathname);

  // Check for session
  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await verifyToken(sessionCookie) : null;

  if (!session && !isPublic) {
    if (request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.includes('.')) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);

    return NextResponse.redirect(loginUrl);
    }

  if (session && request.nextUrl.pathname === '/auth/login') {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|/auth/change-password/*|/auth/welcome/*|favicon.ico).*)'],
}
