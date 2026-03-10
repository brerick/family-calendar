import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/chores/[id]
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = {}
    const allowedFields = [
      'title', 'description', 'assigned_to', 'due_date', 'completed',
      'recurrence_rule', 'points', 'category', 'estimated_minutes', 'notes'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Handle completion
    if (body.completed === true && updates.completed === true) {
      updates.completed_at = new Date().toISOString()
      updates.completed_by = user.id
    } else if (body.completed === false) {
      updates.completed_at = null
      updates.completed_by = null
    }

    updates.updated_at = new Date().toISOString()

    const { data: chore, error } = await supabase
      .from('chores')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating chore:', error)
      return NextResponse.json({ error: 'Failed to update chore' }, { status: 500 })
    }

    return NextResponse.json({ chore })
    
  } catch (error) {
    console.error('Error in chore update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/chores/[id]
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('chores')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting chore:', error)
      return NextResponse.json({ error: 'Failed to delete chore' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in chore delete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
