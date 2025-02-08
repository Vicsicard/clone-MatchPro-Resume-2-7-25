'use client';

import { useState, useEffect } from 'react';
import ResumeUpload from '@/app/components/ResumeUpload';

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Land Your Dream Job with
            <br />
            <span className="text-blue-600">AI-Optimized Resumes</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Get instant feedback on your resume's match with job descriptions using our advanced AI technology.
          </p>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-center text-gray-900 mb-12">
            Why Choose Resume Optimizer?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Resume Optimization',
                description: 'Our AI analyzes your resume against job descriptions to ensure the best match.'
              },
              {
                title: 'Real-Time Review',
                description: 'Get instant feedback and suggestions to improve your resume.'
              },
              {
                title: 'Increased Success Rate',
                description: 'Boost your chances of landing interviews with optimized content.'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-blue-50 rounded-lg p-6 text-center">
                <div className="bg-blue-600 w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-blue-50 rounded-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Ready to boost your career?
            </h2>
            <p className="text-gray-600">
              Start optimizing your resume today.
            </p>
          </div>
          <ResumeUpload />
        </div>
      </main>
    </div>
  );
}
