import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Google Calendar sends notifications to this webhook
export async function POST(request) {
  try {
    const headers = request.headers
    
    // Google sends these headers with push notifications
    const channelId = headers.get('x-goog-channel-id')
    const resourceState = headers.get('x-goog-resource-state')
    const resourceId = headers.get('x-goog-resource-id')
    const channelToken = headers.get('x-goog-channel-token')
    
    // Verify webhook token (you should set this as an env var)
    const expectedToken = process.env.GOOGLE_WEBHOOK_TOKEN || 'your-secret-token'
    if (channelToken !== expectedToken) {
      console.error('Invalid webhook token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Webhook received:', {
      channelId,
      resourceState,
      resourceId,
      state: resourceState
    })

    // Google sends a 'sync' state for initial verification
    if (resourceState === 'sync') {
      return NextResponse.json({ success: true })
    }

    // For 'exists' notifications (actual changes), trigger a sync
    if (resourceState === 'exists' && channelId) {
      const supabase = await createClient()
      
      // Find the calendar associated with this watch
      const { data: watch } = await supabase
        .from('google_calendar_watches')
        .select('calendar_id, calendars(id, household_id)')
        .eq('channel_id', channelId)
        .single()

      if (watch?.calendar_id) {
        console.log('Triggering sync for calendar:', watch.calendar_id)
        
        // Trigger async sync (don't wait for response)
        const syncUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://family-calendar-beryl.vercel.app'}/api/sync/google/${watch.calendar_id}`
        
        fetch(syncUrl, { method: 'POST' }).catch(err => {
          console.error('Sync trigger failed:', err)
        })
      }
    }

    // Always return 200 OK quickly (Google expects fast response)
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Webhook error:', error)
    // Still return 200 to avoid Google retrying
    return NextResponse.json({ success: true })
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}
