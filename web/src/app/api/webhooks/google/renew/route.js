import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Renew Google Calendar webhook watches that are expiring soon
export async function POST() {
  try {
    // Use service client — called from sync/all internally with no user cookies.
    const supabase = createServiceClient()

    // Find watches expiring in the next 24 hours
    const expirationThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    const { data: expiringWatches, error: watchError } = await supabase
      .from('google_calendar_watches')
      .select('*, calendars(id, external_id, refresh_token)')
      .lt('expiration', expirationThreshold.toISOString())

    if (watchError) {
      console.error('Error fetching expiring watches:', watchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!expiringWatches || expiringWatches.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No watches need renewal',
        renewed: 0 
      })
    }

    console.log(`Renewing ${expiringWatches.length} expiring watches`)

    let renewed = 0
    let failed = 0

    for (const watch of expiringWatches) {
      try {
        const calendar = watch.calendars
        if (!calendar || !calendar.refresh_token) {
          console.error('Missing calendar or refresh token for watch:', watch.id)
          failed++
          continue
        }

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        )

        oauth2Client.setCredentials({
          refresh_token: calendar.refresh_token,
        })

        const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client })

        // Stop old watch first
        try {
          await calendarApi.channels.stop({
            requestBody: {
              id: watch.channel_id,
              resourceId: watch.resource_id,
            },
          })
        } catch (stopError) {
          console.warn('Could not stop old watch (may already be expired):', stopError.message)
        }

        // Register new watch
        const newChannelId = `${calendar.id}-${Date.now()}`
        const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/google`
        const webhookToken = process.env.GOOGLE_WEBHOOK_TOKEN || 'your-secret-token'

        const watchResponse = await calendarApi.events.watch({
          calendarId: calendar.external_id,
          requestBody: {
            id: newChannelId,
            type: 'web_hook',
            address: webhookUrl,
            token: webhookToken,
            expiration: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
          },
        })

        // Update watch in database
        if (watchResponse.data) {
          await supabase
            .from('google_calendar_watches')
            .update({
              channel_id: newChannelId,
              resource_id: watchResponse.data.resourceId,
              expiration: new Date(parseInt(watchResponse.data.expiration)),
              updated_at: new Date().toISOString(),
            })
            .eq('id', watch.id)

          console.log('Renewed watch:', newChannelId)
          renewed++
        }
      } catch (error) {
        console.error('Error renewing watch:', watch.id, error)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      renewed,
      failed,
      total: expiringWatches.length,
    })

  } catch (error) {
    console.error('Error in watch renewal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
