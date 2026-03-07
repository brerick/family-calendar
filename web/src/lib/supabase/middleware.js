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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refreshing the auth token
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/calendars', '/events', '/household']
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
