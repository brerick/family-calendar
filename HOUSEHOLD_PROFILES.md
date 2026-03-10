# Household Profiles System

## Overview
The household profiles system allows you to add family members to your household **without requiring them to have email addresses or user accounts**. This is perfect for:
- Young children (1 year old, 3 year old, etc.)
- Family members who don't need app access
- Pets or anyone else you want to track in your household

## Features

### 🎯 What You Can Do

1. **Add Non-Authenticated Members**
   - Add anyone to your household with just a name
   - Set their relationship (child, parent, spouse, other)
   - Optionally add birth date (shows their age automatically)
   - Choose a color for visual identification

2. **Assign Events, Chores, and Meals**
   - Assign chores to kids without accounts
   - Plan meals and specify who's cooking
   - Add anyone as an event attendee
   - Track availability for all household members

3. **Track Progress**
   - Points leaderboard for completed chores
   - Visual availability calendar
   - Meal assignments and planning

## Database Schema

### New Table: `household_profiles`
```sql
- id (uuid) - Unique identifier
- household_id (uuid) - Links to household
- user_id (uuid, nullable) - Links to auth.users if authenticated
- name (text) - Display name (e.g., "Emma" or "Mom")
- birth_date (date, optional) - Auto-calculates age
- relationship (text) - "child", "parent", "spouse", "other"
- avatar_url (text, optional) - Profile picture
- color (text) - For visual identification
- is_auth_user (boolean) - True if has user account
- created_by (uuid) - Who added this profile
```

### Updated Tables
All existing tables now support profiles:
- `event_attendees` → Added `profile_id` column
- `chores` → Added `assigned_to_profile_id` column  
- `meals` → Added `assigned_to_profile_id` column

## Migration Instructions

Run these SQL files **in order** in your Supabase SQL Editor:

### 1. Timezone Profiles (if not done yet)
```bash
supabase/add-user-profiles-timezone.sql
```

### 2. Family Features (if not done yet)
```bash
supabase/add-family-features.sql
```

### 3. Household Profiles ⭐ NEW
```bash
supabase/add-household-profiles.sql
```

This migration:
- ✅ Creates `household_profiles` table
- ✅ Migrates existing household members to profiles
- ✅ Adds profile columns to events/chores/meals
- ✅ Migrates existing data to use profiles
- ✅ Updates availability functions
- ✅ Keeps backward compatibility

## How to Use

### 1. Managing Household Members

Navigate to Family Planner → **Members** tab:

```javascript
// The new tab is automatically added to /family-planner
<HouseholdProfilesManager onUpdate={fetchHouseholdProfiles} />
```

**Add a Child:**
1. Click "Add Member"
2. Enter name (e.g., "Emma")
3. Select relationship: "Child"
4. Add birth date (optional but shows age)
5. Choose a color
6. Click "Add Member"

**Result:**
- Emma appears in all dropdowns (chores, meals, events)
- Can be assigned tasks without needing an account
- Shows in availability calendar
- Appears in points leaderboard

### 2. Assigning Chores to Kids

```javascript
// In ChoreTracker component
<select value={formData.assigned_to_profile_id}>
  <option value="">Select person...</option>
  {householdProfiles.map((profile) => (
    <option key={profile.id} value={profile.id}>
      {profile.name} {/* Shows "Emma" */}
    </option>
  ))}
</select>
```

### 3. Checking Availability

The availability API now returns profiles instead of just authenticated users:

```javascript
// API Response
{
  "members": [
    {
      "profile_id": "uuid...",
      "name": "Emma",
      "is_auth_user": false,
      "events": [...]
    },
    {
      "profile_id": "uuid...",
      "name": "john@example.com",
      "is_auth_user": true,
      "events": [...]
    }
  ]
}
```

### 4. Meal Planning

Assign meals to anyone:
```javascript
// Meal assignment now uses profile_id
{
  "title": "Spaghetti",
  "assigned_to_profile_id": "emma-profile-id",
  // Emma will show as cooking this meal
}
```

## Component Updates

All components now use `householdProfiles`:

### Updated Components:
- ✅ `ChoreTracker.js` - Assign chores to profiles
- ✅ `MealPlanner.js` - Assign cooking to profiles
- ✅ `AvailabilityView.js` - Show availability for all profiles
- ✅ `HouseholdProfilesManager.js` ⭐ NEW - Manage profiles

### Updated API Routes:
- ✅ `/api/household/profiles` - GET/POST profiles
- ✅ `/api/household/profiles/[id]` - PATCH/DELETE profiles
- ✅ `/api/availability` - Returns profiles instead of members
- ✅ `/api/chores` - Supports `assigned_to_profile_id`
- ✅ `/api/meals` - Supports `assigned_to_profile_id`

## Example Use Cases

### Family with Young Kids
```
Household Members:
- John (you@example.com) ← Has account
- Sarah (spouse@example.com) ← Has account  
- Emma (3 years old) ← No account needed
- Liam (1 year old) ← No account needed

You can now:
✓ Assign "Put toys away" chore to Emma
✓ See when Emma has a doctor appointment (blocks availability)
✓ Track Emma's activities (soccer practice, playdates)
✓ Give points for completed tasks
```

### Chore Assignment
```
Chore: "Clean bedroom"
Assigned to: Emma (3 years old)
Points: 10
Due: Tomorrow

Emma can't log in, but you can:
- Mark it complete for her
- See it in her schedule
- Track her total points
```

### Event Planning
```
Event: "Emma's Birthday Party"
Attendees: 
- Emma (as attendee)
- Mom (as organizer)
- Dad (as attendee)

Everyone shows as busy during this time in availability view.
```

## Security

### RLS Policies
- ✅ Only household members can see profiles
- ✅ Only household members can add profiles
- ✅ Cannot delete authenticated user profiles (use invite system)
- ✅ Can delete non-authenticated profiles (kids, etc.)

### Automatic Profile Creation
When someone joins a household:
```sql
-- Trigger automatically creates profile for auth users
CREATE TRIGGER on_household_member_added
  AFTER INSERT ON household_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_household_member();
```

## Testing

1. **Add a child profile:**
   ```
   Navigate to /family-planner → Members
   Click "Add Member"
   Name: "Emma", Relationship: "Child", Birth Date: 2023-01-15
   ```

2. **Assign a chore:**
   ```
   Navigate to Chores tab
   Create chore → Assign to Emma
   See Emma in the chore list
   ```

3. **Check availability:**
   ```
   Navigate to Availability tab
   See Emma listed alongside authenticated members
   ```

4. **Verify leaderboard:**
   ```
   Complete a chore assigned to Emma
   See Emma's points increment
   ```

## Backward Compatibility

The system maintains backward compatibility:
- Old `assigned_to` (user_id) still works
- New `assigned_to_profile_id` is preferred
- Migration auto-populates profile_id from user_id
- Queries check both fields

## Troubleshooting

**Problem:** "Profile not found"
- Run the migration SQL files in order
- Check household_profiles table exists
- Verify RLS policies are created

**Problem:** Child not showing in dropdowns
- Refresh the page to reload profiles
- Check `/api/household/profiles` returns data
- Verify household_id matches

**Problem:** Can't delete a profile
- Authenticated users can't be deleted via profiles API
- Use the household invite system instead
- Only non-authenticated profiles can be deleted

## Next Steps

1. ✅ Run all 3 SQL migrations
2. ✅ Add your kids to the household
3. ✅ Start assigning chores and events
4. ✅ Use the availability checker for scheduling
5. Optional: Add profile pictures (avatar_url)
6. Optional: Create templates for recurring kid activities

---

**Your family calendar now supports everyone in your household, regardless of age or account status! 🎉**
