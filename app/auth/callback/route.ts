import { createServerSupabaseClient } from '@/app/supabase/server';
import { NextResponse } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  if (token_hash && type) {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (error) {
      console.error('Error verifying email:', error);
      return NextResponse.redirect(
        new URL('/auth/sign-in?error=Could not verify email', request.url)
      );
    }

    // After email verification, redirect to sign in
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  // For normal sign-ins, check subscription status
  try {
    const supabase = createServerSupabaseClient();
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Check if user has an active subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    // If no active subscription, redirect to pricing
    if (!subscription) {
      return NextResponse.redirect(new URL('/pricing', request.url));
    }

    // If they have an active subscription, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }
}
