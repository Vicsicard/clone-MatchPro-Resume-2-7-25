import { createServerSupabaseClient } from '@/app/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    const { data: existingSubscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error checking subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to check subscription status' },
        { status: 500 }
      );
    }

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
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: session.user.id,
        subscription_type: subscriptionType,
        trial_end: endDate.toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error creating subscription:', insertError);
      return NextResponse.json(
        { error: 'Failed to create subscription', details: insertError.message },
        { status: 500 }
      );
    }

    // Return success with subscription details
    return NextResponse.json({
      success: true,
      subscription: {
        type: subscriptionType,
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error in start-trial:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
