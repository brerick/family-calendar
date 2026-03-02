import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify calendar belongs to user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    // Check if calendar exists and belongs to household
    const { data: calendar } = await supabase
      .from('calendars')
      .select('household_id')
      .eq('id', id)
      .single()

    if (!calendar || calendar.household_id !== membership.household_id) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    // Delete calendar (cascade will delete events)
    const { error } = await supabase
      .from('calendars')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting calendar:', error)
      return NextResponse.json({ error: 'Failed to delete calendar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in calendar DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
