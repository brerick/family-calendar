import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    return NextResponse.json({
      hasUser: !!user,
      userId: user?.id,
      error: error?.message,
      cookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
      supabaseCookies: allCookies.filter(c => c.name.includes('supabase')).map(c => c.name)
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
