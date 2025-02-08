import { createServerSupabaseClient } from '@/app/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

// Initialize Stripe only when needed to avoid build issues
const PRICE_IDS = {
  test: 'price_1Qkq56GEHfPiJwM4oJBkcV5X',  // Test mode price
  live: 'price_1QkpKCGEHfPiJwM4Wti4uP4V'   // Live mode price
};

const getStripeAndMode = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }
  
  // Detect if we're using test or live mode based on the API key
  const isTestMode = secretKey.startsWith('sk_test_');
  console.log('Stripe mode:', isTestMode ? 'test' : 'live');
  
  return {
    stripe: new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' }),
    isTestMode
  };
};

// Get the site URL from environment or request
const getSiteUrl = (request: Request): string => {
  // First try environment variable
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Fallback to request headers
  const headersList = headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  return `${protocol}://${host}`;
};

export async function POST(request: Request) {
  console.log('Starting checkout session creation...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Available env vars:', {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'set' : 'not set',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'not set'
  });
  
  try {
    const siteUrl = getSiteUrl(request);
    console.log('Using site URL:', siteUrl);

    const supabase = createServerSupabaseClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Supabase session error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication error', details: sessionError.message },
        { status: 401 }
      );
    }

    if (!session?.user) {
      console.error('No authenticated user found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', session.user.id);

    try {
      // Get Stripe instance and determine mode
      const { stripe, isTestMode } = getStripeAndMode();
      const priceId = isTestMode ? PRICE_IDS.test : PRICE_IDS.live;
      console.log('Using price ID:', priceId, 'in', isTestMode ? 'test' : 'live', 'mode');
      
      // First verify that the price exists
      try {
        console.log('Verifying price ID:', priceId);
        const price = await stripe.prices.retrieve(priceId);
        console.log('Price verified:', {
          id: price.id,
          active: price.active,
          currency: price.currency,
          type: price.type,
        });
      } catch (priceError: any) {
        console.error('Price verification failed:', priceError);
        return NextResponse.json(
          { error: 'Invalid price', details: priceError.message },
          { status: 400 }
        );
      }
      
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
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

      console.log('Checkout session created:', {
        id: checkoutSession.id,
        url: checkoutSession.url,
        status: checkoutSession.status,
      });

      return NextResponse.json({ url: checkoutSession.url });
    } catch (stripeError: any) {
      console.error('Stripe error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        requestId: stripeError.requestId,
      });
      
      return NextResponse.json(
        { error: stripeError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
