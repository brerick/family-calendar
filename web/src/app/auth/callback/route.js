import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/household/setup'

  if (code) {
    const cookieStore = await cookies()
    
    // Create response object first
    const response = NextResponse.redirect(new URL(next, request.url))
    
    // Create Supabase client that will set cookies on the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // Set cookies on the response object
                response.cookies.set(name, value, {
                  ...options,
                  sameSite: 'lax',
                  secure: process.env.NODE_ENV === 'production',
                  path: '/',
                })
              })
            } catch (error) {
              console.error('Error setting auth cookies:', error)
            }
          },
        },
      }
    )
    
    // Exchange code for session - this will trigger setAll above
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/auth/login?error=callback_failed', request.url))
    }
    
    return response
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
