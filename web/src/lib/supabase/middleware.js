import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Use getClaims() to validate the JWT cryptographically (offline, via JWKS cache)
  // instead of getUser() which queries Supabase's sessions table on every request.
  // This avoids "session_not_found" 403 errors caused by race conditions between
  // the Vercel Edge middleware and the Node.js server component both hitting the
  // auth DB simultaneously with the same token.
  // getClaims() internally calls getSession() which still handles token refresh
  // when the access token is near expiry and updates cookies via setAll().
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims ? { id: claimsData.claims.sub } : null

  const path = request.nextUrl.pathname

  // Log auth state for debugging
  console.log('[Middleware]', {
    path,
    hasUser: !!user,
    cookieCount: request.cookies.getAll().length,
  })

  // Skip auth checks for API routes, auth routes, and RSC routes
  if (path.startsWith('/api') || path.startsWith('/auth') || path.includes('_rsc')) {
    return supabaseResponse
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/calendars', '/events', '/household', '/profile', '/family-planner']
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

  // If accessing protected route without auth, redirect to login
  if (isProtectedRoute && !user) {
    const isSetupWithInvite = path === '/household/setup' && request.nextUrl.searchParams.has('invite')
    if (!isSetupWithInvite) {
      console.log('[Middleware] Redirecting to login - no user found')
      // Create redirect and copy any session-clearing cookies from supabaseResponse.
      // Without this, the browser keeps stale auth cookies and the login page
      // bounces the user straight back to the protected route.
      const redirectResponse = NextResponse.redirect(new URL('/auth/login', request.url))
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirectResponse.cookies.set(cookie)
      }
      return redirectResponse
    }
  }

  return supabaseResponse
}
