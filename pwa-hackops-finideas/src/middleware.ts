import { NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/', '/dashboard', '/recorder']

// Routes that are only for guests (redirect to home if logged in)
const guestOnlyRoutes = ['/auth', '/forgot-password', '/reset-password']

// API routes that require authentication (checked separately)
const protectedApiPrefixes = ['/api/dashboard', '/api/leads', '/api/templates', '/api/test-email', '/api/transcribe', '/api/sync-lead']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for Payload's JWT cookie
  const token = request.cookies.get('payload-token')?.value
  const isAuthenticated = !!token

  // Skip Payload admin routes - Payload handles its own auth
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/users')) {
    return NextResponse.next()
  }

  // Protect client-side routes
  const isProtected = pathname === '/'
    ? true
    : protectedRoutes.some((route) => route !== '/' && pathname.startsWith(route))
  if (isProtected) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/auth', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect authenticated users away from guest-only routes
  if (guestOnlyRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protect API routes
  if (protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  /*
   * Match all routes except:
   * - _next (Next.js internals)
   * - static files (images, fonts, etc.)
   * - manifest.json, sw.js (PWA assets)
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js).*)',
  ],
}
