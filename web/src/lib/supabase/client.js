import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return getCookie(name)
        },
        set(name, value, options) {
          setCookie(name, value, options)
        },
        remove(name, options) {
          setCookie(name, '', { ...options, maxAge: 0 })
        },
      },
      cookieOptions: {
        sameSite: 'lax',
        secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
        path: '/',
      },
    }
  )
}

// Helper to get cookie
function getCookie(name) {
  if (typeof document === 'undefined') return undefined
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

// Helper to set cookie with proper options
function setCookie(name, value, options = {}) {
  if (typeof document === 'undefined') return
  
  const cookieOptions = {
    sameSite: 'lax',
    secure: window.location.protocol === 'https:',
    path: '/',
    ...options,
  }
  
  let cookie = `${name}=${value}`
  
  if (cookieOptions.maxAge) {
    cookie += `; max-age=${cookieOptions.maxAge}`
  }
  if (cookieOptions.path) {
    cookie += `; path=${cookieOptions.path}`
  }
  if (cookieOptions.domain) {
    cookie += `; domain=${cookieOptions.domain}`
  }
  if (cookieOptions.sameSite) {
    cookie += `; samesite=${cookieOptions.sameSite}`
  }
  if (cookieOptions.secure) {
    cookie += `; secure`
  }
  
  document.cookie = cookie
}
