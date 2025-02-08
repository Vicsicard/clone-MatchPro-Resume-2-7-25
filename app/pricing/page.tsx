'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Missing Stripe publishable key');
}

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function Pricing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFreeTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/start-trial', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start trial');
      }
      
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error starting trial:', error);
      setError(error.message || 'Failed to start trial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaidPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      
      // Redirect to Stripe checkout
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error starting checkout:', error);
      setError(error.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Banner */}
      <div className="bg-[#2563eb] text-white text-[14px] py-2">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex items-center justify-center space-x-1">
            <span>New: AI-powered keyword optimization</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 max-w-[1200px]">
        {/* Header Section */}
        <div className="text-center max-w-[680px] mx-auto pt-20 pb-16">
          <h1 className="text-[52px] font-bold text-gray-900 mb-5 leading-[1.15]">
            Choose Your Plan
          </h1>
          <p className="text-[19px] text-gray-600 mb-8 max-w-[540px] mx-auto leading-relaxed">
            Select the plan that best fits your needs and start optimizing your resume today.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-[1080px] mx-auto pb-24">
          {/* Free Trial Card */}
          <div className="bg-[#f8fafc] rounded-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-[22px] font-semibold text-gray-900 mb-2">24-Hour Trial</h2>
              <div className="text-[40px] font-bold text-gray-900 mb-4">
                Free
              </div>
              <p className="text-[17px] text-gray-600 mb-6">
                Perfect for quick resume optimization
              </p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-[15px] text-gray-600">
                <Check className="w-5 h-5 text-[#2563eb] mr-2" />
                Full access for 24 hours
              </li>
              <li className="flex items-center text-[15px] text-gray-600">
                <Check className="w-5 h-5 text-[#2563eb] mr-2" />
                AI-powered resume analysis
              </li>
              <li className="flex items-center text-[15px] text-gray-600">
                <Check className="w-5 h-5 text-[#2563eb] mr-2" />
                Keyword optimization
              </li>
              <li className="flex items-center text-[15px] text-gray-600">
                <Check className="w-5 h-5 text-[#2563eb] mr-2" />
                ATS compatibility check
              </li>
            </ul>
            <button
              onClick={handleFreeTrial}
              disabled={loading}
              className="w-full bg-white border-2 border-[#2563eb] text-[#2563eb] px-8 py-3.5 rounded-lg text-[15px] font-medium hover:bg-gray-50 transition-colors"
            >
              {loading ? 'Processing...' : 'Start Free Trial'}
            </button>
          </div>

          {/* Premium Card */}
          <div className="bg-[#2563eb] rounded-xl p-8 text-white">
            <div className="text-center mb-6">
              <h2 className="text-[22px] font-semibold mb-2">30-Day Unlimited</h2>
              <div className="text-[40px] font-bold mb-4">
                $19.99
              </div>
              <p className="text-[17px] opacity-90 mb-6">
                Best for comprehensive job search
              </p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-[15px] opacity-90">
                <Check className="w-5 h-5 mr-2" />
                Unlimited access for 30 days
              </li>
              <li className="flex items-center text-[15px] opacity-90">
                <Check className="w-5 h-5 mr-2" />
                AI-powered resume analysis
              </li>
              <li className="flex items-center text-[15px] opacity-90">
                <Check className="w-5 h-5 mr-2" />
                Keyword optimization
              </li>
              <li className="flex items-center text-[15px] opacity-90">
                <Check className="w-5 h-5 mr-2" />
                ATS compatibility check
              </li>
              <li className="flex items-center text-[15px] opacity-90">
                <Check className="w-5 h-5 mr-2" />
                Priority support
              </li>
              <li className="flex items-center text-[15px] opacity-90">
                <Check className="w-5 h-5 mr-2" />
                Unlimited revisions
              </li>
            </ul>
            <button
              onClick={handlePaidPlan}
              disabled={loading}
              className="w-full bg-white text-[#2563eb] px-8 py-3.5 rounded-lg text-[15px] font-medium hover:bg-white/90 transition-colors"
            >
              {loading ? 'Processing...' : 'Get Started'}
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="border-t border-gray-200 py-20">
          <h2 className="text-[40px] font-semibold text-center text-gray-900 mb-16">
            Frequently Asked Questions
          </h2>
          <div className="max-w-[800px] mx-auto space-y-8">
            <div>
              <h3 className="text-[22px] font-semibold text-gray-900 mb-3">
                What happens after my free trial ends?
              </h3>
              <p className="text-[17px] text-gray-600">
                After your 24-hour trial, you can upgrade to our 30-day unlimited plan to continue using all features.
              </p>
            </div>
            <div>
              <h3 className="text-[22px] font-semibold text-gray-900 mb-3">
                Can I cancel my subscription?
              </h3>
              <p className="text-[17px] text-gray-600">
                Yes, you can cancel your subscription at any time. No questions asked.
              </p>
            </div>
            <div>
              <h3 className="text-[22px] font-semibold text-gray-900 mb-3">
                Is my payment secure?
              </h3>
              <p className="text-[17px] text-gray-600">
                Yes, all payments are processed securely through Stripe with 256-bit encryption.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="w-full max-w-md rounded-lg bg-red-600 p-4 text-white">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
