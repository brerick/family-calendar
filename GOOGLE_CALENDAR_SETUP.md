# Google Calendar Integration Setup

This guide walks you through setting up Google Calendar OAuth for your Family Calendar app.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it: `Family Calendar` (or your choice)
4. Click **Create**

## Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for **Google Calendar API**
3. Click on it and click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace)
3. Click **Create**

**Fill in the form:**
- **App name**: Family Calendar
- **User support email**: Your email
- **Developer contact email**: Your email
- Leave other fields as default
- Click **Save and Continue**

**Scopes** (Step 2):
- Click **Add or Remove Scopes**
- Search for `calendar.readonly`
- Check: `https://www.googleapis.com/auth/calendar.readonly`
- Click **Update**
- Click **Save and Continue**

**Test Users** (Step 3):
- Click **Add Users**
- Add your Google email (and any other testers)
- Click **Save and Continue**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Name it: `Family Calendar Web App`

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/auth/google/callback
```

5. Click **Create**
6. **Copy the Client ID and Client Secret** (you'll need these)

## Step 5: Add Credentials to .env.local

Add these to your `web/.env.local` file:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Step 6: When Deploying to Vercel

When you deploy to production:

1. Go back to **Google Cloud Console** → **Credentials**
2. Edit your OAuth client
3. Add your production URLs:

**Authorized JavaScript origins:**
```
https://your-app.vercel.app
```

**Authorized redirect URIs:**
```
https://your-app.vercel.app/api/auth/google/callback
```

4. Update your Vercel environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback`

## Testing

Once configured, you can:
1. Click "New Calendar" in your app
2. Select "Google Calendar"
3. Click "Connect Google Calendar"
4. Authorize access to your calendars
5. Select which calendar to sync
6. Events will sync automatically!

## Troubleshooting

**"Access blocked: This app's request is invalid"**
- Make sure your email is added to Test Users (OAuth consent screen)
- Check that redirect URI matches exactly (no trailing slash)

**"redirect_uri_mismatch"**
- Verify redirect URI in Google Console matches your .env.local file exactly
- Check for http vs https
- Check for trailing slashes

**"invalid_client"**
- Double-check your Client ID and Secret in .env.local
- Make sure there are no extra spaces or quotes

## Security Notes

- Never commit `.env.local` to Git (it's in .gitignore)
- OAuth tokens are encrypted in the database
- Only `calendar.readonly` scope is used (read-only access)
- Users can revoke access anytime at https://myaccount.google.com/permissions
