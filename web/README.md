# Family Calendar Aggregator - Setup Guide

## Current Progress

✅ **Phase 1 - Core System (In Progress)**
- ✅ Next.js app scaffolded with Tailwind + ShadCN
- ✅ Supabase schema created (see `/supabase/schema.sql`)
- ✅ Authentication pages (signup/login)
- ✅ Household setup flow (create/join)
- ✅ Basic dashboard shell
- ⏳ Calendar UI (next step)

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supabase Account** - Create one at https://supabase.com

## Setup Instructions

### 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Create a new project
3. Wait for the project to finish setting up

### 2. Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `/supabase/schema.sql`
3. Paste and run the SQL
4. Verify all tables were created in **Table Editor**

### 3. Configure Environment Variables

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL**, **anon/public key**, and **service_role key**
3. Edit `web/.env.local` and replace the placeholders:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> ⚠️ **Important**: The service role key should be kept secret and never exposed to the client. It's only used in server-side API routes for system operations like syncing calendars.

### 4. Run the Application

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Testing Phase 1

### Manual QA Checklist

- [ ] Visit http://localhost:3000 - should see landing page
- [ ] Click "Get Started" → creates account
- [ ] After signup, redirected to household setup
- [ ] Create household with a name → redirected to dashboard
- [ ] Log out, log back in → still see dashboard
- [ ] Create a second account in incognito window
- [ ] Generate invite link (household settings - coming soon)
- [ ] Use invite link to join household

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/          # Login page
│   │   │   ├── signup/         # Signup page
│   │   │   └── signout/        # Signout route
│   │   ├── household/
│   │   │   └── setup/          # Create/join household
│   │   ├── dashboard/          # Main calendar view
│   │   ├── api/
│   │   │   └── household/      # API routes for household
│   │   └── page.js             # Landing page
│   ├── lib/
│   │   └── supabase/           # Supabase client utilities
│   └── middleware.js           # Session refresh
└── .env.local                  # Environment variables
```

## Next Steps

### Immediate (Phase 1 Completion)
- [ ] Add invite link generation UI in household settings
- [ ] Build calendar shell with FullCalendar
- [ ] Manual event CRUD
- [ ] Calendar color picker

### Phase 2 - iCal Support
- [ ] Add iCal URL form
- [ ] Build ICS parser
- [ ] Sync endpoint
- [ ] Scheduled cron job

### Phase 3 - Google Integration
- [ ] Google OAuth setup
- [ ] Token storage
- [ ] Incremental sync

## Troubleshooting

### Auth not working
- Check that `.env.local` has correct Supabase credentials
- Verify Supabase project is active
- Check browser console for errors

### Database errors
- Ensure all SQL from `schema.sql` ran successfully
- Check RLS policies are enabled
- Verify user is authenticated

### Dev server warnings
- The "multiple lockfiles" warning can be ignored for now
- To fix: add `turbopack: { root: './web' }` to `next.config.js`

## Support

See [PRD.md](../PRD.md) for full product requirements and [sync-engine-spec.md](../sync-engine-spec.md) for sync engine details.
