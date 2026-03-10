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

  // Refresh session if needed
  const { data: { user }, error } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Log auth state for debugging
  console.log('[Middleware]', {
    path,
    hasUser: !!user,
    error: error?.message,
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
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return supabaseResponse
}
