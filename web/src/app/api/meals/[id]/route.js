import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/meals/[id]
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedFields = ['date', 'meal_type', 'title', 'description', 'assigned_to_profile_id']
    const updates = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    const { data: meal, error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating meal:', error)
      return NextResponse.json({ error: 'Failed to update meal' }, { status: 500 })
    }

    return NextResponse.json({ meal })
  } catch (error) {
    console.error('Error in meal update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/meals/[id]
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting meal:', error)
      return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in meal delete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
