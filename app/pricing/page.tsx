'use client';

import { useState } from 'react';
import { createClient } from '@/app/supabase/client';
import { useRouter } from 'next/navigation';

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFreeTrial = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in first');
      }

      // Create a free trial subscription
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert([
          {
            user_id: session.user.id,
            subscription_type: 'trial',
            is_active: true,
            trial_start: new Date().toISOString(),
            trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          },
        ]);

      if (subscriptionError) {
        throw subscriptionError;
      }

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Free trial error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaidSubscription = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in first');
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (!url) {
        throw new Error('No checkout URL returned');
      }

      window.location.href = url;
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Start optimizing your resume today
          </p>
        </div>

        {error && (
          <div className="mt-8 max-w-md mx-auto bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto">
          {/* Free Trial Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900">Free Trial</h3>
              <p className="mt-4 text-gray-500">Perfect for trying out our services</p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900">$0</span>
                <span className="text-base font-medium text-gray-500">/7 days</span>
              </p>
              <button
                onClick={handleFreeTrial}
                disabled={loading}
                className="mt-8 block w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Start Free Trial'}
              </button>
            </div>
          </div>

          {/* Paid Subscription Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900">Full Access</h3>
              <p className="mt-4 text-gray-500">For those serious about their career</p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900">$19.99</span>
                <span className="text-base font-medium text-gray-500">/month</span>
              </p>
              <button
                onClick={handlePaidSubscription}
                disabled={loading}
                className="mt-8 block w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Subscribe Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
