import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

async function main() {
  console.log('🔍 Starting Stripe webhook tests...\n');

  // Test 1: Verify API Keys
  try {
    console.log('Test 1: Verifying Stripe API Keys...');
    const balance = await stripe.balance.retrieve();
    console.log('✅ API keys are valid\n');
  } catch (error: any) {
    console.error('❌ API key verification failed:', error.message, '\n');
    process.exit(1);
  }

  // Test 2: Verify Price ID
  try {
    console.log('Test 2: Verifying Price ID...');
    const priceId = process.env.STRIPE_PRICE_ID;
    const price = await stripe.prices.retrieve(priceId!);
    console.log('✅ Price exists:', {
      id: price.id,
      amount: price.unit_amount,
      currency: price.currency,
      type: price.type,
      recurring: price.recurring,
    }, '\n');
  } catch (error: any) {
    console.error('❌ Price verification failed:', error.message, '\n');
    process.exit(1);
  }

  // Test 3: Verify Webhook Secret
  try {
    console.log('Test 3: Verifying Webhook Secret format...');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }
    if (!webhookSecret.startsWith('whsec_')) {
      throw new Error('Invalid webhook secret format');
    }
    console.log('✅ Webhook secret format is valid\n');
  } catch (error: any) {
    console.error('❌ Webhook secret verification failed:', error.message, '\n');
    process.exit(1);
  }

  // Test 4: List Active Webhooks
  try {
    console.log('Test 4: Listing active webhooks...');
    const webhooks = await stripe.webhookEndpoints.list();
    console.log('✅ Found', webhooks.data.length, 'webhook endpoints:');
    webhooks.data.forEach(webhook => {
      console.log({
        id: webhook.id,
        url: webhook.url,
        status: webhook.status,
        enabledEvents: webhook.enabled_events,
      });
    });
    console.log();
  } catch (error: any) {
    console.error('❌ Webhook listing failed:', error.message, '\n');
    process.exit(1);
  }

  // Test 5: Create Test Customer
  try {
    console.log('Test 5: Creating test customer...');
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      source: 'tok_visa', // Test token
    });
    console.log('✅ Test customer created:', customer.id);

    // Clean up test customer
    await stripe.customers.del(customer.id);
    console.log('✅ Test customer cleaned up\n');
  } catch (error: any) {
    console.error('❌ Customer creation test failed:', error.message, '\n');
    process.exit(1);
  }

  console.log('🎉 All tests completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Try creating a subscription with test card: 4242 4242 4242 4242');
  console.log('2. Check Stripe Dashboard → Webhooks → Recent deliveries');
  console.log('3. Check Supabase Table Editor → user_subscriptions');
}

main().catch(console.error);
