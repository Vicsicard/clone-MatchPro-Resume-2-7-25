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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-8 max-w-[1200px]">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-[32px] font-bold text-gray-900 mb-4 leading-tight">
            Land Your Dream Job with
            <br />
            <span className="text-[#2563eb]">AI-Optimized Resumes</span>
          </h1>
          <p className="text-base text-gray-600 max-w-xl mx-auto mb-4">
            Get instant feedback on your resume's match with job descriptions using our advanced AI technology.
          </p>
          <div className="flex justify-center gap-3 mb-16">
            <button className="bg-[#2563eb] text-white px-4 py-2 rounded-md text-sm">
              Upload Resume
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm">
              Upload Job Description
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm">
              Get Results
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-8">
            Why Choose Resume Optimizer?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
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
              <div key={index} className="bg-[#f8fafc] rounded-lg p-6 text-center">
                <div className="bg-[#2563eb] w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <div className="w-5 h-5 bg-white rounded-sm"></div>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-[#2563eb] rounded-lg p-6 text-center text-white">
          <h2 className="text-xl font-semibold mb-2">
            Ready to boost your career?
          </h2>
          <p className="text-sm mb-6 opacity-90">
            Start optimizing your resume today.
          </p>
          <ResumeUpload />
        </div>
      </main>
    </div>
  );
}
