import { createServerSupabaseClient } from '@/app/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function checkSubscription(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return false;
    }

    // Check user's subscription status
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (error || !subscription) {
      return false;
    }

    const now = new Date();

    if (subscription.subscription_type === 'trial') {
      const trialEnd = new Date(subscription.trial_end);
      if (now > trialEnd) {
        // Trial has expired
        await supabase
          .from('user_subscriptions')
          .update({ is_active: false })
          .eq('id', subscription.id);
        return false;
      }
    } else if (subscription.subscription_type === 'paid') {
      const subscriptionEnd = new Date(subscription.subscription_end);
      if (now > subscriptionEnd) {
        // Paid subscription has expired
        await supabase
          .from('user_subscriptions')
          .update({ is_active: false })
          .eq('id', subscription.id);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}
