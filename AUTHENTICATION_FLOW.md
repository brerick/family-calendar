# Authentication Flow Documentation

## Overview
This document describes the authentication and household access flow for the Family Calendar application.

## User Scenarios

### 1. New User with Invite Link
**Flow:**
1. User clicks invite link → `/household/setup?invite=XXX`
2. **Middleware** allows access (protected route with invite parameter)
3. **Client-side check** detects no authentication → redirects to `/auth/login?invite=XXX`
4. **Login page** shows:
   - "Sign in to join household" message
   - Prominent link to "create a new account"
5. User can:
   - **Login** (if they have an account) → After auth, redirects to `/household/setup?invite=XXX`
   - **Click signup link** → Goes to `/auth/signup?invite=XXX`
6. After authentication:
   - Auth callback redirects to `/household/setup?invite=XXX`
   - Page auto-attempts to join household
   - Success → Redirects to `/dashboard`

### 2. New User without Invite
**Flow:**
1. User tries to access `/household/setup` directly
2. **Middleware** detects protected route without auth → redirects to `/auth/login`
3. User must login or signup
4. After auth → redirects to `/household/setup`
5. User can:
   - Create a new household
   - Manually enter an invite code to join

### 3. Existing User with Invite Link
**Flow:**
1. Logged-in user clicks invite link → `/household/setup?invite=XXX`
2. **Middleware** allows access (user is authenticated)
3. **Client-side** detects user + invite → auto-attempts to join
4. Success → Redirects to `/dashboard`
5. If auto-join fails → Shows error message with manual retry button

### 4. User Accessing Auth Pages While Logged In
**Flow:**
1. Logged-in user tries to access `/auth/login` or `/auth/signup`
2. **Middleware** detects auth route with authenticated user:
   - If `?invite=XXX` parameter exists → redirects to `/household/setup?invite=XXX`
   - Otherwise → redirects to `/dashboard`

### 5. User Accessing Protected Routes
**Flow:**
1. User tries to access `/dashboard`, `/calendars/*`, `/events/*`, or `/household/*`
2. **Middleware** checks authentication:
   - Not authenticated → redirects to `/auth/login?next={original_path}`
   - Authenticated → allows access
3. **Dashboard** performs additional check:
   - No household membership → redirects to `/household/setup`

## Security Measures

### Server-Side (Middleware)
- Protects routes: `/dashboard`, `/calendars`, `/events`, `/household`
- Exception: `/household/setup?invite=XXX` accessible without auth
- Redirects authenticated users away from auth pages
- Preserves destination with `next` parameter

### Client-Side
- Double-checks authentication in household setup
- Redirects unauthenticated users to login (even with invite)
- Auto-attempts household join when both user + invite present

### Input Validation
- All email inputs are trimmed to prevent whitespace errors
- Invite tokens are trimmed before validation
- Email format validation performed

## Email Whitespace Fix
Fixed issue where users couldn't sign up due to whitespace in email addresses:
- Signup page trims email before calling `signUp()`
- Login page trims email before calling `signInWithPassword()`
- Email invite endpoints trim email before sending
- Prevents "email_address_invalid" errors from Supabase

## Routes Summary

| Route | Auth Required | Special Handling |
|-------|--------------|------------------|
| `/` | No | Landing page |
| `/auth/login` | No | Redirects to dashboard if logged in |
| `/auth/signup` | No | Redirects to dashboard if logged in |
| `/dashboard` | Yes | Redirects to setup if no household |
| `/household/setup` | Yes* | Allows access with `?invite` param |
| `/household/settings` | Yes | Must be household member |
| `/calendars/*` | Yes | Must be household member |
| `/events/*` | Yes | Must be household member |

*\* Middleware allows unauthenticated access only with invite parameter, but client-side immediately redirects to login*
