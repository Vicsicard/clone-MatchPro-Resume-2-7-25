import { createServerSupabaseClient } from '@/app/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Calculate trial end time (24 hours from now)
    const trialEnd = new Date();
    trialEnd.setHours(trialEnd.getHours() + 24);

    // Update user's metadata with trial information
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: session.user.id,
        subscription_type: 'trial',
        trial_end: trialEnd.toISOString(),
        is_active: true
      });

    if (error) {
      console.error('Error setting up trial:', error);
      return NextResponse.json(
        { error: 'Failed to start trial' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in start-trial:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
