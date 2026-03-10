import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    const supabaseCookies = allCookies.filter(c => 
      c.name.includes('supabase') || c.name.includes('sb-')
    )

    return NextResponse.json({
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      error: error ? {
        message: error.message,
        status: error.status
      } : null,
      cookies: {
        total: allCookies.length,
        supabase: supabaseCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          valueLength: c.value?.length || 0
        }))
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
