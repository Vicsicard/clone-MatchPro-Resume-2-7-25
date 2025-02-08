'use client';

import { useState } from 'react';
import { createClient } from '@/app/supabase/client';
import { useRouter } from 'next/navigation';

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFreeTrial = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);

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
    setDebugInfo(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in first');
      }

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Checkout response:', data);

      if (!response.ok) {
        setDebugInfo(data);
        throw new Error(data.error || data.details || 'Failed to create checkout session');
      }

      if (!data.url) {
        console.error('No checkout URL in response:', data);
        throw new Error('No checkout URL returned');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Subscription error:', error);
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
          <div className="mt-8 max-w-md mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                    {debugInfo && (
                      <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                        {JSON.stringify(debugInfo, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
