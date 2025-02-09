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
      <div className="bg-[#2563eb] text-white text-[14px] py-2">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex items-center justify-center space-x-1">
            <span>New: AI-powered keyword optimization</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-12">
              <Link href="/" className="text-[20px] font-semibold">
                MatchPro Resume
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link href="/features" className="text-[15px] text-gray-600 hover:text-gray-900">
                  Features
                </Link>
                <Link href="/pricing" className="text-[15px] text-gray-600 hover:text-gray-900">
                  Pricing
                </Link>
                <Link href="/blog" className="text-[15px] text-gray-600 hover:text-gray-900">
                  Blog
                </Link>
                <Link href="/about" className="text-[15px] text-gray-600 hover:text-gray-900">
                  About
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/auth/sign-in" className="text-[15px] text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
              <Link 
                href="/auth/sign-up"
                className="bg-[#2563eb] text-white px-5 py-2.5 rounded text-[15px] font-medium hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-[1200px]">
        {/* Hero Section */}
        <div className="text-center max-w-[680px] mx-auto pt-20 pb-24">
          <h1 className="text-[52px] font-bold text-gray-900 mb-5 leading-[1.15]">
            Land Your Dream Job with
            <br />
            AI-Optimized Resumes
          </h1>
          <p className="text-[19px] text-gray-600 mb-8 max-w-[540px] mx-auto leading-relaxed">
            Upload your resume, provide the job posting, and let our AI technology tailor your qualifications to perfectly match the position requirements.
          </p>
          <div className="flex items-center justify-center space-x-4 mb-10">
            <Link 
              href="/auth/sign-up"
              className="bg-[#2563eb] text-white px-7 py-3 rounded-lg text-[15px] font-medium hover:bg-blue-700"
            >
              Get Started Free
            </Link>
            <Link 
              href="/pricing"
              className="bg-gray-100 text-gray-900 px-7 py-3 rounded-lg text-[15px] font-medium hover:bg-gray-200"
            >
              View Pricing
            </Link>
          </div>
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center text-[14px] text-gray-500">
              <span>ATS-Friendly</span>
            </div>
            <div className="flex items-center text-[14px] text-gray-500">
              <span>GDPR-Compliant</span>
            </div>
            <div className="flex items-center text-[14px] text-gray-500">
              <span>256-bit Encrypted</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20">
          <h2 className="text-[40px] font-semibold text-center text-gray-900 mb-16">
            Why Choose Resume Optimizer?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-[1080px] mx-auto">
            {[
              {
                title: 'AI-Powered Analysis',
                description: 'Our advanced AI analyzes your resume against job requirements for perfect matching'
              },
              {
                title: 'ATS Optimization',
                description: 'Ensure your resume passes through Applicant Tracking Systems with ease'
              },
              {
                title: 'Keyword Enhancement',
                description: 'Automatically identify and add missing keywords from job descriptions'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-[#f8fafc] rounded-xl p-8 text-center">
                <div className="bg-[#2563eb] w-14 h-14 rounded-lg mx-auto mb-6 flex items-center justify-center">
                  <div className="w-7 h-7 bg-white rounded-sm"></div>
                </div>
                <h3 className="text-[22px] font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-[17px] leading-relaxed text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="bg-[#2563eb] rounded-xl p-16 text-center text-white mb-20">
          <div className="max-w-[640px] mx-auto">
            <h2 className="text-[40px] font-semibold mb-4">
              Ready to optimize your resume?
            </h2>
            <p className="text-[19px] mb-8 opacity-90 leading-relaxed">
              Join thousands of job seekers who have successfully landed their dream jobs using our platform
            </p>
            <button 
              onClick={() => window.location.href = '/auth/sign-up'} 
              className="bg-white text-[#2563eb] px-8 py-3.5 rounded-lg text-[15px] font-medium hover:bg-white/90 transition-colors"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
