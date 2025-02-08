import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function listStripePrices() {
  console.log('Listing Stripe prices...');

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-01-27.acacia',
  });

  try {
    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
      expand: ['data.product'],
    });

    console.log('Found', prices.data.length, 'active prices:');
    prices.data.forEach(price => {
      console.log({
        id: price.id,
        nickname: price.nickname,
        currency: price.currency,
        unit_amount: price.unit_amount,
        type: price.type,
        recurring: price.recurring,
        product: typeof price.product === 'object' ? {
          id: price.product.id,
          name: price.product.name,
          active: price.product.active,
        } : price.product,
      });
    });
  } catch (error: any) {
    console.error('Error listing prices:', {
      message: error.message,
      type: error.type,
      code: error.code,
    });
    throw error;
  }
}

listStripePrices().catch(console.error);
