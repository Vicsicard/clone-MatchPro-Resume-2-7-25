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

  // For normal sign-ins, redirect to pricing
  try {
    const supabase = createServerSupabaseClient();
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Always redirect to pricing after successful authentication
    return NextResponse.redirect(new URL('/pricing', request.url));
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }
}
