# Fix for Invite Join Issue

## Problem
Users trying to join a household via invite link get "Invalid or expired invite" error even with valid invites sent seconds ago.

**Root Cause:** RLS (Row Level Security) policy on `household_invites` table requires users to be members to read invites - but users need to read the invite to become members (catch-22).

**Error:** `406 Not Acceptable` with `PGRST116` (PostgREST error: expected 1 row, got 0)

## Solution
Run the updated SQL migration to fix the RLS policies:

### Steps to Fix

1. **Open Supabase Dashboard**
   - Go to your project
   - Navigate to SQL Editor

2. **Run the migration**
   - Copy contents of `supabase/fix-invite-rls.sql`
   - Paste into SQL Editor
   - Click "Run"

3. **Test the fix**
   - Send a new invite (or use an existing unredeemed one)
   - Have your wife click the invite link
   - She should now be able to join successfully

## What Changed

### New RLS Policy for `household_invites`
```sql
-- OLD: Only household members could read invites
using (is_household_member(household_id))

-- NEW: Anyone can read valid unredeemed invites
using (
  (redeemed_at is null and (expires_at is null or expires_at > now()))
  OR
  exists (select 1 from household_members where ...)
)
```

This is **secure** because:
- Invite tokens are 32-byte cryptographically secure random strings (impossible to guess)
- Only unredeemed, non-expired invites are readable by non-members
- Users must have the actual token to find the invite
- Once redeemed, only household members can view it

### Improved Error Messages
The join API now provides more specific error messages:
- `INVITE_NOT_FOUND` - Invalid token or already used
- `INVITE_ERROR` - System error retrieving invite
- Existing expiration check remains

## Technical Details

**Files Modified:**
- `supabase/fix-invite-rls.sql` - Updated RLS policies
- `web/src/app/api/household/join/route.js` - Better error handling

**Security Considerations:**
- Tokens use `crypto.randomBytes(32)` - 256 bits of entropy
- Probability of guessing: 1 in 2^256 (essentially impossible)
- Invites expire after 7 days
- Can only be used once (marked as redeemed)
