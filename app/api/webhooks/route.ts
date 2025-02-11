import { createServerSupabaseClient } from '@/app/supabase/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'edge';

// Initialize Stripe only if environment variables are present
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  // Return early if Stripe is not configured
  if (!stripe || !webhookSecret) {
    console.warn('Stripe is not configured. Skipping webhook processing.');
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 501 }
    );
  }

  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (!userId) {
        throw new Error('No userId in session metadata');
      }

      const supabase = createServerSupabaseClient();

      // Calculate subscription end date (30 days from now)
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

      // Update user's subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          subscription_type: 'paid',
          subscription_end: subscriptionEnd.toISOString(),
          is_active: true
        });

      if (error) {
        console.error('Error updating subscription:', error);
        return NextResponse.json(
          { error: 'Error updating subscription' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
