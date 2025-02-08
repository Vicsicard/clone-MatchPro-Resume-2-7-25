import { createServerSupabaseClient } from '@/app/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

// Price for the 30-day subscription
const PRICE_ID = 'price_1QkpKCGEHfPiJwM4Wti4uP4V';

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.error('No session found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error('NEXT_PUBLIC_SITE_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('Creating checkout session for user:', session.user.id);
    
    try {
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

      console.log('Checkout session created:', checkoutSession.id);
      return NextResponse.json({ sessionId: checkoutSession.id });
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError.message);
      return NextResponse.json(
        { error: stripeError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Server error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
