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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // This will refresh the session if expired - validating the auth token
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Don't redirect on API routes or RSC routes
  if (path.startsWith('/api') || path.includes('_rsc')) {
    return supabaseResponse
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/calendars', '/events', '/household', '/profile', '/family-planner']
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  
  // Auth routes
  const authRoutes = ['/auth/login', '/auth/signup']
  const isAuthRoute = authRoutes.some(route => path.startsWith(route))

  // If accessing protected route without auth, redirect to login
  // Exception: /household/setup can be accessed with invite parameter
  if (isProtectedRoute && !user) {
    const isSetupWithInvite = path === '/household/setup' && request.nextUrl.searchParams.has('invite')
    if (!isSetupWithInvite) {
      const redirectUrl = new URL('/auth/login', request.url)
      // Preserve the original destination
      if (path !== '/household/setup') {
        redirectUrl.searchParams.set('next', path)
      }
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If accessing auth routes while logged in, redirect to dashboard
  if (isAuthRoute && user) {
    // Check if there's an invite parameter - if so, redirect to setup
    const inviteToken = request.nextUrl.searchParams.get('invite')
    if (inviteToken) {
      return NextResponse.redirect(new URL(`/household/setup?invite=${inviteToken}`, request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}
