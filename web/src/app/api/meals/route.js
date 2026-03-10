import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/meals?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    let query = supabase
      .from('meals')
      .select('*')
      .eq('household_id', membership.household_id)
      .order('date')
      .order('meal_type')

    if (startDate) {
      query = query.gte('date', startDate)
    }
    
    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data: meals, error } = await query

    if (error) {
      console.error('Error fetching meals:', error)
      return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 })
    }

    return NextResponse.json({ meals })
    
  } catch (error) {
    console.error('Error in meals endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/meals
export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    const {
      date,
      meal_type,
      title,
      description,
      recipe_url,
      cooking_time_minutes,
      ingredients,
      assigned_to,
      assigned_to_profile_id,
      notes
    } = body

    if (!date || !meal_type || !title) {
      return NextResponse.json({ error: 'Date, meal_type, and title are required' }, { status: 400 })
    }

    const { data: meal, error } = await supabase
      .from('meals')
      .insert({
        household_id: membership.household_id,
        date,
        meal_type,
        title,
        description,
        recipe_url,
        cooking_time_minutes,
        ingredients,
        assigned_to: assigned_to || null,
        assigned_to_profile_id: assigned_to_profile_id || null,
        notes,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating meal:', error)
      return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 })
    }

    // If ingredients provided, optionally add to shopping list
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      const shoppingItems = ingredients.map(ingredient => ({
        household_id: membership.household_id,
        name: ingredient.name,
        quantity: ingredient.quantity ? `${ingredient.quantity} ${ingredient.unit || ''}`.trim() : null,
        category: ingredient.category || 'other',
        meal_id: meal.id,
        added_by: user.id
      }))

      await supabase
        .from('shopping_list_items')
        .insert(shoppingItems)
    }

    return NextResponse.json({ meal }, { status: 201 })
    
  } catch (error) {
    console.error('Error in meals endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
