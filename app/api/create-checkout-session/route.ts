import { createServerSupabaseClient } from '@/app/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe only when needed to avoid build issues
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-01-27.acacia',
  });
};

// This is your price ID for the $19.99 subscription
const PRICE_ID = 'price_1OocqGGEHfPiJwM4oGEGxwJa';

export async function POST() {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    console.log('Site URL:', siteUrl); // Debug log
    
    if (!siteUrl) {
      console.error('NEXT_PUBLIC_SITE_URL is not set');
      throw new Error('NEXT_PUBLIC_SITE_URL is required');
    }

    console.log('Starting checkout session creation...');
    
    const supabase = createServerSupabaseClient();
    
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
      const stripe = getStripe();
      console.log('Creating Stripe checkout session...');
      
      // First verify that the price exists
      try {
        const price = await stripe.prices.retrieve(PRICE_ID);
        console.log('Price verified:', price.id);
      } catch (priceError: any) {
        console.error('Price not found:', PRICE_ID);
        return NextResponse.json(
          { 
            error: 'Invalid price configuration',
            details: 'The specified price does not exist'
          },
          { status: 400 }
        );
      }
      
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${siteUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing`,
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
