import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Force clear all authentication cookies and redirect to login
export async function GET() {
  const cookieStore = await cookies()
  
  // Get all cookies
  const allCookies = cookieStore.getAll()
  
  // Create response
  const response = NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  
  // Delete all Supabase-related cookies
  allCookies.forEach(cookie => {
    if (cookie.name.includes('supabase') || cookie.name.includes('sb-') || cookie.name.includes('auth')) {
      response.cookies.delete({
        name: cookie.name,
        path: '/',
        domain: undefined
      })
    }
  })
  
  return response
}
