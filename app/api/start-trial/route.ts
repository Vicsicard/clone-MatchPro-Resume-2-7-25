import { createServerSupabaseClient } from '@/app/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // Get subscription type from request body
    const body = await request.json();
    const subscriptionType = body.subscriptionType || 'free';

    // Calculate end date based on subscription type
    const endDate = new Date();
    if (subscriptionType === 'trial' || subscriptionType === 'free') {
      endDate.setDate(endDate.getDate() + 30); // 30 days trial/free period
    }

    // Insert new subscription
    const { error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: session.user.id,
        subscription_type: subscriptionType,
        trial_end: endDate.toISOString(),
        is_active: true
      });

    if (error) {
      console.error('Error creating subscription:', error);
      return NextResponse.json(
        { error: 'Failed to create subscription' },
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
