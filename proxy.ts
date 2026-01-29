import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'

export async function proxy(request: NextRequest) {
  const publicPaths = ['/auth/login', '/' , '/auth/change-password' , '/auth/welcome' , '/auth/reset-password'];
  const isPublic = publicPaths.includes(request.nextUrl.pathname);

  // Check for session
  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await verifyToken(sessionCookie) : null;

  if (!session && !isPublic) {
    if (request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.includes('.')) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (session && request.nextUrl.pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|/auth/change-password/*|/auth/welcome/*|favicon.ico).*)'],
}
