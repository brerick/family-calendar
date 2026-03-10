import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE /api/templates/[id]
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
      .from('event_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in template delete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/templates/[id]
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
      'name', 'title', 'description', 'location', 'duration_minutes',
      'all_day', 'default_attendees', 'color', 'category', 'icon'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data: template, error } = await supabase
      .from('event_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template })
    
  } catch (error) {
    console.error('Error in template update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
