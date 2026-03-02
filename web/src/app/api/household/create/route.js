import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Creating household for user:', user.id)

    const { name } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Household name is required' }, { status: 400 })
    }

    // Create household
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({
        name: name.trim(),
        owner_user_id: user.id,
      })
      .select()
      .single()

    if (householdError) {
      console.error('Error creating household:', {
        code: householdError.code,
        message: householdError.message,
        details: householdError.details,
        hint: householdError.hint,
        userId: user.id
      })
      return NextResponse.json({ 
        error: 'Failed to create household',
        details: householdError.message,
        code: householdError.code
      }, { status: 500 })
    }

    console.log('Household created successfully:', household.id)

    // Add user as owner in household_members
    const { data: member, error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'owner',
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error adding household member:', {
        code: memberError.code,
        message: memberError.message,
        details: memberError.details,
        hint: memberError.hint,
        householdId: household.id,
        userId: user.id
      })
      return NextResponse.json({ 
        error: 'Failed to add household member',
        details: memberError.message,
        code: memberError.code
      }, { status: 500 })
    }

    console.log('Member added successfully:', member.id)

    return NextResponse.json({ household })
  } catch (error) {
    console.error('Error in household create:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
