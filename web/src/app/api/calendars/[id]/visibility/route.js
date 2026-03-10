import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in visibility toggle:', authError)
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: authError.message 
      }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { visible } = await request.json()

    // Validate input
    if (typeof visible !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid visibility value' },
        { status: 400 }
      )
    }

    // Update calendar visibility
    const { data, error } = await supabase
      .from('calendars')
      .update({ visible })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating calendar visibility:', error)
      return NextResponse.json(
        { error: 'Failed to update calendar visibility', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in visibility toggle:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
