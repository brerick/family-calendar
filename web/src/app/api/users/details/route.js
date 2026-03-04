import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create admin client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { user_ids } = body;

    if (!user_ids || !Array.isArray(user_ids)) {
      return NextResponse.json(
        { error: 'user_ids array is required' },
        { status: 400 }
      );
    }

    // Fetch user data for each user_id
    const userDetails = await Promise.all(
      user_ids.map(async (userId) => {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (error || !data.user) {
          return {
            user_id: userId,
            email: 'Unknown',
            display_name: 'Unknown User',
          };
        }

        return {
          user_id: userId,
          email: data.user.email || 'No email',
          display_name: data.user.user_metadata?.display_name || 
                        data.user.user_metadata?.full_name || 
                        data.user.email?.split('@')[0] || 
                        'User',
        };
      })
    );

    return NextResponse.json({ users: userDetails });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}
