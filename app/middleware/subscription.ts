import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function checkSubscription(userId: string): Promise<boolean> {
  try {
    console.log('Checking subscription for user:', userId);
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Subscription check error:', error);
      return false;
    }

    // If no subscription found, return false
    if (!subscription) {
      console.log('No active subscription found');
      return false;
    }

    console.log('Found subscription:', subscription);

    // Check if subscription is still valid
    const now = new Date();
    const trialEnd = new Date(subscription.trial_end);

    if (subscription.subscription_type === 'free' || subscription.subscription_type === 'trial') {
      if (now > trialEnd) {
        console.log('Trial/free period has expired');
        // Update subscription to inactive
        await supabase
          .from('user_subscriptions')
          .update({ is_active: false })
          .eq('id', subscription.id);
        return false;
      }
      return true;
    }

    // For paid subscriptions
    if (subscription.subscription_type === 'paid') {
      return true; // Stripe webhook will handle paid subscription expiration
    }

    return false;
  } catch (error) {
    console.error('Subscription check failed:', error);
    return false;
  }
}
