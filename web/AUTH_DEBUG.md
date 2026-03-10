/**
 * Debugging authentication issues checklist:
 * 
 * 1. Visit https://www.homeorbit.app/auth/clear to clear all cookies
 * 2. Sign in fresh at https://www.homeorbit.app/auth/login
 * 3. Check browser devtools > Application > Cookies for:
 *    - sb-xqqphuwwumagzsdvdgly-auth-token
 *    - sb-xqqphuwwumagzsdvdgly-auth-token-code-verifier
 * 4. These cookies must have:
 *    - Domain: .homeorbit.app (or homeorbit.app)
 *    - Path: /
 *    - Secure: true
 *    - SameSite: Lax
 * 
 * Common issues and fixes:
 * - If cookies missing: Middleware not setting them properly
 * - If 401 errors persist: Session expired server-side, clear and re-login
 * - If redirect loop: Old invalid session cookies, visit /auth/clear
 * 
 * Server logs to check:
 * - "Auth error in..." messages show what's failing
 * - "session_not_found" means Supabase doesn't recognize the token
 * - Check Supabase dashboard > Authentication > Users to verify user exists
 */

// This file exists for documentation only - delete after debugging is complete
