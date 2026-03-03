import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()
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
        { error: 'Failed to update calendar visibility' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in visibility toggle:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
