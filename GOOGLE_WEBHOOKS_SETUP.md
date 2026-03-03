# Google Calendar Real-Time Webhooks Setup

This guide explains how to configure Google Calendar push notifications (webhooks) for real-time calendar updates.

## Overview

Instead of polling Google Calendar every hour, webhooks allow Google to notify your app immediately when calendar events change. This provides:

- **Real-time updates**: Changes appear within seconds instead of waiting for the next sync
- **Reduced API usage**: Google notifies you instead of polling
- **Better user experience**: Calendar stays up-to-date automatically

## Prerequisites

1. **Domain verification required**: Google Calendar push notifications only work with verified domains
2. **HTTPS required**: Webhooks must use HTTPS (localhost won't work)
3. **Google Cloud Project**: Already configured for OAuth

## Setup Steps

### 1. Run Database Migration

Run the webhook watches migration in your Supabase SQL editor:

```bash
# File: supabase/add-google-webhook-watches.sql
```

This creates the `google_calendar_watches` table to track active webhook subscriptions.

### 2. Add Environment Variable to Vercel

Add a webhook verification token to your Vercel environment variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   GOOGLE_WEBHOOK_TOKEN=your-random-secret-token-here
   ```
   (Generate a secure random string, like: `openssl rand -hex 32`)

3. Also ensure you have:
   ```
   NEXT_PUBLIC_SITE_URL=https://family-calendar-beryl.vercel.app
   ```

4. Redeploy your application

### 3. Verify Domain in Google Cloud Console

Google requires domain ownership verification for webhook endpoints:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Domain verification**
4. Add your domain: `family-calendar-beryl.vercel.app`
5. Follow Google's verification process (usually involves adding a TXT record or HTML file)
6. Wait for verification to complete (can take a few minutes to hours)

### 4. Enable Google Calendar Push Notifications

In your Google Cloud Console project:

1. Make sure **Google Calendar API** is enabled (already done during OAuth setup)
2. The push notification endpoint is automatically available at:
   ```
   https://family-calendar-beryl.vercel.app/api/webhooks/google
   ```

### 5. Test Webhooks

After deploying the updated code:

1. **Connect a Google Calendar** in your app (add a new Google Calendar)
2. The webhook will be automatically registered when you save the calendar
3. **Make a change** in your Google Calendar (add/edit/delete an event)
4. **Check your Family Calendar app** - the change should appear within 10-30 seconds
5. **View logs** in Vercel Dashboard → Deployments → Function Logs to see webhook activity

### 6. Setup Cron Job for Watch Renewal

Google Calendar webhook watches expire after ~7 days. Set up automatic renewal:

#### Option A: Using cron-job.org (Recommended - Free)

1. Go to https://cron-job.org and sign up
2. Create a new cron job:
   - **Title**: `Family Calendar - Sync & Renew Watches`
   - **URL**: `https://family-calendar-beryl.vercel.app/api/sync/all`
   - **Schedule**: Every 12 hours (or daily)
   - **Enabled**: ✅
3. The `/api/sync/all` endpoint now:
   - Syncs all iCal feeds
   - Renews expiring Google Calendar watches
   - Triggers syncs for Google calendars (as backup)

#### Option B: Manual Renewal (Not Recommended)

If you don't set up cron, you can manually trigger watch renewal by visiting:
```
https://family-calendar-beryl.vercel.app/api/webhooks/google/renew
```

## How It Works

### Initial Connection Flow

1. User connects Google Calendar via OAuth
2. App creates calendar record in database
3. **App registers webhook watch with Google** 🆕
   - Google provides a `channel_id` and `resource_id`
   - Watch expires in 7 days
4. App stores watch info in `google_calendar_watches` table
5. App performs initial sync to fetch existing events

### Real-Time Update Flow

1. User changes event in Google Calendar
2. Google sends POST request to `/api/webhooks/google` within seconds
3. Webhook endpoint:
   - Verifies token
   - Looks up calendar from `channel_id`
   - Triggers sync for that specific calendar
4. Updated events appear in your Family Calendar app

### Watch Renewal Flow

1. Cron job calls `/api/sync/all` every 12 hours
2. Endpoint checks for watches expiring within 24 hours
3. For each expiring watch:
   - Stops old watch
   - Registers new watch with 7-day expiration
   - Updates database with new watch info

## Troubleshooting

### Webhooks Not Working

1. **Check Vercel Function Logs**:
   - Vercel Dashboard → Deployments → Click deployment → Function Logs
   - Look for "Webhook received" messages

2. **Verify Environment Variables**:
   - `GOOGLE_WEBHOOK_TOKEN` is set
   - `NEXT_PUBLIC_SITE_URL` is correct

3. **Check Domain Verification**:
   - Google Cloud Console → Domain verification
   - Ensure your Vercel domain is verified

4. **Test Webhook Endpoint**:
   ```bash
   curl -X POST https://family-calendar-beryl.vercel.app/api/webhooks/google \
     -H "X-Goog-Channel-Token: your-token" \
     -H "X-Goog-Resource-State: sync"
   ```
   Should return: `{"success":true}`

### Watches Expiring

If watches expire and aren't renewed:

1. Check cron job is running (cron-job.org dashboard)
2. Manually trigger renewal:
   ```
   POST https://family-calendar-beryl.vercel.app/api/webhooks/google/renew
   ```
3. Check Vercel logs for renewal errors

### Events Not Updating

If webhook is received but events don't update:

1. Check that the calendar sync endpoint works:
   ```
   POST https://family-calendar-beryl.vercel.app/api/sync/google/{calendar-id}
   ```
2. Check Supabase for the calendar's `last_synced_at` timestamp
3. Verify OAuth tokens haven't expired (should auto-refresh)

## Webhook vs Polling

| Feature | Webhooks (Real-Time) | Polling (Cron) |
|---------|---------------------|----------------|
| Update Speed | 10-30 seconds | 1-24 hours (depends on cron frequency) |
| API Usage | Low | Higher (check every interval) |
| Setup Complexity | Medium (domain verification) | Simple |
| Requires | HTTPS, verified domain | Just a URL |
| Best For | Active calendars with frequent changes | Occasional updates, iCal feeds |

## What About iCal Feeds?

iCal feeds (.ics files) don't support webhooks - they're just static files. The cron job will continue to poll iCal feeds periodically (recommended: every 4-12 hours).

Your setup now uses:
- **Webhooks** for Google Calendar (real-time)
- **Polling** for iCal feeds (periodic via cron)

## Files Changed

- `supabase/add-google-webhook-watches.sql` - Database table for watch tracking
- `web/src/app/api/webhooks/google/route.js` - Webhook endpoint
- `web/src/app/api/webhooks/google/renew/route.js` - Watch renewal endpoint
- `web/src/app/api/calendars/google/save/route.js` - Register watches on connection
- `web/src/app/api/sync/all/route.js` - Trigger watch renewal during cron
