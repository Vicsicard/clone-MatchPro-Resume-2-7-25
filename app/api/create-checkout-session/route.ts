import { createServerSupabaseClient } from '@/app/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';

// Validate required environment variables
const requiredEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const PRICE_ID = 'price_1QkpKCGEHfPiJwM4Wti4uP4V';

export async function POST() {
  try {
    console.log('Starting checkout session creation...');
    
    const supabase = createServerSupabaseClient();
    
    // Get the session and log the attempt
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Supabase session error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication error', details: sessionError.message },
        { status: 401 }
      );
    }

    if (!session) {
      console.error('No session found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', session.user.id);

    try {
      console.log('Creating Stripe checkout session...');
      
      // Create Stripe checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
        customer_email: session.user.email,
        metadata: {
          userId: session.user.id,
        },
      });

      console.log('Checkout session created successfully:', checkoutSession.id);
      return NextResponse.json({ 
        sessionId: checkoutSession.id,
        url: checkoutSession.url 
      });
    } catch (stripeError: any) {
      console.error('Stripe error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
      });
      
      return NextResponse.json(
        { 
          error: 'Stripe error',
          details: stripeError.message,
          code: stripeError.code 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Server error:', {
      message: error.message,
      stack: error.stack,
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
