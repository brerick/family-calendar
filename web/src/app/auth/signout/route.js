import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function POST() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  
  // Sign out from Supabase
  await supabase.auth.signOut()
  
  // Clear all Supabase-related cookies
  const allCookies = cookieStore.getAll()
  allCookies.forEach(cookie => {
    if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
      cookieStore.delete(cookie.name)
    }
  })
  
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

// Also support GET for simple link-based signout
export async function GET() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  
  // Sign out from Supabase
  await supabase.auth.signOut()
  
  // Clear all Supabase-related cookies
  const allCookies = cookieStore.getAll()
  allCookies.forEach(cookie => {
    if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
      cookieStore.delete(cookie.name)
    }
  })
  
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}
