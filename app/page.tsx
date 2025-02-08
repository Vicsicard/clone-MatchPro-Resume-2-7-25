'use client';

import { useState, useEffect } from 'react';
import ResumeUpload from '@/app/components/ResumeUpload';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
      {/* Top Banner */}
      <div className="bg-[#2563eb] text-white text-[13px] py-2">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex items-center justify-center space-x-1">
            <span>New: AI-powered keyword optimization</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-12">
              <Link href="/" className="text-[15px] font-semibold">
                MatchPro Resume
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link href="/features" className="text-[14px] text-gray-600 hover:text-gray-900">
                  Features
                </Link>
                <Link href="/pricing" className="text-[14px] text-gray-600 hover:text-gray-900">
                  Pricing
                </Link>
                <Link href="/about" className="text-[14px] text-gray-600 hover:text-gray-900">
                  About
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/signin" className="text-[14px] text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
              <Link 
                href="/get-started"
                className="bg-[#2563eb] text-white px-4 py-2 rounded text-[14px] hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-[1200px]">
        {/* Hero Section */}
        <div className="text-center max-w-[720px] mx-auto">
          <h1 className="text-[40px] font-bold text-gray-900 mb-4 leading-tight">
            Land Your Dream Job with
            <br />
            AI-Optimized Resumes
          </h1>
          <p className="text-[18px] text-gray-600 mb-8">
            Upload your resume, provide the job posting, and let our AI technology tailor your qualifications to perfectly match the position requirements.
          </p>
          <div className="flex items-center justify-center space-x-4 mb-8">
            <Link 
              href="/get-started"
              className="bg-[#2563eb] text-white px-6 py-3 rounded-lg text-[15px] font-medium hover:bg-blue-700"
            >
              Get Started Free
            </Link>
            <Link 
              href="/pricing"
              className="bg-gray-100 text-gray-900 px-6 py-3 rounded-lg text-[15px] font-medium hover:bg-gray-200"
            >
              View Pricing
            </Link>
          </div>
          <div className="flex items-center justify-center space-x-6">
            <div className="flex items-center text-[13px] text-gray-600">
              <span>ATS-Friendly</span>
            </div>
            <div className="flex items-center text-[13px] text-gray-600">
              <span>GDPR-Compliant</span>
            </div>
            <div className="flex items-center text-[13px] text-gray-600">
              <span>256-bit Encrypted</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-[22px] font-semibold text-center text-gray-900 mb-10">
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
              <div key={index} className="bg-[#f8fafc] rounded-lg p-5 text-center">
                <div className="bg-[#2563eb] w-8 h-8 rounded mx-auto mb-3 flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm"></div>
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-[#2563eb] rounded-lg p-6">
          <div className="text-center mb-6">
            <h2 className="text-[22px] font-semibold text-white mb-2">
              Ready to boost your career?
            </h2>
            <p className="text-[15px] text-white/90">
              Start optimizing your resume today.
            </p>
          </div>
          <ResumeUpload />
        </div>
      </main>
    </div>
  );
}
